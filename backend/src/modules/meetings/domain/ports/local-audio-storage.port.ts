/** Ghi nối tiếp audio vào file tạm trên đĩa trong suốt phiên live. */
export interface ILocalAudioStoragePort {
  append(meetingId: string, chunk: Buffer): Promise<void>;
  close(meetingId: string): Promise<string>; // trả về filePath
  remove(filePath: string): Promise<void>;
}
