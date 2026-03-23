# SPEC: Sidebar Groups/CLBs Section

## 1. Mục tiêu

Thêm section hiển thị danh sách CLB/nhóm mà user đã tham gia vào sidebar trái của trang feed (`feed/page.tsx`), bên dưới phần navigation.

## 2. Vị trí

Trong `src/app/(main)/feed/page.tsx`, trong Card sidebar trái, bên dưới phần navigation `LEFT_NAV`.

Cấu trúc Card:
```
Card
├── User info
├── LEFT_NAV (navigation items)
└── Groups section          ← thêm vào đây
    ├── Header: "Nhóm của bạn"
    └── List: 3-5 items (CLB/nhóm user tham gia)
```

## 3. Mock Data

Thêm vào `src/components/layout/mock-data.ts`:

```typescript
export interface GroupData {
  id: string
  name: string
  memberCount: number
  href: string
}

export const mockGroups: GroupData[] = [
  { id: "1", name: "CLB Thiết kế", memberCount: 120, href: "/clubs/design-club" },
  { id: "2", name: "Nhóm Công nghệ", memberCount: 85, href: "/groups/tech-group" },
  { id: "3", name: "CLB Tiếng Anh", memberCount: 200, href: "/clubs/english-club" },
  { id: "4", name: "Nhóm Âm nhạc", memberCount: 45, href: "/groups/music" },
]
```

## 4. Component

### 4.1. `src/components/layout/sidebar-group-item.tsx`

Tạo component mới `SidebarGroupItem`:

```tsx
interface SidebarGroupItemProps {
  group: GroupData
}

export function SidebarGroupItem({ group }: SidebarGroupItemProps) {
  return (
    <Link href={group.href} className="group flex items-center gap-2.5 px-1 py-1.5 rounded-lg hover:bg-muted transition-colors">
      {/* Icon tròn */}
      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
        <Users className="w-4 h-4 text-muted-foreground" />
      </div>

      {/* Tên + số thành viên */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{group.name}</p>
        <p className="text-xs text-muted-foreground">
          {group.memberCount} thành viên
        </p>
      </div>

      {/* Nút Xem */}
      <span className="text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        Xem
      </span>
    </Link>
  )
}
```

## 5. Rendering trong feed/page.tsx

```tsx
{/* Groups section */}
<div className="mt-3">
  <p className="px-1 py-2 text-xs font-bold text-muted-foreground uppercase tracking-wide">
    Nhóm của bạn
  </p>
  <div className="space-y-0.5">
    {mockGroups.map((group) => (
      <SidebarGroupItem key={group.id} group={group} />
    ))}
  </div>
</div>
```

## 6. Styling

- Không border chia cách giữa groups section và nav trên
- Header dùng text-xs, uppercase, tracking-wide, muted color
- Items có hover effect giống SidebarNavItem
- Icon hiện tại: Users icon từ lucide-react

## 7. Checklist

- [ ] Thêm mock data vào `mock-data.ts`
- [ ] Tạo `sidebar-group-item.tsx`
- [ ] Render trong `feed/page.tsx`
- [ ] Playwright test: verify groups section hiển thị đúng
