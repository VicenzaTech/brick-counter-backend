## Tổng quan Auth & RBAC

Tài liệu này mô tả các API auth, cách dùng các guard (`AuthGuard`, `SessionGuard`, `PermissionGuard`) và decorator `@Permission` trong hệ thống.

---

## 1. Các API auth

### 1.1 `POST /auth/login`

- Body (`LoginDTO`):
  ```json
  {
    "identifier": "email hoặc username",
    "password": "mật khẩu"
  }
  ```
- Xử lý:
  - Xác định `identifier` là email hay username, chuyển lowercase.
  - Tìm user bằng:
    - `UsersService.findOneByEmail` hoặc `UsersService.findOneByUsername`.
  - So sánh mật khẩu với `passwordHash` bằng `Hasher`.
  - Kiểm tra `isActive`.
  - Tạo payload JWT `IJWTPayload = { id, email, username }`.
  - Sinh cặp token:
    - `accessToken`: ký bằng `JWT_ACCESS_SECRET`, TTL `JWT_ACCESS_EXPIRES`.
    - `refreshtoken`: ký bằng `JWT_REFRESH_SECRET`, TTL `JWT_REFRESH_EXPIRES`.
  - Tạo session bằng `SessionService.createSession` (chứa `userId`, `refreshToken`, `ttlSeconds`, `ip`, `userAgent`).
  - Lấy roles/permissions từ `UsersService.findUserRolesAndPermissions(user.id)` (đã cache Redis + in-memory).
- Response:
  ```jsonc
  {
    "tokens": {
      "accessToken": "...",
      "refreshtoken": "..."
    },
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "username": "username",
      "roles": ["operator", "admin", "superadmin"],
      "permissions": ["brick-type.read", "production.update", "..."]
    },
    "sessionId": "uuid"
  }
  ```
- Cookies:
  - `x-refresh`: refresh token (HTTP-only).
  - `x-session-id`: session id (HTTP-only).

### 1.2 `POST /auth/refresh`

- Guard: `@UseGuards(SessionGuard)`.
- SessionGuard:
  - Đọc cookies `x-refresh` và `x-session-id`.
  - Verify refresh token bằng `JWT_REFRESH_SECRET`.
  - Verify session bằng `SessionService.verifyRefreshToken(sessionId, refreshToken)`:
    - Kiểm tra tồn tại, TTL, `revoked`.
  - Tìm user bằng `UsersService.findOne(payload.id)`, check `isActive`.
  - Gắn vào `req`: `user`, `refreshToken`, `sessionId`.
- AuthService.refresh:
  - Tạo payload mới `IJWTPayload` từ `user` (id/email/username).
  - Tạo cặp token mới qua `generateTokenPair`.
  - Lấy `roles`, `permissions` bằng `findUserRolesAndPermissions(user.id)`.
  - Cập nhật refresh token trong session (`updateRefreshToken`).
- Response:
  ```jsonc
  {
    "tokens": { "accessToken": "...", "refreshtoken": "..." },
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "username": "username",
      "roles": ["..."],
      "permissions": ["..."]
    },
    "sessionId": "uuid"
  }
  ```

### 1.3 `POST /auth/logout`

- Guard: `@UseGuards(SessionGuard)`.
- Lấy `sessionId` từ `req`, gọi `AuthService.logout(sessionId)`:
  - `SessionService.revokeSession(sessionId)`.
- Xoá cookies `x-refresh` và `x-session-id`.
- Response:
  ```json
  { "sessionId": "uuid" }
  ```

### 1.4 `GET /auth/me`

- Guard: `@UseGuards(AuthGuard)`.
  - Đọc `Authorization: Bearer <accessToken>`.
  - Verify bằng `JWT_ACCESS_SECRET`.
  - Giải mã payload `IJWTPayload`, tìm user bằng `UsersService.findOne(payload.id)`.
  - Kiểm tra `isActive`, gắn `req.user`.
- AuthService.me(user):
  - Gọi `UsersService.findUserRolesAndPermissions(user.id)`.
  - Response:
    ```jsonc
    {
      "user": {
        "id": "uuid",
        "email": "user@example.com",
        "username": "username",
        "roles": ["..."],
        "permissions": ["..."]
      }
    }
    ```
- Ghi chú: `/auth/me` trả về cùng cấu trúc `user` như login/refresh, nhưng **không** trả `tokens` và `sessionId`.

---

## 2. Guards

### 2.1 `AuthGuard`

- File: `src/auth/guard/auth/auth.guard.ts`.
- Mục đích:
  - Bảo vệ các API dựa trên access token.
  - Gắn `req.user` là entity `User` tương ứng với token.
- Cách dùng:
  ```ts
  @UseGuards(AuthGuard)
  @Get('profile')
  getProfile(@Req() req) {
    return req.user;
  }
  ```

### 2.2 `SessionGuard`

- File: `src/auth/guard/session/session.guard.ts`.
- Mục đích:
  - Bảo vệ các API sử dụng refresh token + session (refresh, logout).
  - Đảm bảo session trong Redis hợp lệ và chưa bị revoke.
- Cách dùng:
  ```ts
  @UseGuards(SessionGuard)
  @Post('refresh')
  refresh(@Req() req) {
    return this.authService.refresh(req.user, req.refreshToken, req.sessionId);
  }
  ```

### 2.3 `PermissionGuard` và decorator `@Permission`

- Decorator: `src/auth/decorator/permission/permission.decorator.ts`
  ```ts
  export const REQUIRED_PERMISSION_DECORATOR = 'permission';
  export const Permission = (...args: string[]) =>
    SetMetadata(REQUIRED_PERMISSION_DECORATOR, args);
  ```

- Guard: `src/auth/guard/permission/permission.guard.ts`
  - Lấy danh sách quyền yêu cầu từ metadata (`@Permission(...)`) ở method/class.
  - Nếu không khai báo permission → cho qua.
  - Lấy `req.user.id`, gọi `UsersService.findUserPermissions(userId)` (đã cache).
  - Nếu user không có ít nhất 1 quyền trong list → `ForbiddenException('Permission denied')`.

- Cách dùng:
  ```ts
  import { PERMISSIONS } from 'src/users/permission.constant';
  import { Permission } from 'src/auth/decorator/permission/permission.decorator';
  import { AuthGuard } from 'src/auth/guard/auth/auth.guard';
  import { PermissionGuard } from 'src/auth/guard/permission/permission.guard';

  @UseGuards(AuthGuard)
  @Controller('brick-types')
  export class BrickTypesController {
    @Put(':id/activate')
    @UseGuards(AuthGuard, PermissionGuard)
    @Permission(PERMISSIONS.BRICK_TYPE_UPDATE)
    setActive(...) { ... }
  }
  ```

---

## 3. Permission constants & seed RBAC

### 3.1 `PERMISSIONS` & `PERMISSION_GROUPS`

- File: `src/users/permission.constant.ts`.
- `PERMISSIONS`:
  - Định nghĩa rõ ràng từng quyền theo domain:
    - `user.*`, `role.*`, `workshop.*`, `production-line.*`, `position.*`,
      `device.*`, `production.*`, `brick-type.*`,
      `production-metric.*`, `quota-target.*`, `maintenance-log.*`.
  - Mỗi domain tách CRUD:
    - `*.read`, `*.create`, `*.update`, `*.delete`, kèm một số flag như `user.disable`.
- `PERMISSION_GROUPS`:
  - Gom các quyền manage: `USER_MANAGE`, `ROLE_MANAGE`, `WORKSHOP_MANAGE`, `BRICK_TYPE_MANAGE`, v.v.
  - Ví dụ:
    ```ts
    PERMISSION_GROUPS.BRICK_TYPE_MANAGE = [
      PERMISSIONS.BRICK_TYPE_READ,
      PERMISSIONS.BRICK_TYPE_CREATE,
      PERMISSIONS.BRICK_TYPE_UPDATE,
      PERMISSIONS.BRICK_TYPE_DELETE,
    ];
    ```

### 3.2 Seed RBAC

- File: `scripts/seed-rbac-data.js`.
- Hành vi:
  - Xoá sạch dữ liệu RBAC cũ:
    - `user_roles`, `role_permissions`, `roles`, `permissions`.
  - Seed lại `permissions` theo `PERMISSION_DEFINITIONS`.
  - Seed các role:
    - `superadmin`: full tất cả permission.
    - `admin`: các nhóm `*_MANAGE` cho toàn bộ domain.
    - `operator`: chủ yếu quyền read + một số quyền update/ghi sản xuất & thống kê.
  - Gán quyền cho role qua `role_permissions`.
  - Seed user mặc định:
    - `superadmin`, `admin`, `operator` (password: `admin123`).
    - `ON CONFLICT (username) DO UPDATE ...` để chạy lại script nhiều lần.
  - Gán role cho user qua `user_roles`.

---

Tài liệu này là tổng quan nhanh để hiểu và sử dụng các API auth, guard và permission trong hệ thống. Khi bổ sung domain hoặc quyền mới, hãy cập nhật `permission.constant.ts`, script seed RBAC và bổ sung mô tả tại đây. 
