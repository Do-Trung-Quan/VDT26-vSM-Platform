/**
 * Batch Speaker Embedding — Viettel Diarization Embedding API.
 * Gửi N file WAV 16kHz mono, nhận N vector 512-dim (hoặc null nếu đoạn không hợp lệ).
 * Kết quả dùng để so sánh cosine similarity → phân định người nói (SpeakerDiarizationService).
 */
export interface ISpeakerEmbeddingPort {
  batchGetEmbeddings(segments: Buffer[], sampleRateHz?: number): Promise<(number[] | null)[]>;
}
