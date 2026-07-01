/**
 * ═══════════════════════════════════════════════════════════════════════
 *  SCRIPT TEST — CORE 1: LIVE MEETING (HAPPY PATH)
 * ═══════════════════════════════════════════════════════════════════════
 *
 * TÌNH HUỐNG THỰC TẾ MÔ PHỎNG:
 *   Một nhân viên vào Live Workspace, bật micro, nói chuyện trong cuộc
 *   họp, nhìn thấy transcript xuất hiện realtime, rồi bấm "Kết thúc".
 *   Backend nhận audio → VAD cắt utterance → ffmpeg convert 48kHz→16kHz
 *   → gọi song song STT + Embedding → diarize → emit transcript_update
 *   → khi kết thúc: lưu DB, upload MinIO, đánh dấu COMPLETED.
 *
 * FILE NÀY THAY THẾ BROWSER MIC bằng cách:
 *   1. Đọc file WAV gốc (48kHz, bất kỳ stereo/mono) từ máy bạn
 *   2. Dùng ffmpeg convert sang raw PCM 48kHz mono (giống browser gửi)
 *   3. Gửi theo từng chunk 100ms qua WebSocket — đúng như browser sẽ làm
 *
 * CÁCH CHẠY:
 *   # Bước 1: Lấy token và tạo meeting qua Postman trước
 *   #   POST /api/auth/login         → lấy accessToken
 *   #   POST /api/meetings/live      → lấy id
 *
 *   # Bước 2: Chạy script
 *   TOKEN=<accessToken> MEETING_ID=<id> node test/ws-test-client.js
 *
 *   # Tuỳ chọn: chỉ định file WAV khác
 *   TOKEN=... MEETING_ID=... WAV_FILE="C:\path\to\file.wav" node test/ws-test-client.js
 *
 * SAU KHI CHẠY XONG — kiểm tra:
 *   pgAdmin   → meetings:        status = COMPLETED, audio_url khác null
 *   pgAdmin   → transcript_blocks: có N dòng, text/speaker/times hợp lệ
 *   MinIO     → mp2-bucket/audio/: có file <meetingId>.pcm
 *   Redis     → transcript_buffer:<id> KHÔNG tồn tại (đã cleanup)
 *   Redis     → live_sessions:count = 0
 * ═══════════════════════════════════════════════════════════════════════
 */

'use strict';
const { io } = require('socket.io-client');
const { spawnSync } = require('child_process');
const fs = require('fs');

// ── Cấu hình ──────────────────────────────────────────────────────────────
const SERVER_URL = 'http://localhost:3001';
const ACCESS_TOKEN = process.env.TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmYzhmNDljZS1jYzZkLTRkMmItOThiYi1iZjFhZWRiNzc4NjkiLCJyb2xlIjoiQURNSU4iLCJkZXBhcnRtZW50SWQiOiIzZjYzNzljMi04YjY4LTQ4M2EtYjA4NC01M2MyZWUzMzZhZmMiLCJpYXQiOjE3ODI3NDE5MjUsImV4cCI6MTc4Mjc0MjgyNX0.ZvkQ3jxcVQ1qNNWtrZVBS_wO56gf89tSjoWgTnnp5Qk';
const MEETING_ID = process.env.MEETING_ID || 'c701374f-f1dd-43e8-b5e0-1936917bfb0e';
const WAV_FILE = process.env.WAV_FILE || 'C:\\VDT\\Project\\mockup audio\\Khắp xung quanh.wav';
const FFMPEG_PATH = process.env.FFMPEG_PATH || 'C:\\ffmpeg\\bin\\ffmpeg.exe';

// ── Validate ───────────────────────────────────────────────────────────────
if (!ACCESS_TOKEN || !MEETING_ID) {
  console.error('❌ Thiếu TOKEN hoặc MEETING_ID');
  console.error('   Dùng: TOKEN=xxx MEETING_ID=yyy node test/ws-test-client.js');
  process.exit(1);
}
if (!fs.existsSync(WAV_FILE)) {
  console.error(`❌ Không tìm thấy WAV_FILE: ${WAV_FILE}`);
  process.exit(1);
}

// ── Bước chuẩn bị: convert WAV → 48kHz mono PCM (giống browser gửi) ───────
function extractPcm48kMono(filePath) {
  console.log(`🎵 Đang extract PCM 48kHz mono từ: ${filePath}`);
  const result = spawnSync(FFMPEG_PATH, [
    '-i', filePath,
    '-f', 's16le',   // output format: raw signed 16-bit little-endian PCM
    '-ar', '48000',  // resample về 48kHz (đúng với AUDIO_BROWSER_SAMPLE_RATE)
    '-ac', '1',      // convert về mono (browser ghi âm thường là mono)
    'pipe:1',        // output ra stdout
  ], { maxBuffer: 200 * 1024 * 1024 }); // 200MB buffer

  if (result.error || result.status !== 0) {
    console.error('❌ ffmpeg thất bại:', result.stderr?.toString());
    process.exit(1);
  }
  const pcm = result.stdout;
  const durationSec = (pcm.length / (48000 * 2)).toFixed(1);
  console.log(`✅ PCM ready: ${pcm.length} bytes (~${durationSec}s audio at 48kHz mono)\n`);
  return pcm;
}

// ── Gửi PCM theo chunk 100ms (mô phỏng browser stream) ────────────────────
async function streamAudio(socket, meetingId, pcm) {
  // 100ms × 48000Hz × 2 bytes = 9600 bytes/chunk
  const CHUNK_BYTES = 48000 * 0.1 * 2;
  const totalChunks = Math.ceil(pcm.length / CHUNK_BYTES);
  console.log(`📤 Stream ${totalChunks} chunks × 100ms...\n`);

  for (let i = 0; i < totalChunks; i++) {
    const chunk = pcm.slice(i * CHUNK_BYTES, (i + 1) * CHUNK_BYTES);
    socket.emit('audio_chunk', {
      meetingId,
      audio: Array.from(chunk), // Buffer → number[] để gửi qua JSON
    });
    // Delay 100ms giữa các chunk — giữ đúng tốc độ realtime
    await new Promise(r => setTimeout(r, 100));
    process.stdout.write(`\r   Chunk ${i + 1}/${totalChunks}`);
  }
  console.log('\n✅ Đã stream xong toàn bộ audio');
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('══════════════════════════════════════════════════════');
  console.log('  CORE 1 — Live Meeting Happy Path Test');
  console.log('══════════════════════════════════════════════════════');
  console.log(`  Server:     ${SERVER_URL}/live`);
  console.log(`  Meeting:    ${MEETING_ID}`);
  console.log('══════════════════════════════════════════════════════\n');

  const pcm = extractPcm48kMono(WAV_FILE);

  const socket = io(`${SERVER_URL}/live`, {
    transports: ['websocket'],
    reconnection: false,
  });

  socket.on('connect', () => {
    console.log(`🔗 WebSocket connected (id=${socket.id})`);
    console.log('\n[STEP 1] Gửi open_session...');
    socket.emit('open_session', { meetingId: MEETING_ID, token: ACCESS_TOKEN });
  });

  socket.on('session_ready', async () => {
    console.log('✅ session_ready — phiên đã khởi tạo\n');
    console.log('[STEP 2] Bắt đầu stream audio...');
    await streamAudio(socket, MEETING_ID, pcm);

    // Đợi batch cuối VAD xử lý xong (worst case: 600ms silence + 2s AI)
    console.log('\n⏳ Chờ ~3s cho batch AI cuối hoàn tất...');
    await new Promise(r => setTimeout(r, 3000));

    console.log('\n[STEP 3] Gửi end_session...');
    socket.emit('end_session', { meetingId: MEETING_ID });
  });

  socket.on('transcript_update', (block) => {
    console.log(
      `\n📝 [seq=${block.sequenceNumber}] ${block.speakerLabel} ` +
      `(${block.startTime?.toFixed(2)}s–${block.endTime?.toFixed(2)}s):\n` +
      `   "${block.text}"`
    );
  });

  socket.on('session_ended', () => {
    console.log('\n🏁 session_ended — meeting đã COMPLETED');
    console.log('\n──── Verify sau khi test ────────────────────────────');
    console.log('pgAdmin: meetings       → status=COMPLETED, audio_url khác null');
    console.log('pgAdmin: transcript_blocks → N dòng với text/speaker/times');
    console.log('MinIO:   mp2-bucket/audio/ → file <meetingId>.pcm');
    console.log('Redis:   transcript_buffer:<id> → KHÔNG tồn tại');
    console.log('Redis:   live_sessions:count   → 0');
    console.log('─────────────────────────────────────────────────────\n');
    socket.disconnect();
    process.exit(0);
  });

  socket.on('error', (err) => {
    console.error('\n❌ Server error:', err.message || err);
    socket.disconnect();
    process.exit(1);
  });

  socket.on('connect_error', (err) => {
    console.error('\n❌ Cannot connect:', err.message);
    process.exit(1);
  });

  socket.on('disconnect', (reason) => {
    if (reason !== 'io client disconnect') {
      console.log(`\n🔌 Disconnected unexpectedly: ${reason}`);
    }
  });
}

main().catch(err => { console.error(err); process.exit(1); });
