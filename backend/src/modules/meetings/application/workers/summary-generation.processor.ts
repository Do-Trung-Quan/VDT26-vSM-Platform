import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Inject } from '@nestjs/common';
import { QUEUE_NAMES, JOB_NAMES } from '../../../../queue/queue.constants';
import { IMeetingRepository } from '../../domain/ports/meeting.repository.port';
import { ITranscriptBlockRepository } from '../../domain/ports/transcript-block.repository.port';
import { IMeetingSummaryRepository } from '../../domain/ports/meeting-summary.repository.port';
import { ILlmPort } from '../../domain/ports/llm.port';
import {
  MEETING_REPOSITORY, TRANSCRIPT_BLOCK_REPOSITORY,
  MEETING_SUMMARY_REPOSITORY, LLM_PORT,
} from '../../meetings.tokens';

@Processor(QUEUE_NAMES.SUMMARY_GENERATION)
@Injectable()
export class SummaryGenerationProcessor extends WorkerHost {
  private readonly logger = new Logger(SummaryGenerationProcessor.name);

  constructor(
    @Inject(MEETING_REPOSITORY) private readonly meetingRepo: IMeetingRepository,
    @Inject(TRANSCRIPT_BLOCK_REPOSITORY) private readonly blockRepo: ITranscriptBlockRepository,
    @Inject(MEETING_SUMMARY_REPOSITORY) private readonly summaryRepo: IMeetingSummaryRepository,
    @Inject(LLM_PORT) private readonly llm: ILlmPort,
  ) { super(); }

  async process(job: Job<{ meetingId: string }>): Promise<void> {
    const { meetingId } = job.data;

    if (job.name !== JOB_NAMES.GENERATE_SUMMARY) return;

    const summary = await this.summaryRepo.findByMeeting(meetingId);
    if (!summary) return;

    try {
      const meeting = await this.meetingRepo.findActiveById(meetingId);
      if (!meeting) throw new Error(`Meeting ${meetingId} không tồn tại`);

      const blocks = await this.blockRepo.findByMeeting(meetingId);

      if (blocks.length === 0) {
        summary.markCompleted('Cuộc họp này chưa có nội dung transcript.');
        await this.summaryRepo.save(summary);
        return;
      }

      const transcriptText = blocks
        .map(b => {
          const min = Math.floor(b.startTime / 60);
          const sec = Math.floor(b.startTime % 60);
          const ts = `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
          return `[${b.speakerLabel} - ${ts}]: ${b.text}`;
        })
        .join('\n');

      // ------ CHÈN ĐOẠN LOG NÀY VÀO ------
      this.logger.log(`====================== TRANSCRIPT INPUT (Job: ${job.id}) ======================`);
      this.logger.log(`Tổng số block: ${blocks.length}`);
      this.logger.log(`Nội dung Transcript chi tiết:\n${transcriptText}`);
      this.logger.log(`=============================================================================`);
      // ----------------------------------

      const prompt =
        `Bạn là một chuyên gia thư ký số chuyên nghiệp. Nhiệm vụ của bạn là đọc toàn bộ transcript dưới đây và viết một đoạn văn tóm tắt cuộc họp xuất sắc bằng TIẾNG VIỆT HOÀN TOÀN.

YÊU CẦU QUAN TRỌNG:
1. NGÔN NGỮ: Bắt buộc phải viết bằng tiếng Việt. Tuyệt đối không trả về tiếng Anh hoặc bất kỳ ngôn ngữ nào khác kể cả khi nội dung gốc có tiếng Anh.
2. ĐỊNH DẠNG: Chỉ trả về một đoạn văn bản duy nhất (khoảng 50 - 70 từ), viết liên tục. Không dùng danh sách, không dùng dấu gạch đầu dòng (bullet points), không chào hỏi, không giải thích thêm.
3. NỘI DUNG: Đoạn văn phải mạch lạc, đủ nghĩa, tập trung vào:
   - Chủ đề và mục đích chính của cuộc họp.
   - Các sự kiện cụ thể xảy ra trong cuộc họp.
   - Kết luận chung (nếu có).

Tiêu đề cuộc họp: ${meeting.title}

--- BẮT ĐẦU TRANSCRIPT CỦA CUỘC HỌP ---
${transcriptText}
--- KẾT THÚC TRANSCRIPT ---

Đoạn văn tóm tắt cuộc họp bằng tiếng Việt (150-250 từ, đủ nghĩa, không viết dở dang, phải viết có dấu):`;


      const summaryText = await this.llm.summarize(prompt);
      summary.markCompleted(summaryText);
      await this.summaryRepo.save(summary);

      this.logger.log(`[Summary] Meeting ${meetingId} tóm tắt xong (${summaryText.length} ký tự)`);
    } catch (err) {
      this.logger.error(`[Summary] Thất bại cho meeting ${meetingId}: ${err}`);
      throw err; // BullMQ sẽ retry theo config
    }
  }
}
