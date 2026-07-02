import { Injectable, Logger } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import * as path from 'path';
import * as fs from 'fs';
import { IPdfExporterPort } from '../../domain/ports/pdf-exporter.port';
import { Meeting } from '../../domain/entities/meeting.entity';
import { TranscriptBlock } from '../../domain/entities/transcript-block.entity';

// Vietnamese support: place Roboto TTF files at backend/src/assets/fonts/
const ASSETS_DIR = path.join(__dirname, '..', '..', '..', '..', 'assets', 'fonts');
const FONT_REGULAR = path.join(ASSETS_DIR, 'Roboto-Regular.ttf');
const FONT_BOLD = path.join(ASSETS_DIR, 'Roboto-Bold.ttf');

function formatTs(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  return `${hh}:${mm}  ${dd}/${mo}/${d.getFullYear()}`;
}

@Injectable()
export class PdfKitExporterAdapter implements IPdfExporterPort {
  private readonly logger = new Logger(PdfKitExporterAdapter.name);
  private readonly hasFont: boolean;

  constructor() {
    this.hasFont = fs.existsSync(FONT_REGULAR) && fs.existsSync(FONT_BOLD);
    if (!this.hasFont) {
      this.logger.warn(
        'Font Roboto không tìm thấy tại src/assets/fonts/. ' +
        'Tiếng Việt có thể không hiển thị đúng trong PDF. ' +
        'Tải font tại: https://fonts.google.com/specimen/Roboto',
      );
    }
  }

  async export(meeting: Meeting, transcript: TranscriptBlock[]): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      // bufferPages: true — cho phép switchToPage để thêm footer đồng đều tất cả trang
      const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });

      if (this.hasFont) {
        doc.registerFont('Regular', FONT_REGULAR);
        doc.registerFont('Bold', FONT_BOLD);
      }

      const R = this.hasFont ? 'Regular' : 'Helvetica';
      const B = this.hasFont ? 'Bold' : 'Helvetica-Bold';

      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const MARGIN = 50;
      const PAGE_W = doc.page.width;   // 595.28 (A4)
      const PAGE_H = doc.page.height;  // 841.89 (A4)
      const CONTENT_W = PAGE_W - MARGIN * 2;
      const FOOTER_H = 28; // chiều cao thanh footer đỏ ở đáy
      const RED = '#EE0033';
      const DARK = '#1A2332';
      const MUTED = '#6B7280';
      // Giới hạn đáy nội dung — dừng trước footer bar + khoảng đệm
      const BOTTOM_LIMIT = PAGE_H - MARGIN - FOOTER_H - 10;

      // ── 1. TIÊU NGỮ QUỐC GIA (căn giữa, đầu trang 1) ────────────────────
      doc.font(B).fontSize(13).fillColor(DARK)
        .text('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', MARGIN, MARGIN, {
          width: CONTENT_W, align: 'center',
        });

      doc.moveDown(0.35);
      doc.font(R).fontSize(11).fillColor(DARK)
        .text('Độc lập - Tự do - Hạnh phúc', { width: CONTENT_W, align: 'center' });

      // Dòng kẻ ngắn bọc dưới "Độc lập - Tự do - Hạnh phúc"
      const ulY = doc.y + 3;
      const ulCx = PAGE_W / 2;
      const ulHW = 70; // half-width of underline
      doc.moveTo(ulCx - ulHW, ulY)
        .lineTo(ulCx + ulHW, ulY)
        .strokeColor(DARK).lineWidth(0.75).stroke();
      doc.y = ulY + 10;

      // ── 2. TIÊU ĐỀ BIÊN BẢN ─────────────────────────────────────────────
      doc.moveDown(1.0);
      doc.font(B).fontSize(15).fillColor(DARK)
        .text('BIÊN BẢN CUỘC HỌP:', { width: CONTENT_W, align: 'center' });
      doc.moveDown(0.35);
      doc.font(B).fontSize(14).fillColor(DARK)
        .text(meeting.title.toUpperCase(), { width: CONTENT_W, align: 'center' });

      // ── 3. THÔNG TIN CHUNG — Bảng 2 cột căn theo tâm trang ─────────────────
      doc.moveDown(1.5);

      // Tâm trang làm đường chia: label right-align về trái tâm, value left từ tâm
      const CENTER_X = PAGE_W / 2;          // 297.64
      const INFO_GAP = 16;                   // khoảng cách nhỏ giữa 2 cột
      const INFO_LABEL_W = 155;
      const INFO_LABEL_X = CENTER_X - INFO_LABEL_W - INFO_GAP; // ~134
      const INFO_VAL_X = CENTER_X + INFO_GAP;                // ~305
      const INFO_VAL_W = PAGE_W - MARGIN - INFO_VAL_X;       // ~240

      const host = meeting.host?.fullName ?? '—';
      const dept = meeting.department?.name ?? '—';
      const start = formatDate(meeting.startedAt?.toISOString() ?? null);
      const end = formatDate(meeting.endedAt?.toISOString() ?? null);

      const infoRows: [string, string][] = [
        ['Người tạo cuộc họp:', host],
        ['Phòng ban:', dept],
        ['Thời gian bắt đầu:', start],
        ['Thời gian kết thúc:', end],
      ];

      for (const [label, value] of infoRows) {
        const rowY = doc.y;
        // Nhãn RIGHT-aligned — ":" kết thúc ngay sát tâm trang
        doc.font(B).fontSize(11).fillColor(DARK)
          .text(label, INFO_LABEL_X, rowY, { width: INFO_LABEL_W, align: 'right', lineBreak: false });
        // Giá trị LEFT-aligned — bắt đầu từ tâm trang
        doc.font(R).fontSize(11).fillColor(DARK)
          .text(value, INFO_VAL_X, rowY, { width: INFO_VAL_W });
        doc.moveDown(0.2);
      }

      // ── Đường kẻ phân cách ────────────────────────────────────────────────
      doc.moveDown(1.0);
      doc.moveTo(MARGIN, doc.y)
        .lineTo(PAGE_W - MARGIN, doc.y)
        .strokeColor('#D1D5DB').lineWidth(0.8).stroke();
      doc.moveDown(0.9);

      // Chỉ định tọa độ tường minh để tránh kế thừa doc.x từ bảng info
      doc.font(B).fontSize(13).fillColor(DARK)
        .text('NỘI DUNG BIÊN BẢN', MARGIN, doc.y, { width: CONTENT_W, align: 'center' });
      doc.moveDown(0.8);

      // ── 4. TRANSCRIPT — Bảng ẩn viền 2 cột ─────────────────────────────
      //   Cột trái  (~13% ≈ 64 px): Timestamp xám, luôn hiển thị mọi block
      //   Cột phải  (~87% ≈ 423 px): Speaker label + nội dung phát biểu
      const TS_COL_W = Math.floor(CONTENT_W * 0.13);
      const COL_GAP = 8;
      const TEXT_COL_X = MARGIN + TS_COL_W + COL_GAP;
      const TEXT_COL_W = CONTENT_W - TS_COL_W - COL_GAP;

      if (transcript.length === 0) {
        doc.font(R).fontSize(11).fillColor(MUTED)
          .text('Chưa có nội dung transcript.', { width: CONTENT_W, align: 'center' });
      } else {
        let lastSpeaker = '';

        for (const block of transcript) {
          const isSameSpeaker = block.speakerLabel === lastSpeaker;
          const ts = formatTs(block.startTime);

          // Ước tính chiều cao để quyết định ngắt trang trước khi render
          doc.font(R).fontSize(10);
          let blockH = doc.heightOfString(block.text, { width: TEXT_COL_W }) + 6;
          if (!isSameSpeaker) {
            doc.font(B).fontSize(10);
            blockH += doc.heightOfString(block.speakerLabel, { width: TEXT_COL_W }) + 2;
          }
          if (doc.y + blockH > BOTTOM_LIMIT) {
            doc.addPage();
          }

          const rowY = doc.y;

          // Cột trái: timestamp — luôn hiển thị, canh giữa trong cột
          doc.font(R).fontSize(9).fillColor(MUTED)
            .text(ts, MARGIN, rowY, { width: TS_COL_W, align: 'center', lineBreak: false });

          // Cột phải: speaker label (chỉ khi đổi người nói)
          let rightY = rowY;
          if (!isSameSpeaker) {
            doc.font(B).fontSize(10).fillColor(RED)
              .text(block.speakerLabel, TEXT_COL_X, rightY, { width: TEXT_COL_W });
            rightY = doc.y + 1;
            lastSpeaker = block.speakerLabel;
          }

          // Nội dung phát biểu — KHÔNG sửa đổi text gốc
          doc.font(R).fontSize(10).fillColor(DARK)
            .text(block.text, TEXT_COL_X, rightY, { width: TEXT_COL_W });

          doc.y = doc.y + 6;
        }
      }

      // ── Footer đỏ Viettel — thêm đồng đều vào TẤT CẢ trang ────────────────
      // Phải set margins.bottom = 0 trước: PDFKit tự thêm trang mới khi
      // text vượt ngưỡng PAGE_H - margins.bottom (= 791px với margin 50).
      const dateStr = new Date().toLocaleDateString('vi-VN');
      const range = doc.bufferedPageRange();
      const footerY = PAGE_H - FOOTER_H;
      const textY = footerY + Math.floor((FOOTER_H - 9) / 2);

      for (let i = 0; i < range.count; i++) {
        doc.switchToPage(i);
        doc.page.margins.bottom = 0; // tắt auto page-break trong vùng footer

        // Thanh nền đỏ full-width
        doc.rect(0, footerY, PAGE_W, FOOTER_H).fill(RED);

        // Chữ trắng căn giữa trong thanh
        doc.font(R).fontSize(8).fillColor('#FFFFFF')
          .text(
            `Biên bản xuất từ hệ thống vSM Platform — ${dateStr}`,
            0, textY,
            { width: PAGE_W, align: 'center', lineBreak: false },
          );
      }

      doc.flushPages();
      doc.end();
    });
  }
}
