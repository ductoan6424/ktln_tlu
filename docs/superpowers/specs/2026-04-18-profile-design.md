# SPEC: Hoan thien User Profile bang du lieu thuc

**Date:** 2026-04-18
**Status:** Draft
**Author:** Codex

---

## Context

Trang profile hien tai moi hoan thanh mot phan:

- Da doc du lieu thuc tu `user_profiles` cho `displayName`, `avatarUrl`, `major`, `year`, `bio`
- Card `AcademicProgressCard` dang hardcode `credits`, `GPA`, `Dean's List`
- Chi co route profile cho chinh chu o `src/app/(main)/profile/page.tsx`
- Chua co route xem ho so nguoi khac
- Chua co loading state chuyen biet cho profile

Project can nang cap profile theo huong social network quen thuoc, uu tien bo cuc de quet thong tin nhanh, nhat quan voi feed page va co the tham chieu pattern cua Facebook profile: cover/header lon, thong tin tom tat ben trai, bai viet o cot chinh, tabs don gian, uu tien thong tin ca nhan + hoat dong.

**Muc tieu:** Xay dung profile cua chinh chu va profile nguoi khac bang du lieu thuc hien co trong schema Prisma, giu duoc privacy rule, bo cuc dong nhat, skeleton loading day du, va khong dung du lieu academic gia.

---

## Scope

**Trong pham vi:**
1. Giữ ` /profile ` cho chinh chu
2. Them ` /profile/[userId] ` cho profile nguoi khac
3. Thay block academic hardcode bang thong tin thuc trong truong
4. Hien thong tin co ban, thong ke xa hoi, CLB/nhom, bai viet
5. Skeleton loading cho ca 2 route
6. Privacy filtering cho profile nguoi khac
7. Tai su dung component hien co toi da

**Ngoai pham vi:**
- Them schema hoc tap moi cho GPA, tin chi, academic transcript
- Chinh sua luong settings/profile edit
- Tao vanity route theo `username`
- Them hanh dong ket ban / nhan tin moi tren profile
- Thay doi logic visibility phuc tap hon ngoai `PUBLIC`/`own posts`

---

## Nguon du lieu thuc duoc phep dung

### Tu `UserProfile`

- `userId`
- `displayName`
- `username`
- `avatarUrl`
- `bio`
- `studentId`
- `role`
- `major`
- `year`
- `createdAt`

### Tu quan he khac

- `Friendship` de tinh tong so ban be va preview ket noi
- `Post` de tinh so bai viet va render danh sach bai viet
- `ClubMember` + `Club` de lay danh sach CLB va thong ke
- `GroupMember` + `Group` de lay danh sach nhom va thong ke

### Khong duoc dung nua tren profile

- `credits`
- `totalCredits`
- `gpa`
- `deansListCount`

Ly do: schema hien tai khong co nguon du lieu academic thuc cho cac field nay.

---

## Route va che do hien thi

### 1. Route cua chinh chu

`/profile`

- Yeu cau dang nhap
- Lay `viewerId` tu session Supabase
- `profileUserId = viewerId`
- Hien `isOwnProfile = true`

### 2. Route cua nguoi khac

`/profile/[userId]`

- Co the yeu cau dang nhap neu toan bo app dang la private social network
- `viewerId` van lay tu session neu co
- `profileUserId` lay tu params
- Hien `isOwnProfile = viewerId === profileUserId`

### 3. Dinh huong URL

Giai doan nay su dung `userId` lam route key vi:

- `username` hien tai nullable
- Chua co luong dam bao uniqueness + completion cho username
- `userId` da on dinh va co san trong schema

Ve sau co the them vanity URL theo `username`, nhung khong thuoc scope spec nay.

---

## Privacy rule

### Chinh chu (`isOwnProfile = true`)

Duoc hien:

- `displayName`
- `username`
- `avatarUrl`
- `bio`
- `studentId`
- `major`
- `year`
- `role`
- `createdAt`
- toan bo thong ke cua minh
- danh sach CLB/nhom
- bai viet cua minh chua bi xoa
- composer dang bai
- nut sua ho so

### Nguoi khac (`isOwnProfile = false`)

Duoc hien cong khai an toan:

- `displayName`
- `username` neu co
- `avatarUrl`
- `bio`
- `studentId`
- `major`
- `year`
- `role` duoi dang nhan de doc duoc, chi hien khi khac `STUDENT`
- `createdAt` duoi dang "Tham gia tu ..."
- thong ke cong khai
- danh sach CLB/nhom
- bai viet `PUBLIC`

Khong duoc hien:

- `email`
- so dien thoai
- token, session, metadata auth
- thong tin nhay cam khac khong nam trong DTO cong khai

Nguyen tac: page khong truyen raw Prisma object xuong component. Tat ca du lieu cho profile nguoi khac phai di qua privacy filter truoc khi render.

---

## Kien truc data flow

### Muc tieu kien truc

Khong de `page.tsx` tu query manh mun theo tung block UI. Thay vao do, gom tat ca business rule vao mot loader dung chung cho ca 2 route.

### De xuat

Tao mot module loader dung chung:

`src/app/(main)/profile/profile-page-data.ts`

Module nay se xuat ra:

```ts
interface ProfilePageData {
  isOwnProfile: boolean
  viewerId: string | null
  profileUserId: string
  profile: {
    displayName: string
    username: string | null
    avatarUrl: string | null
    bio: string | null
    studentId: string | null
    major: string | null
    year: number | null
    role: string | null
    joinedAt: Date
  }
  stats: {
    friendsCount: number
    postsCount: number
    clubsCount: number
    groupsCount: number
  }
  previewConnections: Array<{
    userId: string
    displayName: string
    avatarUrl: string | null
  }>
  clubs: Array<{
    id: string
    name: string
    slug: string
    role: string
  }>
  groups: Array<{
    id: string
    name: string
    slug: string
    role: string
  }>
  posts: Array<{
    id: string
    content: string
    imageUrl: string | null
    visibility: string
    createdAt: string
    authorId: string
    authorDisplayName: string
    authorAvatarUrl: string | null
    likes: number
    comments: number
    isLiked: boolean
  }>
}
```

### Luong xu ly

1. Route lay session Supabase
2. Xac dinh `viewerId`
3. Xac dinh `profileUserId`
4. Goi `getProfilePageData({ viewerId, profileUserId })`
5. Loader query Prisma, filter privacy, map DTO
6. Page render UI theo `isOwnProfile`

---

## Query rules

### 1. Profile basic info

Query `prisma.userProfile.findUnique` theo `profileUserId` va reject neu record bi soft-delete.

Neu khong ton tai:

- `notFound()`

### 2. Friends count + preview

Friends count:

- Dem tat ca `Friendship` co `status = APPROVED`
- Dieu kien `requesterId = profileUserId OR addresseeId = profileUserId`

Preview connections:

- Lay toi da 5 ket noi
- Lay rieng `totalCount` bang query `count`, khong dung `preview.length`

### 3. Clubs va groups

CLB:

- Query `clubMemberships`
- Join sang `club`
- Loai record cua CLB da bi soft-delete

Nhom:

- Query `groupMemberships`
- Join sang `group`
- Loai record cua nhom da bi soft-delete

### 4. Posts

Neu chinh chu:

- Lay post cua `authorId = profileUserId`
- `deletedAt = null`
- Khong filter theo `visibility`

Neu nguoi khac:

- Lay post cua `authorId = profileUserId`
- `deletedAt = null`
- `visibility = PUBLIC`

Post DTO can dong bo voi pattern feed de tai su dung `PostCard`.

### 5. Social stats

`friendsCount`, `postsCount`, `clubsCount`, `groupsCount`

Tat ca la so lieu thuc suy ra tu schema hien tai.

### 6. Current user context cho bai viet

Neu `viewerId` co mat:

- Xac dinh `isLiked` cua moi post theo viewer

Neu khong:

- `isLiked = false`

---

## UI va bo cuc

### Huong thiet ke

Giao dien phai dong nhat voi social profile quen thuoc:

- Header profile lon de nhan dien ngay nguoi dung
- Cot trai cho thong tin tom tat va social summary
- Cot chinh cho tabs va bai viet
- Nhip spacing, card shape, avatar, type scale phai khop voi design system hien tai

Co the tham chieu pattern bo cuc cua Facebook profile:

- cover/header lon
- thong tin co ban + actions ngay duoi header
- summary ben trai, feed ben phai
- tabs don gian, dung quen thuoc

Khong copy nguyen xi visual language cua Facebook. Chi muon lay logic bo cuc va thu tu uu tien thong tin.

### Desktop

```text
[Cover/Header]
[Avatar + Name + Bio + actions]
[Stats row]

[Left column]
- Thong tin trong truong
- Ket noi
- CLB/Nhom

[Main column]
- Tabs: Tong quan | Bai viet | CLB & Nhom
- Composer (chi voi chinh chu)
- Danh sach bai viet
```

### Mobile

1. Header
2. Stats row
3. Tabs
4. Composer (neu la chinh chu)
5. Posts
6. Thong tin / ket noi / CLB / nhom

Khong de sidebar desktop bi sap xep vo nghia tren mobile. Uu tien bai viet som hon o mobile.

---

## Component strategy

### Tai su dung va mo rong

#### `ProfileHeader`

Mo rong de nhan them:

- `bio`
- `username`
- `studentId`
- stats ngan
- `isOwnProfile`

Actions:

- Chinh chu: `Sua ho so`, `Sua anh bia` neu co scope
- Nguoi khac: `Chia se`

#### `ConnectionsGrid`

Sua de nhan:

- `connections`
- `totalCount`
- `isOwnProfile` de doi label va action cho dung mode

Khong de `totalCount = connections.length`.

#### `AcademicProgressCard`

Khong con phu hop. Se duoc thay bang card moi:

- `ProfileOverviewCard`

Card nay hien:

- `studentId`
- `major`
- `year`
- `role`
- `joinedAt`
- `clubsCount`
- `groupsCount`
- `postsCount`

Tat ca la du lieu thuc.

#### `PostCard`

Tai su dung de render bai viet profile.

`profile-posts-section.tsx` se map `ProfilePageData.posts` sang props hien tai cua `PostCard`.

#### Component moi

- `profile-tabs.tsx`
- `profile-club-group-card.tsx`
- `profile-posts-section.tsx`
- skeleton tuong ung cho tung block

---

## Tabs va noi dung tung tab

### 1. `Tong quan`

Hien:

- Header
- Stats row
- thong tin trong truong
- ket noi preview
- CLB/Nhom preview
- mot it bai viet gan day neu muon

### 2. `Bai viet`

Hien:

- Composer (chi voi chinh chu)
- Toan bo danh sach bai viet theo rule visibility
- Empty state rieng neu khong co bai viet

### 3. `CLB & Nhom`

Hien:

- Danh sach CLB dang tham gia
- Danh sach nhom dang tham gia
- role cua user trong tung CLB/nhom neu co

Tabs se duoc implement that su trong scope nay de dong nhat giua profile cua chinh chu va profile nguoi khac.

---

## Loading va skeleton

### Yeu cau bat buoc

- Co skeleton loading cho ` /profile `
- Co skeleton loading cho ` /profile/[userId] `
- Skeleton phai giong bo cuc that, tranh layout shift

### De xuat

Them:

- `src/app/(main)/profile/loading.tsx`
- `src/app/(main)/profile/[userId]/loading.tsx`

### Skeleton sections

1. `ProfileHeaderSkeleton`
   - cover area
   - avatar
   - name / subtitle
   - action button

2. `ProfileStatsSkeleton`
   - 4 o thong ke

3. `ProfileOverviewCardSkeleton`
   - 4-6 dong thong tin

4. `ConnectionsGridSkeleton`
   - avatar preview + label

5. `ClubGroupCardSkeleton`
   - list item skeleton

6. `PostCardSkeleton`
   - dung lai skeleton da co trong feed

### Nguyen tac skeleton

- Desktop va mobile deu dung cung mot layout logic
- Khong dung skeleton generic chi la mot khoi dai
- Skeleton cua profile nguoi khac va chinh chu co the khac nhe o composer/action area

---

## Empty state va error handling

### 1. Profile khong ton tai

- `notFound()`

### 2. Chua dang nhap vao `/profile`

- `redirect("/login")`

### 3. Khong co bai viet

Chinh chu:

- thong diep kieu "Ban chua co bai viet nao. Hay dang bai viet dau tien."

Nguoi khac:

- thong diep kieu "Nguoi dung nay chua co bai viet cong khai."

### 4. Khong tham gia CLB/Nhom

- Hien empty card ngan gon, khong de card rong

### 5. Khong co bio

- Hien fallback text nhe, khong qua on ao

---

## File changes du kien

| File | Action |
|---|---|
| `src/app/(main)/profile/page.tsx` | Refactor route chinh chu sang loader chung |
| `src/app/(main)/profile/loading.tsx` | Tao loading route |
| `src/app/(main)/profile/[userId]/page.tsx` | Tao route profile nguoi khac |
| `src/app/(main)/profile/[userId]/loading.tsx` | Tao loading route cho nguoi khac |
| `src/app/(main)/profile/profile-page-data.ts` | Tao loader/query mapper dung chung |
| `src/components/profile/profile-header.tsx` | Mo rong props va render mode |
| `src/components/profile/academic-progress-card.tsx` | Replace bang card thong tin that hoac doi ten/trach nhiem |
| `src/components/profile/connections-grid.tsx` | Sua de nhan total count that |
| `src/components/profile/profile-overview-card.tsx` | Tao moi neu khong tai dung file cu |
| `src/components/profile/profile-club-group-card.tsx` | Tao moi |
| `src/components/profile/profile-tabs.tsx` | Tao moi de render tabs that su |
| `src/components/profile/profile-posts-section.tsx` | Tao moi |

---

## Test strategy

### Unit / integration tests

1. Loader cho chinh chu
   - tra ve day du thong tin cua minh
   - co `isOwnProfile = true`

2. Loader cho nguoi khac
   - tra ve `isOwnProfile = false`
   - khong expose field rieng tu cam
   - co expose `studentId`

3. Visibility cua posts
   - chinh chu thay duoc post cua minh chua xoa
   - nguoi khac chi thay `PUBLIC`

4. Stats
   - `friendsCount`, `postsCount`, `clubsCount`, `groupsCount` dung voi du lieu mau

5. Invalid user
   - route goi `notFound`

### UI tests

1. Skeleton render dung tren profile page
2. Empty state bai viet render dung theo tung mode
3. Composer chi hien voi chinh chu
4. Nguoi khac thay duoc `studentId`, `major`, `year`, khong thay `email`

---

## Verification

1. `npm run lint`
2. `npm run build`
3. Chay test lien quan den profile loader va UI
4. Verify thu cong:
   - `/profile` render dung profile chinh chu
   - `/profile/[userId]` render dung profile nguoi khac
   - skeleton hien thi truoc khi data len
   - posts, CLB, nhom, stats khop du lieu DB

---

## Quyết định chốt

1. Dung ` /profile ` cho chinh chu, ` /profile/[userId] ` cho nguoi khac
2. Chi dung du lieu thuc tu schema hien tai
3. Bo card academic hardcode, thay bang card thong tin that trong truong
4. Profile nguoi khac la cong khai an toan, duoc hien `studentId`
5. Phai co skeleton loading va bo cuc dong nhat theo pattern social profile quen thuoc
