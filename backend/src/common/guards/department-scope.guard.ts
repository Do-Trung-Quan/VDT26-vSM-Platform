import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

/**
 * CỐT LÕI: ép giới hạn dữ liệu theo department_id của User hiện tại.
 * Admin được bỏ qua (xem toàn hệ thống). Guard chỉ đánh dấu phạm vi truy vấn lên request;
 * việc lọc theo department_id thực thi tại query handler/repository (application/infrastructure).
 */
@Injectable()
export class DepartmentScopeGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const { user } = request;
    if (!user) {
      return false;
    }

    request.departmentScope = user.role === 'ADMIN' ? null : user.departmentId;
    return true;
  }
}
