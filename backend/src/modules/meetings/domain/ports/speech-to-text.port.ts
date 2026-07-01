/** Batch STT — Viettel ASR Sherpa. Gửi N file WAV 16kHz mono, nhận N transcript. */
export interface ISpeechToTextPort {
  batchTranscribe(segments: Buffer[], sampleRateHz?: number): Promise<string[]>;
}
