# Giai đoạn 4 — Module Departments: HOÀN THÀNH

**Ngày:** 2026-06-25
**Trạng thái:** ✅ Tất cả task hoàn tất

---

## Những gì đã làm

### Infrastructure
| File | Vai trò |
|---|---|
| `departments.tokens.ts` | `DEPARTMENT_REPOSITORY` DI token |
| `domain/ports/department.repository.port.ts` | `IDepartmentRepository` — 5 method + `DepartmentStatusFilter` / `ListDepartmentsOptions` type |
| `infrastructure/repositories/department.repository.ts` | Impl TypeORM — toàn bộ filter dùng QB với raw column name (`deleted_at`, `created_at`) |

### Application — DTOs
| DTO | Fields |
|---|---|
| `CreateDepartmentDto` | name, address, description? |
| `UpdateDepartmentDto` | name?, address?, description? |
| `ListDepartmentsQueryDto` | extends PaginationQueryDto + name?, status?: `all\|active\|deleted` |
| `DepartmentDto` | id, name, address, description, **userCount**, **deleted** (bool), createdAt |

`toDepartmentDto(dept, userCount)` — hàm mapper export dùng chung giữa các handlers.

### Application — Handlers
- **`CreateDepartmentHandler`** — check trùng tên trong active depts (409), tạo entity, trả DTO với userCount=0
- **`UpdateDepartmentHandler`** — check tên mới không trùng dept khác (excludeId), cập nhật các field được gửi
- **`DeleteDepartmentHandler`** ⚠️ **CỐT LÕI** — `countActiveByDepartmentId > 0` → `ConflictException 409` với số nhân sự cụ thể
- **`RestoreDepartmentHandler`** — kiểm tra đang ở trạng thái deleted, `dept.restore()`, save
- **`ListDepartmentsHandler`** — paginated list + `Promise.all` để lấy `userCount` cho toàn bộ danh sách

### Presentation
- **`AdminDepartmentsController`** (`/api/admin/departments`) — 5 endpoint, tất cả `@Roles(ADMIN)`

---

## Quyết định kỹ thuật

### 1. DepartmentsModule imports UsersModule
Cần `IUserRepository.countActiveByDepartmentId()` cho:
- **DeleteDepartmentHandler** (kiểm tra còn nhân sự → chặn xóa)
- **ListDepartmentsHandler** (lấy `userCount` cho response)
- **UpdateDepartmentHandler**, **RestoreDepartmentHandler** (trả `userCount` trong response)

`UsersModule` → `DepartmentsModule` (1 chiều, không circular).

### 2. userCount — Promise.all (không N+1 tuần tự)
```typescript
const userCounts = await Promise.all(
  items.map(d => this.userRepo.countActiveByDepartmentId(d.id))
);
```
Tất cả query chạy song song. Với số phòng ban điển hình (<50) là đủ nhanh.

### 3. DepartmentStatusFilter — default = 'all'
Khi frontend không truyền `status`, list trả về **toàn bộ** phòng ban (cả active lẫn deleted). Truyền `status=active` để chỉ lấy chưa xóa, `status=deleted` để chỉ lấy đã xóa.

### 4. Phân trang giữ nguyên theo tiêu chuẩn backend
Dù frontend hiện tại chưa có UI phân trang, response vẫn tuân theo envelope chuẩn:
`{ data: DepartmentDto[], meta: { total, page, limit, totalPages } }`.
Frontend sẽ bổ sung pagination UI sau.

---

## API contracts — tương thích frontend

| Endpoint | Handler | Frontend mapping |
|---|---|---|
| `GET /admin/departments?page=1&limit=20&status=all` | ListDepartmentsHandler | `DEPARTMENTS` mock |
| `GET /admin/departments?status=active` | ListDepartmentsHandler | Filter "Hoạt động" |
| `GET /admin/departments?status=deleted` | ListDepartmentsHandler | Filter "Đã xóa" |
| `POST /admin/departments` | CreateDepartmentHandler | Dialog "Thêm phòng ban" |
| `PATCH /admin/departments/:id` | UpdateDepartmentHandler | Dialog "Sửa phòng ban" |
| `DELETE /admin/departments/:id` | DeleteDepartmentHandler | Nút Trash (disabled khi userCount>0) |
| `POST /admin/departments/:id/restore` | RestoreDepartmentHandler | Nút RotateCcw |

**Frontend field mapping:**
- `deleted: boolean` ← `deletedAt !== null` ✓
- `userCount: number` ← JOIN-count từ users table ✓
- `description: string` → có thể `null` ← dùng `d.description ?? ''` ở frontend

---

## Cách kiểm tra (manual test với Postman)

**Headers tất cả request:** `Authorization: Bearer <admin_token>`

### GET /api/admin/departments (phân trang + filter)
```
GET /api/admin/departments?page=1&limit=10&status=all
GET /api/admin/departments?status=active
GET /api/admin/departments?status=deleted
GET /api/admin/departments?name=kỹ thuật
```
→ `{ data: [...], meta: { total, page, limit, totalPages } }` — mỗi dept có `userCount` và `deleted`

### POST /api/admin/departments (tạo mới)
```json
{ "name": "Phòng Kỹ thuật Mới", "address": "Tầng 10, Tòa A", "description": "Mô tả" }
```
→ 201, trả dept mới với `userCount: 0`
→ POST lại với cùng tên → **409 Conflict**

### PATCH /api/admin/departments/:id (sửa)
```json
{ "name": "Tên mới", "address": "Địa chỉ mới" }
```
→ 200, dept updated

### DELETE /api/admin/departments/:id (xóa mềm)
- Dept có users → **409 Conflict** `"Không thể xóa phòng ban còn X nhân sự đang hoạt động"`
- Dept không có users → 200 `{ message: "Xóa phòng ban thành công" }`
- Kiểm tra pgAdmin: `deleted_at` được set, record vẫn còn

### POST /api/admin/departments/:id/restore (khôi phục)
→ 200, dept với `deleted: false`
→ Khôi phục dept đang active → **400 Bad Request**

---

## Trạng thái codebase sau Giai đoạn 4

```
✅ Module auth         — fully implemented
✅ Module users        — fully implemented
✅ Module departments  — fully implemented
⏳ Module meetings     — skeleton (Phase 5-7, trọng tâm MP2)
⏳ Module notifications — skeleton (Phase 8)
⏳ Module dashboard    — skeleton (Phase 9)
```

**Bước tiếp theo:** Giai đoạn 5 — Module `meetings` (REST cơ bản, không live streaming).
