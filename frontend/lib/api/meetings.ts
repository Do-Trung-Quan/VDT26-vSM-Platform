import { api } from "../api";
import type { MeetingListItem, MeetingDetail, MeetingStatus, TranscriptBlock, MeetingSummary } from "../types";

export interface ListMeetingsParams {
  page?: number;
  limit?: number;
  status?: MeetingStatus;
  departmentId?: string;
  fromDate?: string;
  toDate?: string;
  deletedStatus?: "all" | "active" | "deleted";
}

export interface MeetingListMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface MeetingUpdateResponse {
  id: string;
  title: string;
  description: string | null;
  departmentId: string;
  departmentName: string;
  isLocked: boolean;
  updatedAt: string;
}

function buildQs(params: ListMeetingsParams): string {
  const qs = new URLSearchParams();
  qs.set("page",  String(params.page  ?? 1));
  qs.set("limit", String(params.limit ?? 20));
  if (params.status)        qs.set("status",        params.status);
  if (params.departmentId)  qs.set("departmentId",  params.departmentId);
  if (params.fromDate)      qs.set("fromDate",       params.fromDate);
  if (params.toDate)        qs.set("toDate",         params.toDate);
  if (params.deletedStatus) qs.set("deletedStatus",  params.deletedStatus);
  return qs.toString();
}

export const meetingsApi = {
  // User: list meetings in own dept (always active)
  list: (params: ListMeetingsParams = {}) =>
    api.get<MeetingListItem[]>(`/meetings?${buildQs(params)}`),

  // Admin: list all meetings (cross-dept, supports deletedStatus)
  listAll: (params: ListMeetingsParams = {}) =>
    api.get<MeetingListItem[]>(`/admin/meetings?${buildQs(params)}`),

  getDetail: (id: string) =>
    api.get<MeetingDetail>(`/meetings/${id}`),

  getTranscript: (id: string) =>
    api.get<TranscriptBlock[]>(`/meetings/${id}/transcript`),

  getSummary: (id: string) =>
    api.get<MeetingSummary>(`/meetings/${id}/summary`),

  createLive: (body: { title: string; description?: string; departmentId?: string }) =>
    api.post<MeetingDetail>("/meetings/live", body),

  /** Legacy: direct multipart upload (dùng cho test script, không qua presigned URL) */
  uploadAudio: (form: FormData) =>
    api.postForm<MeetingDetail>("/meetings/upload", form),

  /** Bước 1: khởi tạo meeting + lấy presigned PUT URL cho MinIO */
  uploadAudioInit: (body: {
    title: string;
    description?: string;
    departmentId?: string;
    startedAt?: string;
    filename: string;
    filesize?: number;
  }) => api.post<{ meetingId: string; presignedUrl: string }>("/meetings/upload/init", body),

  /** Bước 3: thông báo upload xong, backend đẩy job BullMQ */
  uploadAudioComplete: (meetingId: string) =>
    api.post<MeetingDetail>("/meetings/upload/complete", { meetingId }),

  softDelete: (id: string) =>
    api.delete<null>(`/meetings/${id}`),

  restore: (id: string) =>
    api.post<null>(`/admin/meetings/${id}/restore`),

  updateInfo: (id: string, body: { title?: string; description?: string; departmentId?: string }) =>
    api.patch<MeetingUpdateResponse>(`/admin/meetings/${id}`, body),

  setLocked: (id: string, isLocked: boolean) =>
    api.patch<MeetingUpdateResponse>(`/admin/meetings/${id}/lock`, { isLocked }),

  getUploadProgress: (id: string) =>
    api.get<{ status: string; percent: number; stage: string; totalSegments: number; processedSegments: number }>(
      `/meetings/${id}/upload-progress`,
    ),
};
