/** Ghi nối tiếp audio vào file tạm trên đĩa trong suốt phiên live. */
export interface ILocalAudioStoragePort {
  /** Tạo write stream mới cho meeting. Gọi khi bắt đầu phiên. */
  initStream(meetingId: string): void;
  append(meetingId: string, chunk: Buffer): Promise<void>;
  /** Đóng stream và trả về đường dẫn file tạm. */
  close(meetingId: string): Promise<string>;
  remove(filePath: string): Promise<void>;
}
