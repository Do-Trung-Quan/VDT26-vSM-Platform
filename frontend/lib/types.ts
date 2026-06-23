export type Role = "USER" | "ADMIN";
export type MeetingStatus = "LIVE" | "PROCESSING" | "COMPLETED";
export type MeetingType = "LIVE" | "UPLOAD";
export type UserStatus = "active" | "inactive";

export interface Department {
  id: string;
  name: string;
  address: string;
  description: string;
  userCount: number;
  deleted: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  empId: string;
  dept: string;
  role: Role;
  active: boolean;
  created: string;
  color: string;
}

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
