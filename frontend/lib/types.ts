export type Role = "USER" | "ADMIN";
export type MeetingStatus = "LIVE" | "PROCESSING" | "COMPLETED";
export type MeetingType = "LIVE" | "UPLOAD";

/** Sync với backend UserListItemDto / UserProfileDto */
export interface User {
  id: string;
  fullName: string;
  email: string;
  employeeId: string;
  departmentId: string;
  departmentName: string;
  role: Role;
  isActive: boolean;
  avatarUrl: string;
  createdAt: string; // ISO datetime string
}

/** Sync với backend DepartmentDto */
export interface Department {
  id: string;
  name: string;
  address: string;
  description: string | null;
  userCount: number;
  deleted: boolean;
  createdAt: string;
}

/** Meeting — vẫn dùng mock data, sẽ sync ở Phase 5 */
export interface Meeting {
  id: string;
  title: string;
  status: MeetingStatus;
  type: MeetingType;
  host: string;
  dept: string;
  created: string;
  locked: boolean;
  deleted?: boolean;
}

export interface TranscriptBlock {
  seq: number;
  speaker: string;
  speakerIndex: number;
  text: string;
  time: string;
}

export interface KpiCard {
  label: string;
  value: string;
  trend: string;
  trendUp: boolean;
  icon: string;
  iconBg: string;
}

/** Helper: tạo màu avatar xác định từ userId (không đổi theo thời gian) */
const AVATAR_COLORS = ["#EE0033","#2D6CDF","#2E9E5B","#8B5CF6","#E8A23D","#0EA5A5","#D6336C","#64748B"];
export function getAvatarColor(id: string): string {
  const hash = id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

/** Helper: lấy 2 ký tự đầu họ tên (viết tắt) */
export function getInitials(fullName: string): string {
  return fullName.split(" ").slice(-2).map(w => w[0] ?? "").join("").toUpperCase();
}

/** Helper: format ISO date → DD/MM/YYYY */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("vi-VN", { day:"2-digit", month:"2-digit", year:"numeric" });
}
