# SPEC: Mo rong trang admin theo module quan tri co kha nang reuse va scale

**Date:** 2026-04-19
**Status:** Draft
**Author:** Codex

---

## Context

Admin area hien tai da co mot skeleton ban dau gom:

- `dashboard`
- `announcements`
- `analytics`
- `settings`
- `users`

Tuy nhien phan admin chua duoc to chuc theo mot kien truc co the scale deu khi so luong module tang len. Cac page hien tai dang nghieng ve huong mock UI doc lap, chua co mot lop config + shell dung chung cho navigation, breadcrumb, list page, detail page, form page va module settings.

Yeu cau moi cua du an:

- Giup admin co the quan ly nhung thanh phan chinh lien quan toi website
- Uu tien 4 module quan tri trong giai doan nay:
  - user
  - mon hoc
  - group
  - su kien
- Giu lai toan bo cac thanh phan admin da co
- Them cac route con theo cung mot pattern route chuan
- Chua can CRUD hoat dong that, day moi la buoc dung khung
- Code phai de maintain, de scale, va tai su dung tot

Muc tieu cua spec nay la chot kien truc admin moi de vong implementation co the dung mot bo khung on dinh ngay tu dau, tranh lap page, lap layout va tranh phai dap di lam lai khi noi du lieu that.

---

## Muc tieu

1. Giu nguyen cac khu vuc admin hien co, khong xoa `dashboard`, `announcements`, `analytics`, `settings`
2. Dua 4 module quan tri chinh vao sidebar va coi day la truc quan tri mo rong:
   - `users`
   - `subjects`
   - `groups`
   - `events`
3. Chuan hoa pattern route cho moi module:
   - `/admin/<module>`
   - `/admin/<module>/new`
   - `/admin/<module>/settings`
   - `/admin/<module>/[id]`
   - `/admin/<module>/[id]/edit`
4. Tao mot lop reusable shell va module registry de tat ca page moi dung chung bo khung
5. Su dung mock data tap trung theo module, khong hardcode rop rac trong tung route
6. Them test o muc config/structure de dam bao architecture moi khong vo ket cau route va navigation

---

## Scope

### Trong pham vi

1. Refactor navigation admin theo 2 nhom:
   - management modules
   - core admin tools
2. Tao module registry va route helper chung cho admin
3. Tao shell components de dung lai cho list/detail/form/settings page
4. Them route va page shell cho:
   - `users`
   - `subjects`
   - `groups`
   - `events`
5. Them cac route con chuan cho moi module
6. Chuyen cac page co san sang mo hinh navigation moi neu can thiet
7. Bo sung breadcrumb metadata va route labels tap trung
8. Them mock data theo module de render duoc toan bo khung
9. Bo sung test cho navigation config, module registry, route helpers

### Ngoai pham vi

- Auth va permission that cho admin
- Server Actions va form submit that
- Query Prisma that cho admin pages
- Pagination, search, filter, sort hoat dong that
- Tao generic CRUD engine qua tong quat
- Thay doi logic cua cac route main user-facing
- Refactor toan bo UI admin cu thanh du lieu that

---

## Nguyen tac kien truc

### 1. Uu tien config-driven, khong schema-driven engine

Giai doan nay can mot bo khung co the mo rong nhanh ma khong bi over-engineer. Vi vay architecture se theo huong:

- dung `module registry` va `navigation config`
- dung reusable shells o muc vua du
- moi module van co route va page rieng
- khong tao mot CRUD engine tong quat tu dong sinh UI

Ket qua:

- du scale
- de doc
- de debug
- giu duoc tu do de custom tung module ve sau

### 2. Route file chi lam nhiem vu ghep shell + data

Route files trong `src/app/admin/...` khong nen tro thanh noi chua:

- mock data lon
- route labels
- breadcrumb mapping
- bo loc
- quick actions
- column definitions

Nhung phan tren phai duoc dua vao lop config hoac component dung chung.

### 3. Giu can bang giua reuse va custom

Admin can tai su dung duoc:

- page header
- action bar
- stats grid
- filter bar
- table shell
- detail sections
- form sections
- settings sections

Nhung khong ep moi module dung mot giao dien y het nhau. Shell phai co slots de module chen:

- stats rieng
- columns rieng
- detail section rieng
- copywriting rieng
- quick actions rieng

### 4. Mock data tap trung

Du lieu mock la buoc tam de dung khung, nhung van phai to chuc gan voi production code:

- moi module co mock data rieng
- co summary stats
- co list records
- co detail model
- co form defaults
- co settings sections

Khong de du lieu nam rop rac trong `page.tsx`.

---

## Information architecture cua admin

Admin sau khi refactor duoc chia thanh 2 lop lon:

### 1. Management modules

Day la phan quan tri chinh can mo rong tiep trong cac phase sau.

- `users`
- `subjects`
- `groups`
- `events`

Day se la cum navigation uu tien o dau sidebar.

### 2. Core admin tools

Day la cac khu vuc ho tro van can giu lai.

- `dashboard`
- `announcements`
- `analytics`
- `settings`

Chung van ton tai trong admin nhung duoc hien thi thanh nhom phu tro thay vi dong vai tro truc chinh.

---

## Route pattern chuan

Moi management module deu dung mot route pattern giong nhau:

### Users

- `/admin/users`
- `/admin/users/new`
- `/admin/users/settings`
- `/admin/users/[userId]`
- `/admin/users/[userId]/edit`

### Subjects

- `/admin/subjects`
- `/admin/subjects/new`
- `/admin/subjects/settings`
- `/admin/subjects/[subjectId]`
- `/admin/subjects/[subjectId]/edit`

### Groups

- `/admin/groups`
- `/admin/groups/new`
- `/admin/groups/settings`
- `/admin/groups/[groupId]`
- `/admin/groups/[groupId]/edit`

### Events

- `/admin/events`
- `/admin/events/new`
- `/admin/events/settings`
- `/admin/events/[eventId]`
- `/admin/events/[eventId]/edit`

### Ly do chon pattern dong nhat

1. Giam chi phi nhan thuc khi them module moi
2. Breadcrumb, route helper, action mapping co the tai su dung
3. Page shell co contract on dinh
4. Kich hoat tot hon cho test config va route metadata
5. De thay the mock data bang du lieu that trong cac phase sau

---

## To chuc file

### Route layer

`src/app/admin/`

De xuat cau truc:

```text
src/app/admin/
  layout.tsx
  page.tsx
  dashboard/page.tsx
  announcements/page.tsx
  analytics/page.tsx
  settings/page.tsx
  users/page.tsx
  users/new/page.tsx
  users/settings/page.tsx
  users/[userId]/page.tsx
  users/[userId]/edit/page.tsx
  subjects/page.tsx
  subjects/new/page.tsx
  subjects/settings/page.tsx
  subjects/[subjectId]/page.tsx
  subjects/[subjectId]/edit/page.tsx
  groups/page.tsx
  groups/new/page.tsx
  groups/settings/page.tsx
  groups/[groupId]/page.tsx
  groups/[groupId]/edit/page.tsx
  events/page.tsx
  events/new/page.tsx
  events/settings/page.tsx
  events/[eventId]/page.tsx
  events/[eventId]/edit/page.tsx
```

### UI layer

`src/components/admin/`

De xuat bo tri theo nhom:

```text
src/components/admin/
  admin-sidebar.tsx
  breadcrumb-nav.tsx
  module/
    admin-page-header.tsx
    admin-filter-bar.tsx
    admin-stats-grid.tsx
    admin-data-table.tsx
    admin-detail-section.tsx
    admin-action-list.tsx
    admin-empty-state.tsx
  shells/
    admin-list-page-shell.tsx
    admin-detail-page-shell.tsx
    admin-form-page-shell.tsx
    admin-settings-page-shell.tsx
```

### Config + mock layer

`src/lib/admin/`

De xuat:

```text
src/lib/admin/
  admin-navigation.ts
  admin-route-meta.ts
  admin-route-builders.ts
  admin-types.ts
  modules/
    users.ts
    subjects.ts
    groups.ts
    events.ts
```

Neu can tach nho hon sau nay co the mo rong thanh:

- `src/lib/admin/modules/<module>/config.ts`
- `src/lib/admin/modules/<module>/mock-data.ts`

Nhung o vong nay mot file moi module la du.

---

## Admin navigation strategy

### Nguon su that duy nhat

Navigation admin khong nen duoc viet trong component sidebar nhu mot mang hardcode co lap. Thay vao do, can co:

- `ADMIN_MANAGEMENT_NAV_ITEMS`
- `ADMIN_CORE_NAV_ITEMS`

Du lieu nay se la nguon su that cho:

- sidebar
- quick links
- route labels
- breadcrumb fallback

### Sidebar behavior

Sidebar admin can hien 2 nhom:

1. `Quan tri chinh`
   - Users
   - Mon hoc
   - Group
   - Su kien

2. `Cong cu he thong`
   - Dashboard
   - Thong bao
   - Phan tich
   - Cai dat

### Main UX objective

Ngay khi vao admin, nguoi dung phai nhin thay 4 module quan tri chinh la truc lam viec chinh. Cac page cu van con nhung khong lam mo trong tam dieu huong.

---

## Module registry

Moi module quan tri chinh can khai bao trong module registry mot tap metadata on dinh.

### Contract muc tieu

Moi module se co it nhat:

- `key`
- `label`
- `description`
- `icon`
- `basePath`
- `entityNameSingular`
- `entityNamePlural`
- `route builder`
- `default breadcrumbs`
- `stats`
- `filters`
- `list columns`
- `quick actions`
- `list records`
- `detail record resolver`
- `default form values`
- `settings sections`

### Vi du khai bao logic

```ts
interface AdminModuleDefinition<RecordId extends string = string> {
  key: "users" | "subjects" | "groups" | "events"
  label: string
  description: string
  basePath: string
  entityNameSingular: string
  entityNamePlural: string
  buildDetailPath: (id: RecordId) => string
  buildEditPath: (id: RecordId) => string
  buildNewPath: () => string
  buildSettingsPath: () => string
}
```

Module registry phai du generic de:

- them module moi ve sau
- viet test route pattern mot cach ro rang
- giup route files chi can lay module config roi render shell

---

## Route metadata va breadcrumb strategy

### Van de hien tai

`BREADCRUMB_MAP` trong admin layout dang la mot object nho, chi cover mot so page co san. Cach nay se vo nhanh khi so route tang.

### Huong thiet ke moi

Can co helper route metadata gom:

- static labels cho core admin pages
- labels cho module base pages
- builders cho routes dynamic

### Muc tieu

Cho phep layout admin tinh duoc breadcrumb theo:

- route hien tai
- module hien tai
- dynamic entity label fallback

Trong vong nay, entity label cho route dynamic co the dung:

- `Chi tiet nguoi dung`
- `Chi tiet mon hoc`
- `Chi tiet group`
- `Chi tiet su kien`

Khong can fetch ten that cua entity cho breadcrumb o phase nay.

---

## Shell components

Day la tam cua architecture moi.

### 1. `AdminListPageShell`

Dung cho:

- `/admin/users`
- `/admin/subjects`
- `/admin/groups`
- `/admin/events`

Can gom:

- page header
- subtitle
- primary action
- secondary actions
- stats grid
- tab/filter bar
- search input
- table/list area
- right-side quick actions hoac helper cards

Muc tieu la moi module list page chi can truyen:

- module config
- stats
- filters
- columns
- rows
- quick actions

### 2. `AdminDetailPageShell`

Dung cho:

- `/admin/<module>/[id]`

Can gom:

- title
- status/meta badges
- summary cards
- action buttons
- section list
- related items hoac timeline area

Detail page shell giup page chi can truyen:

- summary block
- sections
- related links
- action list

### 3. `AdminFormPageShell`

Dung cho:

- `/admin/<module>/new`
- `/admin/<module>/[id]/edit`

Can gom:

- header + breadcrumb
- form sections
- aside helper card
- submit area
- info banner

Trong phase nay form shell chi can render:

- inputs
- textareas
- toggles
- o lua chon tam thoi neu module can

Khong can submit that.

### 4. `AdminSettingsPageShell`

Dung cho:

- `/admin/<module>/settings`

Can gom:

- page header
- sections settings
- toggle rows
- field rows
- nut luu tam thoi

---

## Admin primitives

De giam lap va giu route files gon, can tao cac primitive sau:

### `AdminPageHeader`

Chiu trach nhiem:

- title
- subtitle
- badge/status neu can
- primary action
- secondary actions

### `AdminFilterBar`

Chiu trach nhiem:

- search input
- tab navigation
- o loc mo rong tam thoi neu can
- chip bo loc dang kich hoat neu module can

### `AdminStatsGrid`

Chiu trach nhiem:

- render card thong ke theo data config
- khong hardcode mau theo tung page neu co the

### `AdminDataTable`

Chiu trach nhiem:

- column headers
- row cells
- action column
- empty state
- footer summary va pagination tam thoi

Trong phase nay co the dung render functions don gian thay vi generic table phuc tap.

### `AdminDetailSection`

Chiu trach nhiem:

- section title
- mo ta them neu can
- grid data pairs hoac children

### `AdminActionList`

Chiu trach nhiem:

- quick actions
- shortcuts
- module-specific admin tasks

### `AdminEmptyState`

Chiu trach nhiem:

- title
- description
- CTA

---

## Data strategy cho phase dung khung

### Nguyen tac

1. Mock data nam trong `src/lib/admin/modules/*.ts`
2. Route files lay du lieu tu module definitions
3. Khong hardcode bo loc, columns, stats, records trong `page.tsx`

### Moi module can cung cap

#### Summary stats

Vi du:

- tong so records
- dang hoat dong
- can duyet
- gap canh bao

#### List data

Mang records de render o list page.

#### Detail data

Record day du hon cho detail page.

#### Form defaults

De render `new` va `edit` shells.

#### Settings data

Mang sections va items de render settings shell.

---

## Module-specific content expectations

Phase nay chua can logic that, nhung moi module van can du "chat nghiep vu" de khung co y nghia.

### 1. Users

#### List page

- stats:
  - tong nguoi dung
  - dang hoat dong
  - cho xac minh
  - bi khoa
- filters:
  - tat ca
  - sinh vien
  - giang vien
  - admin
- table columns:
  - ten
  - email
  - vai tro
  - khoa/bo mon
  - trang thai
  - ngay tham gia

#### Detail page

- thong tin co ban
- thong tin hoc thuat co ban
- quyen va trang thai
- hoat dong gan day
- lien ket nhanh toi profile user

#### New/Edit

- thong tin nhan su
- quyen han
- cau hinh tai khoan

#### Settings

- registration defaults
- moderation rules
- invite workflow

### 2. Subjects

#### List page

- stats:
  - tong mon hoc
  - dang mo
  - tam dung
  - can cap nhat
- filters:
  - tat ca
  - dai cuong
  - chuyen nganh
  - thuc hanh
- columns:
  - ma mon
  - ten mon
  - khoa phu trach
  - so tin chi
  - trang thai

#### Detail page

- thong tin mon hoc
- khoi giang vien phu trach tam thoi
- groups lien quan
- events lien quan

#### New/Edit

- metadata mon hoc
- quy tac hien thi
- lien ket cong dong

#### Settings

- quy uoc ma mon
- visibility defaults
- bo loc mac dinh

### 3. Groups

#### List page

- stats:
  - tong so group
  - dang hoat dong
  - rieng tu
  - can kiem duyet
- filters:
  - tat ca
  - hoc tap
  - du an
  - cong dong
- columns:
  - ten group
  - loai
  - so thanh vien
  - quan ly
  - trang thai

#### Detail page

- thong tin group
- thanh vien noi bat
- mon hoc lien quan
- su kien lien quan

#### New/Edit

- thong tin nhom
- privacy
- moderation

#### Settings

- approval workflow
- member limits
- content rules

### 4. Events

#### List page

- stats:
  - tong su kien
  - sap dien ra
  - dang mo dang ky
  - da hoan thanh
- filters:
  - tat ca
  - hoc thuat
  - clb
  - workshop
  - noi bo
- columns:
  - ten su kien
  - thoi gian
  - don vi to chuc
  - tham gia
  - trang thai

#### Detail page

- tong quan su kien
- khoi lich trinh tam thoi
- group/subject lien quan
- participants overview

#### New/Edit

- thong tin co ban
- lich trinh
- dang ky
- truyen thong

#### Settings

- registration defaults
- reminder rules
- visibility rules

---

## Quan he giua module pages va core admin pages

### Dashboard

Van duoc giu lai de hien tong quan toan he thong.

Sau khi refactor navigation, dashboard khong con la "module chinh" ma la "trang tong quan".

### Announcements

Van la cong cu core admin. Co the duoc lien ket nhu mot quick action tu dashboard hoac event pages ve sau.

### Analytics

Van la cong cu doc bao cao tong quan, khong dong vai tro module CRUD.

### Settings

Van la cai dat toan he thong, khac voi `settings` cua tung module.

Nguyen tac:

- `admin/settings` = system-wide settings
- `admin/<module>/settings` = module-specific settings

---

## Layout va responsive strategy

### Admin layout

Admin layout se tiep tuc dung sidebar overlay nhu hien tai, nhung can:

- doc navigation tu config chung
- breadcrumb doc tu route meta helper
- search chung cho admin neu layout can

### Responsive behavior

Tren mobile:

- sidebar mo bang overlay
- list page shell se stack cac thanh phan
- stats grid chuyen 1 cot hoac 2 cot
- quick actions xuong duoi table

Tren desktop:

- list page co the dung bo cuc 2 cot neu module co helper panel
- detail va form page co the co aside card

Khong can them behavior responsive moi qua phuc tap. Muc tieu la "tron tru va muot ma" voi bo khung co san.

---

## Route behavior trong phase nay

Tat ca route moi deu la page shell co data mock va CTA tam thoi.

### List routes

- render du table va stats
- CTA co the link toi `new`, `settings`, hoac detail page

### New routes

- render form shell
- nut submit chi dong vai tro mock action
- microcopy noi ro "Chua ket noi xu ly that"

### Detail routes

- render thong tin tong hop cua record mock
- co action toi edit page

### Edit routes

- render form shell voi default values
- chua submit that

### Settings routes

- render bo config va toggles tam thoi
- chua luu that

Muc tieu la dieu huong chay duoc, page hop ly, khong vo UI, nhung khong gia vo da co business logic that.

---

## Testing strategy

Phase nay can test architecture va structure, khong test CRUD business logic.

### Test 1: Admin navigation config

Xac minh:

- co day du management modules:
  - users
  - subjects
  - groups
  - events
- co day du core admin pages:
  - dashboard
  - announcements
  - analytics
  - settings
- nav items co href serializable

### Test 2: Module registry

Xac minh:

- co day du 4 module
- moi module co `basePath`
- moi module build duoc:
  - list path
  - new path
  - settings path
  - detail path
  - edit path

### Test 3: Route metadata helper

Xac minh:

- route static tra ve labels dung
- route dynamic tra ve breadcrumb fallback dung

### Test 4: Page-level smoke tests neu can

Neu test rendering duoc don gian, co the them smoke test cho:

- `AdminSidebar`
- mot `AdminListPageShell`
- mot `AdminDetailPageShell`

Nhung khong bat buoc phai test tung page route moi trong phase nay neu chi phi setup qua lon. Uu tien test config va helper.

### Verification commands

- `npm run lint`
- `npm run build`
- `npx vitest run tests/layout tests/admin`

Neu can, co the dat test moi tai:

- `tests/admin/admin-navigation.test.ts`
- `tests/admin/admin-modules.test.ts`
- `tests/admin/admin-route-meta.test.ts`

---

## File changes du kien

### Modify

- `src/app/admin/layout.tsx`
- `src/components/admin/admin-sidebar.tsx`

### Create

- `src/lib/admin/admin-types.ts`
- `src/lib/admin/admin-navigation.ts`
- `src/lib/admin/admin-route-builders.ts`
- `src/lib/admin/admin-route-meta.ts`
- `src/lib/admin/modules/users.ts`
- `src/lib/admin/modules/subjects.ts`
- `src/lib/admin/modules/groups.ts`
- `src/lib/admin/modules/events.ts`
- `src/components/admin/module/admin-page-header.tsx`
- `src/components/admin/module/admin-filter-bar.tsx`
- `src/components/admin/module/admin-stats-grid.tsx`
- `src/components/admin/module/admin-data-table.tsx`
- `src/components/admin/module/admin-detail-section.tsx`
- `src/components/admin/module/admin-action-list.tsx`
- `src/components/admin/module/admin-empty-state.tsx`
- `src/components/admin/shells/admin-list-page-shell.tsx`
- `src/components/admin/shells/admin-detail-page-shell.tsx`
- `src/components/admin/shells/admin-form-page-shell.tsx`
- `src/components/admin/shells/admin-settings-page-shell.tsx`
- `src/app/admin/subjects/page.tsx`
- `src/app/admin/subjects/new/page.tsx`
- `src/app/admin/subjects/settings/page.tsx`
- `src/app/admin/subjects/[subjectId]/page.tsx`
- `src/app/admin/subjects/[subjectId]/edit/page.tsx`
- `src/app/admin/groups/page.tsx`
- `src/app/admin/groups/new/page.tsx`
- `src/app/admin/groups/settings/page.tsx`
- `src/app/admin/groups/[groupId]/page.tsx`
- `src/app/admin/groups/[groupId]/edit/page.tsx`
- `src/app/admin/events/page.tsx`
- `src/app/admin/events/new/page.tsx`
- `src/app/admin/events/settings/page.tsx`
- `src/app/admin/events/[eventId]/page.tsx`
- `src/app/admin/events/[eventId]/edit/page.tsx`
- `src/app/admin/users/new/page.tsx`
- `src/app/admin/users/settings/page.tsx`
- `src/app/admin/users/[userId]/page.tsx`
- `src/app/admin/users/[userId]/edit/page.tsx`
- `tests/admin/admin-navigation.test.ts`
- `tests/admin/admin-modules.test.ts`
- `tests/admin/admin-route-meta.test.ts`

### Can nhac dieu chinh them

- `src/app/admin/users/page.tsx`
- `src/app/admin/dashboard/page.tsx`
- `src/app/admin/analytics/page.tsx`
- `src/app/admin/settings/page.tsx`

Muc tieu cua nhom dieu chinh them la dua cac page co san tiep can gan hon voi shell components moi neu thay hop ly, nhung khong bat buoc refactor het trong mot lan.

---

## Out-of-scope technical decisions da chot

1. Chua noi Prisma vao admin modules trong phase nay
2. Chua tao server actions cho create/update/delete
3. Chua lam auth guard theo role admin
4. Chua tao pagination/search/filter backend
5. Chua lam table abstraction qua tong quat

Nhung van phai:

- de route chay duoc
- de navigation thong nhat
- de shell tai su dung duoc
- de mock data co to chuc

---

## Rui ro va cach tranh

### Rui ro 1: Over-engineer shell

Neu shells generic qua muc, code se kho doc va kho maintain.

Giam rui ro bang cach:

- giu primitives don gian
- uu tien props ro nghia
- chi truu tuong hoa nhung phan lap that su

### Rui ro 2: Hardcode lan moi trong page routes

Neu route files tiep tuc chua mock data va labels, architecture moi se mat tac dung.

Giam rui ro bang cach:

- dat test cho module registry va navigation
- route files chi duoc doc tu `src/lib/admin/*`

### Rui ro 3: Page cu va page moi lech style

Neu khong co shell chung, phan admin se bi rach.

Giam rui ro bang cach:

- uu tien cho module moi dung shells
- can nhac dieu chinh page cu dan dan theo shell moi

---

## Verification

1. Sidebar admin render du 2 nhom navigation nhu thiet ke
2. Tat ca route chuan cho 4 module moi deu truy cap duoc
3. Breadcrumb hien hop ly cho:
   - list
   - new
   - settings
   - detail
   - edit
4. Khong co page nao bi vo layout khi mo tren mobile va desktop
5. Lint, build, test deu pass

---

## Quyet dinh chot

1. Giu toan bo admin hien co, khong xoa core pages
2. Chuyen admin sang mo hinh 2 lop:
   - management modules
   - core admin tools
3. Dung pattern route dong nhat cho 4 module moi
4. Dung module registry + navigation config + route helpers lam nen tang
5. Dung page shells va primitives co kha nang tai su dung thay vi copy page
6. Dung mock data tap trung theo module, khong hardcode rop rac
7. Uu tien test architecture/config/route helpers trong phase dung khung
