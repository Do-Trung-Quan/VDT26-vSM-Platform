export interface ILiveSessionRegistryPort {
  /** Số phiên live đang chạy toàn hệ thống. */
  countLive(): Promise<number>;
  increment(): Promise<void>;
  decrement(): Promise<void>;
  /** Đăng ký session của user (để check concurrent sessions per user). */
  addUserSession(userId: string, meetingId: string): Promise<void>;
  removeUserSession(userId: string, meetingId: string): Promise<void>;
  countUserSessions(userId: string): Promise<number>;
}
