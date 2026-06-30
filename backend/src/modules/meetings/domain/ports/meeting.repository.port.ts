import { Meeting, MeetingStatus } from '../entities/meeting.entity';

export type DeletedStatusFilter = 'all' | 'active' | 'deleted';

export interface ListMeetingsOptions {
  page: number;
  limit: number;
  departmentId?: string;
  status?: MeetingStatus;
  fromDate?: Date;
  toDate?: Date;
  /** Lọc theo trạng thái xóa mềm. Default: 'active' (chỉ hiện chưa xóa). */
  deletedStatus?: DeletedStatusFilter;
}

export interface PaginatedMeetings {
  items: Meeting[];
  total: number;
}

export interface IMeetingRepository {
  save(meeting: Meeting): Promise<void>;
  findById(id: string): Promise<Meeting | null>;
  findActiveById(id: string): Promise<Meeting | null>;
  listByDepartment(deptId: string, options: ListMeetingsOptions): Promise<PaginatedMeetings>;
  listAll(options: ListMeetingsOptions): Promise<PaginatedMeetings>;
  searchByTitle(keyword: string, departmentId: string | null, page: number, limit: number): Promise<PaginatedMeetings>;
  /** Đếm số meeting không bị xóa theo status — dùng để kiểm tra ngưỡng live đồng thời. */
  countActiveByStatus(status: MeetingStatus): Promise<number>;
}
