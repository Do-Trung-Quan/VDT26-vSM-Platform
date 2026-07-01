import { TranscriptBlock } from '../entities/transcript-block.entity';

export interface ITranscriptBufferPort {
  /** Khởi tạo buffer cho session (idempotent). */
  allocate(meetingId: string): Promise<void>;
  /** Đẩy 1 block vào tail của buffer. */
  push(meetingId: string, block: TranscriptBlock): Promise<void>;
  /** Lấy tất cả block có sequenceNumber > afterSeq (phục vụ missed_blocks khi resume). */
  getAfter(meetingId: string, afterSeq: number): Promise<TranscriptBlock[]>;
  /** Lấy toàn bộ buffer (dùng khi finalize để bulkSave). */
  drainAll(meetingId: string): Promise<TranscriptBlock[]>;
  /** Xóa buffer sau khi finalize xong. */
  cleanup(meetingId: string): Promise<void>;
  /** Đặt TTL chờ resume (giây). */
  setResumeTtl(meetingId: string, ttlSeconds: number): Promise<void>;
  /** Hủy TTL (khi client resume thành công). */
  clearResumeTtl(meetingId: string): Promise<void>;
  /** Kiểm tra session vẫn trong cửa sổ resume. */
  isResumable(meetingId: string): Promise<boolean>;
  /** Cập nhật nhãn người nói cho các block trong buffer. */
  updateSpeakerLabel(meetingId: string, oldLabel: string, newLabel: string): Promise<void>;
}
