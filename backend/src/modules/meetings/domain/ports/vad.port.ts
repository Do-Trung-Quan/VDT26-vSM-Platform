export interface AudioSegment {
  buffer: Buffer;
  startTime: number; // seconds
  endTime: number;
}

/** WebRTC VAD (node-vad) — detect silence để cắt audio thành utterance segments. */
export interface IVadPort {
  /** Xử lý 1 PCM chunk, trả về các segment hoàn chỉnh (nếu có silence kết thúc utterance). */
  feed(sessionId: string, pcmChunk: Buffer): Promise<AudioSegment[]>;
  /** Flush: lấy segment còn dang dở khi kết thúc phiên. */
  flush(sessionId: string): Promise<AudioSegment | null>;
  clearSession(sessionId: string): void;
}
