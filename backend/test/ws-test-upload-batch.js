/**
 * ═══════════════════════════════════════════════════════════════════════
 *  SCRIPT TEST — CORE 2: UPLOAD AUDIO & BATCH TRANSCRIPTION
 * ═══════════════════════════════════════════════════════════════════════
 *
 * TÌNH HUỐNG THỰC TẾ MÔ PHỎNG:
 *   Người dùng upload file MP3/WAV. Backend lưu MinIO, tạo Meeting
 *   PROCESSING, đẩy job vào BullMQ. Worker chạy nền: download →
 *   ffmpeg convert 16kHz mono → VAD phân đoạn → batch STT + Embedding
 *   → speaker diarization → lưu transcript_blocks → COMPLETED.
 *   Script poll /upload-progress mỗi 2s, hiển thị % realtime.
 *
 * CÁCH CHẠY:
 *   # Bước 1: Lấy token qua Postman: POST /api/auth/login
 *
 *   # Bước 2: Chạy script
 *   TOKEN=<accessToken> node test/ws-test-upload-batch.js
 *
 *   # Tuỳ chọn: chỉ định file audio khác
 *   TOKEN=<accessToken> AUDIO_FILE="C:\path\to\file.mp3" node test/ws-test-upload-batch.js
 *
 * SAU KHI CHẠY XONG — kiểm tra:
 *   pgAdmin  → meetings:         status=COMPLETED, duration_seconds > 0
 *   pgAdmin  → transcript_blocks: N dòng với text/speaker/times hợp lệ
 *   MinIO    → bucket/audio/<id>.*: file tồn tại, size > 0
 *   Redis    → upload:<id>:progress: KHÔNG tồn tại (đã cleanup)
 * ═══════════════════════════════════════════════════════════════════════
 */

'use strict';
const fs = require('fs');
const path = require('path');

// ── Cấu hình ──────────────────────────────────────────────────────────────
const SERVER_URL = (process.env.SERVER_URL || 'http://localhost:3001').replace(/\/$/, '');
const API_BASE = `${SERVER_URL}/api`;
const ACCESS_TOKEN = process.env.TOKEN;
const AUDIO_FILE = process.env.AUDIO_FILE
  || 'C:\\VDT\\Project\\mockup audio\\CHO.mp3';
const MEETING_TITLE = process.env.TITLE
  || `Test Upload Core2 — ${new Date().toLocaleTimeString('vi')}`;

const POLL_MS = 2000;
const TIMEOUT_MS = 10 * 60 * 1000; // 10 phút

// ── Validate ───────────────────────────────────────────────────────────────
if (!ACCESS_TOKEN) {
  console.error('❌ Thiếu ACCESS_TOKEN');
  console.error('   Dùng: TOKEN=xxx node test/ws-test-upload-batch.js');
  process.exit(1);
}
if (!fs.existsSync(AUDIO_FILE)) {
  console.error(`❌ Không tìm thấy AUDIO_FILE: ${AUDIO_FILE}`);
  console.error('   Dùng: AUDIO_FILE="/path/to/file.mp3" node test/ws-test-upload-batch.js');
  process.exit(1);
}
const fileExt = path.extname(AUDIO_FILE).toLowerCase();
if (!['.mp3', '.wav'].includes(fileExt)) {
  console.error(`❌ Chỉ chấp nhận .mp3 hoặc .wav, nhận: ${fileExt}`);
  process.exit(1);
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  const fileName = path.basename(AUDIO_FILE);
  const fileSize = (fs.statSync(AUDIO_FILE).size / 1024).toFixed(0);

  console.log('══════════════════════════════════════════════════════');
  console.log('  CORE 2 — Upload Audio & Batch Transcription Test');
  console.log('══════════════════════════════════════════════════════');
  console.log(`  Server:     ${API_BASE}`);
  console.log(`  Audio file: ${fileName} (${fileSize} KB)`);
  console.log(`  Title:      ${MEETING_TITLE}`);
  console.log('══════════════════════════════════════════════════════\n');

  // ── STEP 1: Upload file ──────────────────────────────────────────────────
  console.log('[STEP 1] Upload file audio → POST /meetings/upload ...');

  const fileBuffer = fs.readFileSync(AUDIO_FILE);
  const mimeType = fileExt === '.mp3' ? 'audio/mpeg' : 'audio/wav';

  const form = new FormData();
  form.append('title', MEETING_TITLE);
  form.append('audio_file', new Blob([new Uint8Array(fileBuffer)], { type: mimeType }), fileName);

  const uploadRes = await fetch(`${API_BASE}/meetings/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
    body: form,
  });
  const uploadJson = await uploadRes.json().catch(() => ({}));

  if (!uploadRes.ok) {
    console.error(`❌ Upload thất bại (HTTP ${uploadRes.status}): ${JSON.stringify(uploadJson)}`);
    process.exit(1);
  }

  const meeting = uploadJson.data ?? uploadJson;
  const meetingId = meeting.id;

  if (!meetingId) {
    console.error('❌ Response không có meeting.id:', JSON.stringify(uploadJson));
    process.exit(1);
  }

  console.log(`✅ Meeting đã tạo — id: ${meetingId}`);
  console.log(`   type:     ${meeting.type}`);
  console.log(`   status:   ${meeting.status}`);
  console.log(`   audioUrl: ${meeting.audioUrl}`);

  // ── STEP 2: Poll upload-progress ─────────────────────────────────────────
  console.log('\n[STEP 2] Theo dõi tiến độ xử lý (poll mỗi 2s)...\n');

  const startMs = Date.now();
  let lastPercent = -1;
  let lastStage = '';
  let completed = false;

  while (Date.now() - startMs < TIMEOUT_MS) {
    await new Promise(r => setTimeout(r, POLL_MS));

    const res = await fetch(`${API_BASE}/meetings/${meetingId}/upload-progress`, {
      headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
    }).catch(() => null);

    if (!res?.ok) {
      process.stdout.write('\r   ⏳ Đang kết nối lại...');
      continue;
    }

    const pj = await res.json().catch(() => ({}));
    const data = pj.data ?? pj;
    const pct = data.percent ?? 0;
    const stage = data.stage ?? '';
    const total = data.totalSegments ?? 0;
    const done = data.processedSegments ?? 0;
    const elapsed = ((Date.now() - startMs) / 1000).toFixed(0);

    // Log khi stage thay đổi hoặc % nhảy >= 5
    if (stage !== lastStage || Math.abs(pct - lastPercent) >= 5) {
      const segInfo = total > 0 ? ` (${done}/${total} segments)` : '';
      process.stdout.write(`\r   ${pct}% — ${stage}${segInfo}  [${elapsed}s]\n`);
      lastStage = stage;
      lastPercent = pct;
    } else {
      process.stdout.write(`\r   ${pct}% — ${stage}  [${elapsed}s]`);
    }

    if (data.status === 'COMPLETED') {
      process.stdout.write('\n');
      console.log(`\n✅ Worker hoàn thành! Thời gian xử lý: ${elapsed}s`);
      completed = true;
      break;
    }

    if (pct === -1 || data.errorMessage) {
      process.stdout.write('\n');
      console.error(`\n❌ Worker báo lỗi: ${data.errorMessage ?? 'unknown'}`);
      process.exit(1);
    }
  }

  if (!completed) {
    console.error('\n❌ Timeout: Worker chưa hoàn thành sau 10 phút');
    process.exit(1);
  }

  // ── STEP 3: Kiểm tra meeting detail ─────────────────────────────────────
  console.log('\n[STEP 3] Kiểm tra meeting detail → GET /meetings/:id ...');

  const detRes = await fetch(`${API_BASE}/meetings/${meetingId}`, {
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
  });
  const detJson = await detRes.json().catch(() => ({}));
  const det = detJson.data ?? detJson;

  console.log(`   status:           ${det.status}`);
  console.log(`   duration_seconds: ${det.durationSeconds ?? 0}`);
  console.log(`   audioUrl:         ${det.audioUrl}`);
  console.log(`   ended_at:         ${det.endedAt ?? '—'}`);

  if (det.status !== 'COMPLETED') {
    console.error('❌ Meeting chưa COMPLETED!');
    process.exit(1);
  }
  console.log('✅ Meeting status = COMPLETED');

  // ── STEP 4: Kiểm tra transcript blocks ──────────────────────────────────
  console.log('\n[STEP 4] Kiểm tra transcript → GET /meetings/:id/transcript ...');

  const trRes = await fetch(`${API_BASE}/meetings/${meetingId}/transcript`, {
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
  });
  const trJson = await trRes.json().catch(() => ({}));
  const blocks = trJson.data ?? trJson ?? [];

  console.log(`   Tổng số blocks: ${blocks.length}`);

  if (blocks.length === 0) {
    console.log('⚠  0 blocks — file không có tiếng nói hoặc VAD không phát hiện utterance.');
  } else {
    const speakers = [...new Set(blocks.map(b => b.speakerLabel))];
    console.log(`   Người nói: ${speakers.join(', ')}`);
    console.log('\n   Chi tiết transcript (toàn bộ blocks):');
    blocks.forEach(b => {
      console.log(
        `\n📝 [seq=${b.sequenceNumber}] ${b.speakerLabel} ` +
        `(${b.startTime?.toFixed(2)}s–${b.endTime?.toFixed(2)}s):\n` +
        `   "${b.text}"`,
      );
    });
    console.log('\n✅ Transcript blocks đã lưu');
  }

  // ── STEP 5: Kiểm tra progress endpoint sau khi xong ─────────────────────
  console.log('\n[STEP 5] Kiểm tra progress endpoint sau COMPLETED...');

  const prRes = await fetch(`${API_BASE}/meetings/${meetingId}/upload-progress`, {
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
  });
  const prJson = await prRes.json().catch(() => ({}));
  const prData = prJson.data ?? prJson;

  console.log(`   status:  ${prData.status}   percent: ${prData.percent}%`);
  if (prData.status === 'COMPLETED' && prData.percent === 100) {
    console.log('✅ Progress endpoint đọc từ DB (Redis key đã xóa)');
  } else {
    console.log('⚠  Progress không trả về COMPLETED/100% từ DB');
  }

  // ── Tổng kết ─────────────────────────────────────────────────────────────
  console.log('\n🏁 Test hoàn thành');
  console.log('\n──── Verify thủ công (pgAdmin / MinIO / Redis) ────────────');
  console.log(`pgAdmin  → meetings WHERE id = '${meetingId}'`);
  console.log(`           status = COMPLETED, duration_seconds > 0, ended_at NOT NULL`);
  console.log(`pgAdmin  → transcript_blocks WHERE meeting_id = '${meetingId}'`);
  console.log(`           sequence_number tăng dần, start_time < end_time`);
  console.log(`MinIO    → bucket/audio/${meetingId}${fileExt}`);
  console.log(`           object tồn tại, size = ${fileSize} KB`);
  console.log(`Redis    → GET upload:${meetingId}:progress`);
  console.log(`           Phải trả về (nil) — key đã bị xóa sau khi COMPLETED`);
  console.log('───────────────────────────────────────────────────────────\n');

  process.exit(0);
}

main().catch(e => {
  console.error('❌ Lỗi không mong đợi:', e.message);
  process.exit(1);
});
