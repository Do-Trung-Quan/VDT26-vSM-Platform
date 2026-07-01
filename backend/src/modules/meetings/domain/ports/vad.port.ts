export interface AudioSegment {
  buffer: Buffer;
  startTime: number; // seconds
  endTime: number;
}

/** VAD — detect silence để cắt audio thành utterance segments. */
export interface IVadPort {
  /**
   * Khởi tạo session với sample rate chỉ định.
   * Gọi trước feed() khi sample rate khác 48kHz mặc định (vd: batch 16kHz).
   */
  initSession(sessionId: string, sampleRateHz: number): void;
  /** Xử lý 1 PCM chunk, trả về các segment hoàn chỉnh (nếu có silence kết thúc utterance). */
  feed(sessionId: string, pcmChunk: Buffer): Promise<AudioSegment[]>;
  /** Flush: lấy segment còn dang dở khi kết thúc phiên. */
  flush(sessionId: string): Promise<AudioSegment | null>;
  clearSession(sessionId: string): void;
}
