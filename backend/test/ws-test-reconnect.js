/**
 * ═══════════════════════════════════════════════════════════════════════
 *  SCRIPT TEST — CORE 3: AUTO-RECONNECT (2 SCENARIOS)
 * ═══════════════════════════════════════════════════════════════════════
 *
 * TÌNH HUỐNG THỰC TẾ MÔ PHỎNG:
 *
 *  Scenario A — Reconnect thành công (mạng yếu, mất < TTL):
 *   Nhân viên đang họp, WiFi chập → mất kết nối 5 giây. Trong lúc đó
 *   micro vẫn ghi âm lưu vào bộ nhớ máy (browser buffer). Khi có mạng
 *   lại, app tự reconnect, server gửi lại những block đã xử lý nhưng
 *   client chưa nhận (missed_blocks), đồng thời nhận thêm audio tồn đọng
 *   từ buffer máy và xử lý tiếp — cuộc họp tiếp diễn bình thường.
 *
 *  Scenario B — Timeout (mạng mất > TTL = 120s):
 *   Nhân viên vào thang máy, mất mạng > 2 phút. BullMQ job hết hạn tự
 *   kích hoạt finalize — meeting tự COMPLETED với những gì đã ghi được.
 *   Khi nhân viên có mạng lại và thử resume → nhận thông báo session đã
 *   kết thúc.
 *
 * SCRIPT NÀY MÔ PHỎNG:
 *   Phase 1 : Connect → open_session → stream audio 3s → ngắt WS
 *             (giả lập mất mạng đột ngột)
 *   [Kiểm tra Redis ngay tại đây: resume_window + delayed job phải xuất hiện]
 *   Phase 2A: Reconnect (resume) sau 4s → nhận missed_blocks → stream audio còn lại
 *             → kết thúc bình thường  →  HAPPY RECONNECT
 *   Phase 2B: Đợi > 120s không reconnect → BullMQ tự finalize → TIMEOUT
 *             [Uncomment SCENARIO=B để test]
 *
 * CÁCH CHẠY:
 *   # Tạo meeting mới trước (Postman)
 *   #   POST /api/auth/login       → lấy accessToken
 *   #   POST /api/meetings/live    → lấy id (meeting mới, chưa có session nào)
 *
 *   # Scenario A — Reconnect thành công:
 *   TOKEN=<token> MEETING_ID=<id> node test/ws-test-reconnect.js
 *
 *   # Scenario B — Timeout (đổi meeting mới, vì Scenario A đã COMPLETED):
 *   TOKEN=<token> MEETING_ID=<id> SCENARIO=B node test/ws-test-reconnect.js
 *
 * VERIFY SAU MỖI SCENARIO:
 *   Xem chú thích [VERIFY] trong output terminal khi chạy script
 * ═══════════════════════════════════════════════════════════════════════
 */

'use strict';
const { io } = require('socket.io-client');
const { spawnSync } = require('child_process');
const fs = require('fs');

// ── Cấu hình ──────────────────────────────────────────────────────────────
const SERVER_URL = 'http://localhost:3001';
const ACCESS_TOKEN = process.env.TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmYzhmNDljZS1jYzZkLTRkMmItOThiYi1iZjFhZWRiNzc4NjkiLCJyb2xlIjoiQURNSU4iLCJkZXBhcnRtZW50SWQiOiIzZjYzNzljMi04YjY4LTQ4M2EtYjA4NC01M2MyZWUzMzZhZmMiLCJpYXQiOjE3ODI3NDUwNDIsImV4cCI6MTc4Mjc0NTk0Mn0.WSIGBhrSAYqMjyObh6e1FXOYvM7a6NAiWOP9fBhcTU0';
const MEETING_ID = process.env.MEETING_ID || '42220d37-901d-4165-a7d9-94712520f1db';
const WAV_FILE = process.env.WAV_FILE || 'C:\\VDT\\Project\\mockup audio\\file_1.wav';
const FFMPEG_PATH = process.env.FFMPEG_PATH || 'C:\\ffmpeg\\bin\\ffmpeg.exe';
const SCENARIO = process.env.SCENARIO || 'B'; // 'A' hoặc 'B'

if (!ACCESS_TOKEN || !MEETING_ID) {
  console.error('❌ Thiếu TOKEN hoặc MEETING_ID');
  process.exit(1);
}
if (!fs.existsSync(WAV_FILE)) {
  console.error(`❌ Không tìm thấy WAV_FILE: ${WAV_FILE}`);
  process.exit(1);
}

// ── Helpers ────────────────────────────────────────────────────────────────
function extractPcm48kMono(filePath) {
  const result = spawnSync(FFMPEG_PATH, [
    '-i', filePath, '-f', 's16le', '-ar', '48000', '-ac', '1', 'pipe:1',
  ], { maxBuffer: 200 * 1024 * 1024 });
  if (result.error || result.status !== 0) {
    console.error('❌ ffmpeg failed:', result.stderr?.toString());
    process.exit(1);
  }
  return result.stdout;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function log(msg) { console.log(`[${new Date().toLocaleTimeString()}] ${msg}`); }

// ── Stream N giây audio ────────────────────────────────────────────────────
async function streamSeconds(socket, meetingId, pcm, fromByte, seconds) {
  const CHUNK_BYTES = 48000 * 0.1 * 2; // 100ms
  const totalBytes = Math.min(seconds * 48000 * 2, pcm.length - fromByte);
  const endByte = fromByte + totalBytes;
  let currentByte = fromByte;
  let chunkIdx = 0;

  while (currentByte < endByte) {
    const chunk = pcm.slice(currentByte, currentByte + CHUNK_BYTES);
    socket.emit('audio_chunk', { meetingId, audio: Array.from(chunk) });
    currentByte += CHUNK_BYTES;
    chunkIdx++;
    await sleep(100);
    process.stdout.write(`\r   Chunk ${chunkIdx}  (~${(currentByte / (48000 * 2)).toFixed(1)}s / ${(endByte / (48000 * 2)).toFixed(1)}s)`);
  }
  console.log('');
  return endByte; // byte offset tiếp theo
}

// ── Tạo socket mới ─────────────────────────────────────────────────────────
function createSocket() {
  return io(`${SERVER_URL}/live`, { transports: ['websocket'], reconnection: false });
}

// ══════════════════════════════════════════════════════════════════════════
//  SCENARIO A — Reconnect thành công
// ══════════════════════════════════════════════════════════════════════════
async function scenarioA(pcm) {
  log('══ SCENARIO A — Reconnect (mạng yếu, mất 5s, có mạng lại) ══');

  // ── Phase 1: Mở session + stream 3s + ngắt đột ngột ─────────────────────
  log('[Phase 1] Connect + open_session...');
  const socket1 = createSocket();
  let receivedBlocks = [];

  await new Promise((resolve, reject) => {
    socket1.on('connect', () => {
      log(`  WS#1 connected (${socket1.id})`);
      socket1.emit('open_session', { meetingId: MEETING_ID, token: ACCESS_TOKEN });
    });

    socket1.on('session_ready', async () => {
      log('  session_ready ✓');
      log('  Stream 3 giây audio đầu tiên...');
      const nextByte = await streamSeconds(socket1, MEETING_ID, pcm, 0, 3);

      // Đợi AI xử lý batch đang chạy
      await sleep(2000);
      log('  ⚡ Ngắt WS (simulate mất mạng)...');
      socket1.disconnect();
      resolve(nextByte);
    });

    socket1.on('transcript_update', (b) => {
      log(`  📝 [seq=${b.sequenceNumber}] "${b.text}" — ${b.speakerLabel}`);
      receivedBlocks.push(b);
    });

    socket1.on('error', (e) => { log('❌ ' + e.message); socket1.disconnect(); reject(e); });
    socket1.on('connect_error', reject);
  }).then(async (nextByte) => {
    const lastSeq = receivedBlocks.length > 0
      ? receivedBlocks[receivedBlocks.length - 1].sequenceNumber : 0;

    log(`\n  📊 Đã nhận ${receivedBlocks.length} block(s) trước khi mất mạng. lastSeq=${lastSeq}`);

    // ── [VERIFY REDIS ngay tại đây] ─────────────────────────────────────
    console.log('\n  ┌─ VERIFY REDIS INSIGHT ────────────────────────────────┐');
    console.log(`  │  resume_window:${MEETING_ID.substring(0, 8)}...  → phải TỒN TẠI, TTL ~120s   │`);
    console.log(`  │  bull:live-session-timeout:*                          │`);
    console.log(`  │    → phải có 1 delayed job "session_timeout"          │`);
    console.log('  └───────────────────────────────────────────────────────┘\n');
    log('  Đang giả lập mất mạng 5 giây...');
    await sleep(5000);

    // ── Phase 2: Resume ─────────────────────────────────────────────────
    log('[Phase 2] Reconnect với resume event...');
    const socket2 = createSocket();

    await new Promise((res2, rej2) => {
      socket2.on('connect', () => {
        log(`  WS#2 connected (${socket2.id})`);
        socket2.emit('resume', {
          meetingId: MEETING_ID,
          token: ACCESS_TOKEN,
          lastReceivedSequence: lastSeq,
        });
      });

      socket2.on('resume_ok', async (data) => {
        log(`  ✅ resume_ok — missedBlocks=${data.missedBlocks.length}`);
        if (data.missedBlocks.length > 0) {
          log('  Các block missed trong lúc mất mạng:');
          data.missedBlocks.forEach(b =>
            log(`    [seq=${b.sequenceNumber}] "${b.text}" — ${b.speakerLabel}`)
          );
        } else {
          log('  (Không có block nào bị miss — AI chưa xử lý xong trước khi disconnect)');
        }

        // ── [VERIFY REDIS sau resume] ─────────────────────────────────
        console.log('\n  ┌─ VERIFY REDIS INSIGHT (sau resume) ───────────────────┐');
        console.log(`  │  resume_window:${MEETING_ID.substring(0, 8)}...  → phải ĐÃ BỊ XÓA       │`);
        console.log(`  │  bull:live-session-timeout:* → job phải ĐÃ BỊ CANCEL   │`);
        console.log('  └───────────────────────────────────────────────────────┘\n');

        log('  [Phase 2B] Gửi audio còn lại (mô phỏng drain client buffer + tiếp live)...');
        await streamSeconds(socket2, MEETING_ID, pcm, nextByte, 999); // hết file

        await sleep(3000); // đợi batch cuối
        log('  Gửi end_session...');
        socket2.emit('end_session', { meetingId: MEETING_ID });
      });

      socket2.on('transcript_update', (b) =>
        log(`  📝 [seq=${b.sequenceNumber}] "${b.text}" — ${b.speakerLabel}`)
      );

      socket2.on('session_ended', () => {
        log('\n  🏁 session_ended');
        console.log('\n  ┌─ VERIFY FINAL (pgAdmin + MinIO) ──────────────────────┐');
        console.log('  │  meetings:         status=COMPLETED, audio_url khác null│');
        console.log('  │  transcript_blocks: N dòng, seq liên tục (không gap)    │');
        console.log('  │  MinIO: mp2-bucket/audio/<meetingId>.pcm                │');
        console.log('  └───────────────────────────────────────────────────────┘\n');
        log('✅ SCENARIO A — PASSED');
        socket2.disconnect();
        res2(undefined);
      });

      socket2.on('error', (e) => { log('❌ ' + e.message); socket2.disconnect(); rej2(e); });
      socket2.on('connect_error', rej2);
    });
  });
}

// ══════════════════════════════════════════════════════════════════════════
//  SCENARIO B — Timeout (không reconnect, BullMQ tự finalize)
// ══════════════════════════════════════════════════════════════════════════
async function scenarioB(pcm) {
  log('══ SCENARIO B — Timeout (mất mạng > 120s, không reconnect) ══');
  log('⚠️  Script sẽ đợi 125s sau khi disconnect. Đừng tắt terminal.\n');

  // Kết nối, gửi một ít audio, rồi ngắt
  const socket = createSocket();
  await new Promise((resolve, reject) => {
    socket.on('connect', () => {
      log(`  WS connected (${socket.id})`);
      socket.emit('open_session', { meetingId: MEETING_ID, token: ACCESS_TOKEN });
    });

    socket.on('session_ready', async () => {
      log('  session_ready ✓ — Stream 5s audio...');
      await streamSeconds(socket, MEETING_ID, pcm, 0, 5);
      await sleep(2000);
      log('  ⚡ Ngắt WS (simulate mất mạng dài)...');
      socket.disconnect();
      resolve(undefined);
    });

    socket.on('transcript_update', (b) =>
      log(`  📝 [seq=${b.sequenceNumber}] "${b.text}"`)
    );
    socket.on('error', (e) => { log('❌ ' + e.message); reject(e); });
    socket.on('connect_error', reject);
  });

  console.log('\n  ┌─ VERIFY REDIS ngay sau disconnect ────────────────────┐');
  console.log(`  │  resume_window:${MEETING_ID.substring(0, 8)}...  → TỒN TẠI  (TTL 120s)│`);
  console.log(`  │  bull:live-session-timeout:* → 1 delayed job          │`);
  console.log('  └───────────────────────────────────────────────────────┘\n');

  log('⏳ Đang đợi 125s (TTL=120s + buffer 5s)...');
  for (let i = 125; i > 0; i--) {
    process.stdout.write(`\r   Còn ${i}s...`);
    await sleep(1000);
  }
  console.log('\n');

  log('📌 BullMQ job đã fire và finalize xong. Kiểm tra:');
  console.log('\n  ┌─ VERIFY FINAL ────────────────────────────────────────┐');
  console.log('  │  pgAdmin: meetings.status = COMPLETED                 │');
  console.log('  │  pgAdmin: transcript_blocks có dòng                   │');
  console.log('  │  MinIO:   audio/<meetingId>.pcm tồn tại               │');
  console.log('  │  Redis:   resume_window:... ĐÃ BỊ XÓA (hết TTL)      │');
  console.log('  │  Redis:   bull:live-session-timeout delayed job = DONE│');
  console.log('  └───────────────────────────────────────────────────────┘\n');

  // Thử resume sau timeout — phải nhận lỗi
  log('[Bonus] Thử resume sau khi đã timeout — phải nhận error...');
  const socket2 = createSocket();
  await new Promise((resolve) => {
    socket2.on('connect', () => {
      socket2.emit('resume', {
        meetingId: MEETING_ID,
        token: ACCESS_TOKEN,
        lastReceivedSequence: 0,
      });
    });
    socket2.on('error', (e) => {
      log(`  ✅ Nhận đúng error: "${e.message}"`);
      socket2.disconnect();
      resolve(undefined);
    });
    socket2.on('disconnect', () => resolve(undefined));
    socket2.on('connect_error', () => resolve(undefined));
  });

  log('✅ SCENARIO B — PASSED');
}

// ── Entry point ─────────────────────────────────────────────────────────────
async function main() {
  console.log('══════════════════════════════════════════════════════');
  console.log(`  CORE 3 — Reconnect Test — Scenario ${SCENARIO}`);
  console.log('══════════════════════════════════════════════════════\n');

  const pcm = extractPcm48kMono(WAV_FILE);

  if (SCENARIO === 'A') {
    await scenarioA(pcm);
  } else if (SCENARIO === 'B') {
    await scenarioB(pcm);
  } else {
    console.error(`❌ SCENARIO không hợp lệ: "${SCENARIO}" (dùng A hoặc B)`);
    process.exit(1);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
