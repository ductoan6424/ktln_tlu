# SPEC: He thong phan quyen base role + admin RBAC cho UniConnect

**Date:** 2026-04-22
**Status:** Draft
**Author:** Codex

---

## Context

He thong hien tai da co mot lop xac thuc co ban bang Supabase Auth va da luu role tren `UserProfile.role`. Tuy nhien co cau phan quyen van dang o muc khai bao, chua duoc thuc thi nhat quan trong route, layout hay server action.

Tinh trang codebase hien tai:

- `prisma/schema.prisma` da co enum `UserRole` va truong `UserProfile.role`
- `src/actions/auth.ts` ghi role mac dinh vao ca Prisma va `Supabase user_metadata`
- `src/middleware.ts` moi chi chan theo dang nhap, chua co RBAC
- `src/lib/auth/permissions.ts` da co helper role co ban, nhung chua duoc dung nhu mot he thong authorize that su
- `/admin` da co shell giao dien, nhung chua duoc bao ve boi permission that
- `/courses` da ton tai o muc UI, nhung chua co domain model rieng cho lop hoc

Yeu cau nghiep vu duoc chot trong buoi brainstorm:

1. He thong co 3 base role co dinh:
   - `STUDENT`
   - `LECTURER`
   - `ADMIN`
2. Moi tai khoan chi co mot base role duy nhat
3. RBAC chi ap dung cho khu vuc quan tri va van hanh trong `/admin`
4. Phan nghiep vu thong thuong khong dung RBAC:
   - sinh vien tao group va tuong tac noi dung
   - giang vien tao va quan ly lop hoc cua minh trong `/courses`
5. `Course` la mot thuc the rieng, khong dung chung voi `Group`
6. Chi `ADMIN` moi duoc:
   - cap / thu hoi base role cua user khac
   - gan / thu hoi admin role, admin permission cho user khac
7. Cac vai tro van hanh nhu "nhan vien quan ly lop hoc", "nhan vien quan ly bai dang cua truong" se khong la base role moi, ma se duoc mo hinh hoa bang admin RBAC

---

## Muc tieu

1. Chuan hoa he thong phan quyen thanh 2 lop ro rang:
   - base role cho nghiep vu thong thuong
   - admin RBAC cho `/admin`
2. Bao ve that su `/admin` o server-side, khong chi an nut tren UI
3. Giu cho business rule cua `/courses` va `/groups` doc lap voi admin RBAC
4. Tao mot nen tang mo rong duoc cho cac admin/staff permission trong tuong lai
5. Giu cho `ADMIN` la superuser duy nhat trong he thong

---

## Scope

### Trong pham vi

1. Chuan hoa `UserRole` thanh 3 base role
2. Thiet ke bang du lieu RBAC cho admin area
3. Thiet ke helper authorize trung tam cho:
   - dang nhap
   - base role
   - admin permission
4. Chan truy cap `/admin` theo permission that
5. Chan cac admin action nhay cam o server-side
6. Thiet ke domain `Course` rieng va business rule quan ly lop hoc cua giang vien

### Ngoai pham vi

- Field-level permission
- Audit log chi tiet
- UI day du cho viec tu cau hinh permission matrix phuc tap
- RBAC cho nghiep vu thong thuong ngoai admin area
- Permission phan tan theo tung club, tung group, tung course ngoai business rule co san

---

## Nguyen tac kien truc

### 1. Tach base role va admin RBAC

Base role tra loi cau hoi:

- user nay la sinh vien, giang vien hay quan tri vien?

Admin RBAC tra loi cau hoi:

- user nay co duoc vao `/admin` khong?
- neu vao duoc thi duoc quan ly module nao?
- co duoc xem, sua, kiem duyet hay phan quyen hay khong?

Hai lop nay phai tach nhau de:

- tranh lam enum role bi phong to
- tranh de business rule thong thuong bi phu thuoc vao permission matrix
- giu he thong de doc, de mo rong va de debug

### 2. RBAC chi dung cho admin area

RBAC se chi duoc ap dung cho:

- `/admin`
- cac server action admin
- cac module quan tri lien quan den van hanh he thong

RBAC khong duoc dung cho:

- tao group cua sinh vien
- quan ly lop hoc cua giang vien trong `/courses`
- quyen dang bai, comment, like thong thuong

### 3. `ADMIN` la superuser duy nhat

`ADMIN` la role dac biet:

- bypass toan bo admin permission
- duoc vao tat ca module admin
- la role duy nhat duoc doi base role cua nguoi khac
- la role duy nhat duoc gan / thu hoi admin role cho nguoi khac

Khong mo hinh hoa quyen "cap role" bang permission thong thuong de tranh leo thang dac quyen ngoai y muon.

### 4. Business rule theo ngu canh van duoc uu tien

`Course`, `Group`, `Club` va cac thuc the nghiep vu se co quy tac rieng theo ngu canh:

- giang vien quan ly lop hoc cua minh
- sinh vien tao va quan ly group cua minh
- quyen quan ly club dua tren `ClubMember.role`

Nhung quy tac nay khong bi thay the boi admin RBAC.

---

## Muc tieu nghiep vu theo base role

### `STUDENT`

La user thong thuong, co cac quyen:

- dang bai viet
- comment
- like
- tao group sinh vien
- tham gia group
- su dung cac tinh nang cong dong thong thuong cua he thong

Khong co quyen:

- tao lop hoc
- vao `/admin` neu khong duoc gan admin RBAC

### `LECTURER`

Co toan bo quyen cua `STUDENT`, dong thoi co them:

- tao `Course`
- quan ly `Course` ma minh tao / so huu
- them sinh vien vao lop hoc dua tren `studentId`
- quan ly group lop hoc hoac khong gian lien quan den lop do theo business rule sau nay

Khong mac dinh co quyen vao `/admin` neu khong duoc gan admin RBAC.

### `ADMIN`

Co toan quyen tren du an:

- full access admin area
- full access business domain khi can
- cap / thu hoi base role
- cap / thu hoi admin role va permission

---

## Kien truc admin RBAC

### Muc tieu

RBAC admin duoc thiet ke theo mo hinh:

- permissions
- admin roles
- gan admin role cho user

Khong uu tien gan permission truc tiep len user ngay phase dau vi:

- kho quan ly
- kho tai su dung
- tang chi phi van hanh

### Cac thanh phan

#### 1. `AdminPermission`

Dung de mo ta cac quyen atomic trong admin area.

Vi du:

- `admin.access`
- `admin.users.read`
- `admin.users.manage`
- `admin.posts.moderate`
- `admin.courses.manage`
- `admin.subjects.manage`
- `admin.groups.manage`
- `admin.events.manage`
- `admin.analytics.read`
- `admin.announcements.manage`

Moi permission nen co:

- `code`
- `module`
- `description`
- `createdAt`
- `updatedAt`

#### 2. `AdminRole`

La bo quyen tai su dung duoc.

Vi du:

- `COURSE_MANAGER`
- `POST_MODERATOR`
- `ANNOUNCEMENT_MANAGER`
- `USER_AUDITOR`

Moi admin role nen co:

- `code`
- `name`
- `description`
- `isSystem`
- `createdAt`
- `updatedAt`

#### 3. `AdminRolePermission`

Bang noi nhieu-nhieu giua `AdminRole` va `AdminPermission`.

Muc dich:

- cho phep 1 admin role co nhieu permission
- 1 permission duoc tai su dung cho nhieu admin role

#### 4. `UserAdminRole`

Bang gan admin role cho user.

Moi record nen co:

- `userId`
- `adminRoleId`
- `grantedBy`
- `grantedAt`

Co the mo rong ve sau voi:

- `expiresAt`
- `revokedAt`
- `note`

---

## De xuat schema du lieu

### 1. Chuan hoa `UserRole`

Enum `UserRole` duoc chot thanh:

```prisma
enum UserRole {
  STUDENT
  LECTURER
  ADMIN
}
```

`CLUB_ADMIN` se bi loai bo khoi global role vi day la quyen theo ngu canh club, khong phai role toan he thong.

### 2. `Course` la thuc the rieng

Can them model `Course` rieng trong Prisma thay vi dung `Group`.

Muc tieu nghiep vu cua `Course`:

- chi giang vien hoac admin moi tao duoc
- moi lop hoc co chu so huu ro rang
- sinh vien duoc them vao lop theo `studentId`
- route `/courses` va route con se tro thanh noi quan ly lop hoc cua giang vien

Toi thieu, `Course` can co:

- `id`
- `name`
- `code`
- `slug`
- `description`
- `lecturerId`
- `createdAt`
- `updatedAt`
- `deletedAt`

Va can them bang thanh vien lop, vi du `CourseMember`:

- `courseId`
- `userId`
- `joinedAt`

Neu can phan biet vai tro trong lop ve sau, co the them `role` o bang nay, nhung phase dau khong can over-engineer.

### 3. Prisma models de xuat cho admin RBAC

Huong du lieu de xuat:

```prisma
model AdminPermission {
  id          String   @id @default(cuid())
  code        String   @unique
  module      String
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  adminRolePermissions AdminRolePermission[]
}

model AdminRole {
  id          String   @id @default(cuid())
  code        String   @unique
  name        String
  description String?
  isSystem    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  adminRolePermissions AdminRolePermission[]
  userAdminRoles       UserAdminRole[]
}

model AdminRolePermission {
  adminRoleId       String
  adminPermissionId String

  adminRole       AdminRole       @relation(fields: [adminRoleId], references: [id], onDelete: Cascade)
  adminPermission AdminPermission @relation(fields: [adminPermissionId], references: [id], onDelete: Cascade)

  @@id([adminRoleId, adminPermissionId])
}

model UserAdminRole {
  userId      String
  adminRoleId String
  grantedBy   String?
  grantedAt   DateTime @default(now())

  user      UserProfile @relation("UserAdminRoles", fields: [userId], references: [userId], onDelete: Cascade)
  adminRole AdminRole   @relation(fields: [adminRoleId], references: [id], onDelete: Cascade)
  grantedByUser UserProfile? @relation("AdminRoleGrantedBy", fields: [grantedBy], references: [userId], onDelete: SetNull)

  @@id([userId, adminRoleId])
}
```

`UserProfile` se can duoc bo sung relation:

- `userAdminRoles`
- `grantedAdminRoles`

Ten relation duoc chot theo y nghia ro rang:

- `UserAdminRoles`: cac admin role dang gan cho user
- `AdminRoleGrantedBy`: lich su user cap admin role cho nguoi khac

---

## Nguon su that cho authorize

### Prisma la nguon su that cuoi cung

Role va permission khi authorize phai doc tu Prisma truoc.

Supabase `user_metadata` van can giu lai de:

- render nhanh tu session
- dong bo voi auth state

Nhung `user_metadata` khong duoc coi la nguon su that cuoi cung cho admin authorize vi:

- de lech trang thai voi database
- kho cap nhat union permission
- middleware / session cache de bi stale

### Quy tac dong bo

Khi thay doi `UserProfile.role`:

- update Prisma
- update `Supabase user_metadata.role`

Khi thay doi `UserAdminRole`:

- chi can update Prisma
- khong can day tat ca permission vao `user_metadata`

---

## Luong kiem tra quyen

### 1. `middleware.ts`

`src/middleware.ts` se tiep tuc chi lam nhiem vu auth gate:

- chua dang nhap thi da ve `/login`
- da dang nhap thi cho vao app

Khong dua RBAC Prisma vao middleware.

Ly do:

- middleware can nhe
- RBAC thay doi thuong xuyen hon base session
- de gay stale permission neu dua qua nhieu logic vao middleware

### 2. `admin` server layout la cong chan that

`src/app/admin/layout.tsx` can duoc doi thanh server-side authorization gate.

Luong xu ly:

1. lay current user
2. lay `UserProfile`
3. neu role la `ADMIN` thi cho vao
4. neu khong phai `ADMIN` thi resolve admin permissions tu Prisma
5. neu user khong co `admin.access` thi redirect ra khoi admin
6. neu co quyen thi moi render admin shell

Nen tach thanh:

- server layout de authorize
- mot client shell rieng de quan ly breadcrumb, sidebar, drawer, search

### 3. Page va server action phai chan them permission chi tiet

Khong chi tin vao viec vao duoc `/admin`.

Moi module admin can kiem tra them quyen rieng:

- page danh sach user: `admin.users.read`
- action sua user: `admin.users.manage`
- action kiem duyet bai dang: `admin.posts.moderate`
- page analytics: `admin.analytics.read`

### 4. Hanh dong nhay cam chi `ADMIN` duoc lam

Khong bieu dien bang permission thuong cho:

- doi `UserProfile.role`
- gan / thu hoi `UserAdminRole`

Hai nhom thao tac nay phai co guard server-side kieu:

- `requireAdminRole()`
- hoac check truc tiep `profile.role === "ADMIN"`

### 5. `/courses` khong dung admin RBAC

Phan quan ly lop hoc cua giang vien nam trong `/courses` va route con.

Quyen se duoc xac dinh boi:

- base role
- ownership cua course

Quy tac chot:

- tao course: `LECTURER` hoac `ADMIN`
- vao khu quan ly course: lecturer so huu course do hoac `ADMIN`
- sinh vien khong vao duoc khu quan ly course
- user co admin permission staff nhung khong phai owner course thi khong tu dong co quyen quan ly course trong `/courses`

Dieu nay giup tach bach:

- admin RBAC cua van hanh he thong
- business rule cua nghiep vu giang day

### 6. `Group` va `Club` giu business rule rieng

- `Group`: sinh vien tao va quan ly theo business rule group
- `Club`: quyen quan ly dua tren `ClubMember.role`

Khong nang cac quy tac nay thanh global RBAC.

---

## He thong helper authorize de xuat

Can co mot lop helper ro rang, thay vi de moi route va action tu doc role theo cach rieng.

### Nhom helper co ban

- `requireAuth()`
- `getCurrentUserProfile()`
- `requireBaseRole(allowedRoles)`

### Nhom helper admin

- `getAuthorizationContext()`
- `requireAdminAccess()`
- `requireAdminPermission(permissionCode)`
- `requireSystemAdmin()` hoac `requireAdminBaseRole()`

### `AuthorizationContext`

Nen co mot cau truc trung tam gom:

- `user`
- `profile`
- `baseRole`
- `isAdmin`
- `adminRoleCodes`
- `permissionCodes`

Muc tieu:

- moi page / action dung chung nguon context
- tranh query chong cheo
- de test

---

## Permission map de xuat cho admin area

Phase dau co the seed tap permission he thong nhu sau:

### Quyen nen

- `admin.access`

### Users

- `admin.users.read`
- `admin.users.manage`

### Posts / moderation

- `admin.posts.moderate`

### Courses

- `admin.courses.manage`

### Subjects

- `admin.subjects.manage`

### Groups

- `admin.groups.manage`

### Events

- `admin.events.manage`

### Announcements

- `admin.announcements.manage`

### Analytics

- `admin.analytics.read`

Quy tac cap quyen:

- user non-admin can vao `/admin` thi phai co `admin.access`
- tung module kiem tra them permission theo module do
- `ADMIN` bypass tat ca

---

## Admin role bundle de xuat

He thong can duoc seed mot vai admin role mau de su dung ngay:

### `COURSE_MANAGER`

Permissions:

- `admin.access`
- `admin.courses.manage`

### `POST_MODERATOR`

Permissions:

- `admin.access`
- `admin.posts.moderate`

### `ANNOUNCEMENT_MANAGER`

Permissions:

- `admin.access`
- `admin.announcements.manage`

### `USER_AUDITOR`

Permissions:

- `admin.access`
- `admin.users.read`

Neu can sua user that su o admin, co the co role khac:

### `USER_MANAGER`

Permissions:

- `admin.access`
- `admin.users.read`
- `admin.users.manage`

---

## Error handling

### User chua dang nhap

- middleware redirect ve `/login`

### User da dang nhap nhung khong duoc vao admin

- redirect ve `/feed`
- trang `403` khong nam trong phase 1 cua spec nay

### User vao duoc admin nhung thieu quyen module

- page hoac action nem `AuthError("Ban khong co quyen thuc hien hanh dong nay")`

### User khong phai `ADMIN` nhung co gang doi base role / gan RBAC

- chan cung o server action
- khong phu thuoc vao UI

---

## Testing strategy

Can test theo 4 lop:

### 1. Base role tests

Vi du:

- `tests/auth/base-role.test.ts`

Xac minh:

- `STUDENT`, `LECTURER`, `ADMIN` duoc resolve dung
- helper base role chan dung cac route nghiep vu

### 2. Admin RBAC tests

Vi du:

- `tests/auth/admin-rbac.test.ts`

Xac minh:

- `ADMIN` bypass tat ca
- user co `admin.access` vao duoc `/admin`
- user co `admin.users.read` nhung khong co `admin.users.manage` thi khong sua duoc user

### 3. Admin guard tests

Vi du:

- `tests/auth/admin-guards.test.ts`

Xac minh:

- `requireAdminAccess()`
- `requireAdminPermission()`
- `requireSystemAdmin()`
- truong hop thieu profile
- truong hop thieu permission
- truong hop user co nhieu admin role va union permission dung

### 4. Course permission tests

Vi du:

- `tests/courses/course-permissions.test.ts`

Xac minh:

- chi `LECTURER` hoac `ADMIN` tao duoc course
- chi lecturer owner cua course hoac `ADMIN` vao duoc route quan ly course
- staff co admin permission nhung khong so huu course khong tu dong co quyen manage course trong `/courses`

---

## Migration path

De xuat luong migration an toan:

1. Chuan hoa `UserRole` thanh:
   - `STUDENT`
   - `LECTURER`
   - `ADMIN`
2. Them model `Course` va `CourseMember`
3. Them cac bang admin RBAC:
   - `AdminPermission`
   - `AdminRole`
   - `AdminRolePermission`
   - `UserAdminRole`
4. Seed permission he thong ban dau
5. Seed admin role mau
6. Refactor helper auth de doc role tu Prisma truoc
7. Chuyen `/admin/layout.tsx` thanh server-side authorization gate
8. Them page/action level guards cho admin modules
9. Sau cung moi mo rong UI de admin cap phat role va admin role

---

## File changes du kien

### Modify

- `prisma/schema.prisma`
- `src/actions/auth.ts`
- `src/lib/auth/types.ts`
- `src/lib/auth/permissions.ts`
- `src/middleware.ts`
- `src/app/admin/layout.tsx`

### Create

- `prisma/migrations/*`
- `prisma/seed/*` hoac file seed hien hanh neu du an da co quy uoc
- `src/lib/auth/authorization.ts`
- `src/lib/auth/admin-rbac.ts`
- `src/lib/auth/base-role.ts`
- `tests/auth/base-role.test.ts`
- `tests/auth/admin-rbac.test.ts`
- `tests/auth/admin-guards.test.ts`
- `tests/courses/course-permissions.test.ts`

Tep va ten cu the co the tinh chinh khi viet implementation plan, nhung cac boundary tren can duoc giu on dinh.

---

## Rui ro va cach tranh

### Rui ro 1: Lech role giua Prisma va Supabase metadata

Cach tranh:

- Prisma la nguon su that
- moi luong doi base role phai update dong thoi ca Prisma va Supabase metadata

### Rui ro 2: Nhet qua nhieu logic vao middleware

Cach tranh:

- middleware chi auth gate
- RBAC that su xu ly o server layout va server actions

### Rui ro 3: Enum role lai bi phong to tro lai

Cach tranh:

- giu enum chi co `STUDENT | LECTURER | ADMIN`
- moi nhu cau van hanh moi di qua admin RBAC

### Rui ro 4: Tron admin RBAC voi business rule

Cach tranh:

- `/courses` dung base role + ownership
- `/groups` dung business rule group
- `/clubs` dung membership role

---

## Verification

He thong duoc coi la dat spec khi:

1. `/admin` khong con la khu vuc chi can dang nhap la vao duoc
2. User non-admin chi vao duoc `/admin` khi co `admin.access`
3. Module admin duoc chan theo permission chi tiet o page va action
4. `ADMIN` la role duy nhat co quyen doi base role va gan admin role
5. `Course` la thuc the rieng, doc lap voi `Group`
6. Giang vien quan ly lop hoc cua minh trong `/courses`, khong di qua admin RBAC
7. Test base role, admin RBAC va course permission pass

---

## Quyet dinh chot

1. Base role cua he thong la `STUDENT | LECTURER | ADMIN`
2. Moi tai khoan chi co mot base role
3. RBAC chi ap dung cho admin area va se tiep tuc nhu vay ve sau
4. `ADMIN` la superuser duy nhat
5. Cac vai tro staff duoc mo hinh hoa bang admin RBAC, khong tao them base role moi
6. `Course` la domain rieng, khong dung chung voi `Group`
7. Business rule cua `/courses` duoc tach khoi admin RBAC
8. `/admin` phai duoc chan o server-side, khong chi bang UI
