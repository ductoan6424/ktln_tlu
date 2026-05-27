---
version: "alpha"
name: "TLU Community"
description: "Hệ UI community-branded cho nền tảng nội bộ của Đại học Thăng Long."
colors:
  brand-indigo: "#000066"
  brand-scarlet: "#F32409"
  primary: "#1D4ED8"
  primary-deep: "#000066"
  primary-soft: "#EEF2FF"
  scarlet-soft: "#FFF0ED"
  official-ink: "#9B190B"
  on-brand: "#FFFFFF"
  link: "#1D4ED8"
  canvas: "#F7F8FC"
  surface: "#FFFFFF"
  surface-soft: "#F1F3F9"
  surface-brand: "#000066"
  surface-scarlet: "#F32409"
  border: "#E2E6F0"
  border-strong: "#CBD3E4"
  overlay: "#000066"
  ink: "#10152E"
  ink-brand: "#000066"
  text-secondary: "#4C5874"
  text-muted: "#707B95"
  text-disabled: "#9FA8BB"
  on-dark-muted: "#DDE2FA"
  success: "#087443"
  success-soft: "#E9F8F0"
  info: "#1D4ED8"
  info-soft: "#EAF1FF"
  warning: "#93400A"
  warning-soft: "#FFF6E7"
  critical: "#C5221F"
  critical-soft: "#FDECEC"
  official: "#F32409"
typography:
  hero-display:
    fontFamily: "Thang Long Sans, Be Vietnam Pro, Manrope, Arial, sans-serif"
    fontSize: "56px"
    fontWeight: "700"
    lineHeight: "1.08"
    letterSpacing: "-0.04em"
  display-lg:
    fontFamily: "Thang Long Sans, Be Vietnam Pro, Manrope, Arial, sans-serif"
    fontSize: "44px"
    fontWeight: "700"
    lineHeight: "1.12"
    letterSpacing: "-0.035em"
  heading-xl:
    fontFamily: "Thang Long Sans, Be Vietnam Pro, Manrope, Arial, sans-serif"
    fontSize: "32px"
    fontWeight: "700"
    lineHeight: "1.18"
    letterSpacing: "-0.025em"
  heading-lg:
    fontFamily: "Manrope, Be Vietnam Pro, system-ui, Arial, sans-serif"
    fontSize: "26px"
    fontWeight: "650"
    lineHeight: "1.25"
    letterSpacing: "-0.02em"
  heading-md:
    fontFamily: "Manrope, Be Vietnam Pro, system-ui, Arial, sans-serif"
    fontSize: "20px"
    fontWeight: "650"
    lineHeight: "1.30"
    letterSpacing: "-0.01em"
  heading-sm:
    fontFamily: "Manrope, Be Vietnam Pro, system-ui, Arial, sans-serif"
    fontSize: "16px"
    fontWeight: "650"
    lineHeight: "1.38"
    letterSpacing: "0em"
  subtitle:
    fontFamily: "Manrope, Be Vietnam Pro, system-ui, Arial, sans-serif"
    fontSize: "16px"
    fontWeight: "500"
    lineHeight: "1.50"
    letterSpacing: "0em"
  body-md:
    fontFamily: "Manrope, Be Vietnam Pro, system-ui, Arial, sans-serif"
    fontSize: "14px"
    fontWeight: "400"
    lineHeight: "1.57"
    letterSpacing: "0em"
  body-md-medium:
    fontFamily: "Manrope, Be Vietnam Pro, system-ui, Arial, sans-serif"
    fontSize: "14px"
    fontWeight: "550"
    lineHeight: "1.50"
    letterSpacing: "0em"
  body-sm:
    fontFamily: "Manrope, Be Vietnam Pro, system-ui, Arial, sans-serif"
    fontSize: "13px"
    fontWeight: "400"
    lineHeight: "1.46"
    letterSpacing: "0em"
  label:
    fontFamily: "Manrope, Be Vietnam Pro, system-ui, Arial, sans-serif"
    fontSize: "12px"
    fontWeight: "600"
    lineHeight: "1.33"
    letterSpacing: "0.02em"
  caption:
    fontFamily: "Manrope, Be Vietnam Pro, system-ui, Arial, sans-serif"
    fontSize: "11px"
    fontWeight: "500"
    lineHeight: "1.36"
    letterSpacing: "0.01em"
  overline:
    fontFamily: "Manrope, Be Vietnam Pro, system-ui, Arial, sans-serif"
    fontSize: "11px"
    fontWeight: "700"
    lineHeight: "1.27"
    letterSpacing: "0.14em"
rounded:
  xs: "4px"
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "14px"
  xxl: "20px"
  full: "999px"
  circle: "999px"
spacing:
  xxs: "4px"
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "20px"
  xl: "24px"
  xxl: "32px"
  xxxl: "40px"
  section: "48px"
  hero: "64px"
components:
  app-shell:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
  top-navbar:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-brand}"
    height: "64px"
  brand-heading:
    textColor: "{colors.brand-indigo}"
    typography: "{typography.heading-xl}"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-brand}"
    typography: "{typography.body-md-medium}"
    rounded: "{rounded.lg}"
    height: "44px"
    padding: "0px 16px"
  button-primary-pressed:
    backgroundColor: "{colors.primary-deep}"
    textColor: "{colors.on-brand}"
    typography: "{typography.body-md-medium}"
    rounded: "{rounded.lg}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-brand}"
    typography: "{typography.body-md-medium}"
    rounded: "{rounded.lg}"
  button-destructive:
    backgroundColor: "{colors.critical}"
    textColor: "{colors.on-brand}"
    typography: "{typography.body-md-medium}"
    rounded: "{rounded.lg}"
  button-disabled-label:
    textColor: "{colors.text-disabled}"
    typography: "{typography.body-md-medium}"
  nav-item-active:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.ink-brand}"
    typography: "{typography.body-md-medium}"
    rounded: "{rounded.md}"
  search-pill:
    backgroundColor: "{colors.surface-soft}"
    textColor: "{colors.text-secondary}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.full}"
    height: "40px"
  brand-panel:
    backgroundColor: "{colors.surface-brand}"
    textColor: "{colors.on-brand}"
    typography: "{typography.display-lg}"
    rounded: "{rounded.xxl}"
  brand-accent-block:
    backgroundColor: "{colors.brand-scarlet}"
    rounded: "{rounded.xs}"
  scarlet-banner-block:
    backgroundColor: "{colors.surface-scarlet}"
    rounded: "{rounded.sm}"
  official-marker:
    backgroundColor: "{colors.official}"
    rounded: "{rounded.xs}"
  official-badge:
    backgroundColor: "{colors.scarlet-soft}"
    textColor: "{colors.official-ink}"
    typography: "{typography.overline}"
    rounded: "{rounded.full}"
  inline-link:
    textColor: "{colors.link}"
    typography: "{typography.body-md-medium}"
  supporting-card:
    backgroundColor: "{colors.surface-soft}"
    textColor: "{colors.text-secondary}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.lg}"
  muted-caption:
    textColor: "{colors.text-muted}"
    typography: "{typography.caption}"
  dark-supporting-copy:
    backgroundColor: "{colors.surface-brand}"
    textColor: "{colors.on-dark-muted}"
    typography: "{typography.body-sm}"
  divider:
    backgroundColor: "{colors.border}"
    height: "1px"
  strong-divider:
    backgroundColor: "{colors.border-strong}"
    height: "1px"
  hero-overlay:
    backgroundColor: "{colors.overlay}"
    rounded: "{rounded.xl}"
  badge-success:
    backgroundColor: "{colors.success-soft}"
    textColor: "{colors.success}"
    typography: "{typography.overline}"
    rounded: "{rounded.full}"
  badge-info:
    backgroundColor: "{colors.info-soft}"
    textColor: "{colors.info}"
    typography: "{typography.overline}"
    rounded: "{rounded.full}"
  badge-warning:
    backgroundColor: "{colors.warning-soft}"
    textColor: "{colors.warning}"
    typography: "{typography.overline}"
    rounded: "{rounded.full}"
  badge-critical:
    backgroundColor: "{colors.critical-soft}"
    textColor: "{colors.critical}"
    typography: "{typography.overline}"
    rounded: "{rounded.full}"
---

# TLU Community Design System

## Overview

`TLU Community` là nền tảng cộng đồng nội bộ dành cho sinh viên, giảng viên và đơn vị vận hành của Trường Đại học Thăng Long. Hệ giao diện cần mang bản sắc TLU rõ ràng nhưng không biến luồng sử dụng hằng ngày thành một trang chiến dịch truyền thông: người dùng phải đọc feed nhanh, tìm thông báo chính thức dễ, quản lý lớp học/câu lạc bộ hiệu quả và thao tác hành chính chính xác.

Hướng thiết kế được chọn là **Community-branded**:

- **Thang Long Indigo** (`{colors.brand-indigo}`) tạo cấu trúc điều hướng, CTA chính và cảm giác tin cậy.
- **Thang Long Scarlet** (`{colors.brand-scarlet}`) tạo dấu hiệu nhận diện mạnh ở thông báo chính thức, điểm nhấn quan trọng và các bề mặt đại diện cho nhà trường.
- **Kỷ hà TLU** (vuông, tròn, tam giác trong lưới mô-đun) xuất hiện có chọn lọc ở hero, event banner, official announcement, cover và empty state; không phủ lên các card nội dung thường nhật.
- **Typography hướng Việt ngữ**: `Thang Long Sans` dành cho headline mang tính thương hiệu khi font asset sẵn có; `Manrope` dành cho text dài theo hướng dẫn thương hiệu. Trong sản phẩm hiện tại, `Be Vietnam Pro` là fallback vận hành phù hợp với giao diện đã xây dựng và hỗ trợ tiếng Việt.

Tài liệu này chuyển ngôn ngữ thương hiệu chính thức thành hệ UI cho các bề mặt đang tồn tại trong ứng dụng: đăng nhập, feed, bài viết, thông báo, tin nhắn, sự kiện, câu lạc bộ, môn học, hồ sơ cá nhân và admin workspace.

### Cơ sở nhận diện

Các yếu tố dưới đây lấy từ Digital Guideline chính thức của Đại học Thăng Long:

| Yếu tố | Quy chuẩn chính thức dùng trong hệ thống |
|---|---|
| Màu chủ đạo | Thang Long Scarlet `#F32409`; Thang Long Indigo `#000066` |
| Logo | Ưu tiên phiên bản chính; vị trí ưu tiên ở góc trên bên trái; không đổi màu, kéo méo, đổ bóng hoặc đặt họa tiết đè lên logo |
| Kích thước logo số | Phiên bản chính tối thiểu `60px` chiều ngang; phiên bản phụ tối thiểu `45px`; micro logo dùng ở khoảng `10-13px` |
| Display type | `Thang Long Sans` cho headline lớn và nội dung cần biểu đạt cá tính thương hiệu |
| Text type | `Manrope` cho subhead, nội dung giới thiệu ngắn, metadata và đoạn văn dài |
| Đồ họa | Các khối kỷ hà vuông, tròn, tam giác được tổ chức theo ô vuông và tỉ lệ mô-đun |

### Key Characteristics

- Canvas sáng, sạch và giàu khoảng thở, phục vụ khả năng đọc nội dung cộng đồng.
- Navigation và thao tác chính đặt trọng tâm vào `{colors.brand-indigo}` thay vì trải màu thương hiệu trên toàn giao diện.
- Official content dùng đường nhấn `{colors.brand-scarlet}`, huy hiệu đơn vị phát hành và motif kỷ hà để phân biệt với bài đăng cá nhân.
- Card bán kính vừa phải, chắc chắn và hiện đại; pill được dùng cho badge/filter, không ép mọi CTA thành pill.
- Feed desktop theo cấu trúc `left rail + content stream + context rail`; mobile giảm xuống một luồng và bottom navigation.
- Admin surfaces giảm trang trí, tăng phân cấp trạng thái, khả năng đọc bảng biểu và độ rõ của quy trình phê duyệt.

## Colors

> Hai token thương hiệu cốt lõi dưới đây là giá trị chính thức. Các token surface, semantic và trạng thái là phần mở rộng sản phẩm dành cho `TLU Community`, được xây dựng để giữ độ tương phản và phân vai rõ ràng.

### Brand & Accent

| Token | Value | Use |
|---|---:|---|
| `{colors.brand-indigo}` | `#000066` | Màu thương hiệu nền tảng; navbar active, heading thương hiệu, official context, dark branded surface |
| `{colors.brand-scarlet}` | `#F32409` | Accent thương hiệu; official announcement marker, critical priority callout, event highlight |
| `{colors.primary}` | `#1D4ED8` | CTA tương tác chính trên nền sáng; dẫn xuất UI sáng hơn từ hệ indigo để bảo đảm khả năng nhận biết thao tác |
| `{colors.primary-deep}` | `#000066` | CTA pressed/selected mạnh, active navigation trên branded surface |
| `{colors.primary-soft}` | `#EEF2FF` | Active nav background, selected row, informational tinted card |
| `{colors.scarlet-soft}` | `#FFF0ED` | Official announcement background, branded urgency without full red fill |
| `{colors.official-ink}` | `#9B190B` | Text official cỡ nhỏ trên nền Scarlet tint, được làm tối để đạt độ đọc tốt hơn |
| `{colors.on-brand}` | `#FFFFFF` | Text/icon trên Indigo hoặc Scarlet |
| `{colors.link}` | `#1D4ED8` | Inline link và action link trong nội dung dài |

### Surface

| Token | Value | Use |
|---|---:|---|
| `{colors.canvas}` | `#F7F8FC` | Page background cho app shell |
| `{colors.surface}` | `#FFFFFF` | Card, navbar, modal, input background |
| `{colors.surface-soft}` | `#F1F3F9` | Search field, skeleton, empty-state support panel |
| `{colors.surface-brand}` | `#000066` | Hero/event/official branded panels |
| `{colors.surface-scarlet}` | `#F32409` | Banner nhấn ngắn, không dùng cho card dữ liệu lớn |
| `{colors.border}` | `#E2E6F0` | Default card/input divider |
| `{colors.border-strong}` | `#CBD3E4` | Table header, focused structural divider |
| `{colors.overlay}` | `#000066` at `44%` opacity | Image overlay trên cover hoặc hero branded |

### Text

| Token | Value | Use |
|---|---:|---|
| `{colors.ink}` | `#10152E` | Primary body copy và heading thường |
| `{colors.ink-brand}` | `#000066` | Brand heading, active labels, key metric |
| `{colors.text-secondary}` | `#4C5874` | Supporting text, secondary metadata |
| `{colors.text-muted}` | `#707B95` | Timestamp, empty hints, inactive navigation |
| `{colors.text-disabled}` | `#9FA8BB` | Disabled controls và placeholder yếu |
| `{colors.on-dark-muted}` | `#DDE2FA` | Secondary copy trên nền Indigo |

### Semantic

| Token | Value | Use |
|---|---:|---|
| `{colors.success}` | `#087443` | Thành công, đã duyệt, đang hoạt động, đã xác nhận |
| `{colors.success-soft}` | `#E9F8F0` | Success badge/callout background |
| `{colors.info}` | `#1D4ED8` | Thông tin vận hành, trạng thái đang xử lý |
| `{colors.info-soft}` | `#EAF1FF` | Informational badge background |
| `{colors.warning}` | `#93400A` | Chờ duyệt, sắp đến hạn, cảnh báo trung bình |
| `{colors.warning-soft}` | `#FFF6E7` | Warning badge/callout background |
| `{colors.critical}` | `#C5221F` | Lỗi, thu hồi, hành động phá huỷ |
| `{colors.critical-soft}` | `#FDECEC` | Error/destructive background |
| `{colors.official}` | `{colors.brand-scarlet}` | Marker/shape của nội dung được nhà trường hoặc đơn vị phát hành chính thức; không đồng nhất mặc định với lỗi |

### Usage Principle

- `{colors.brand-indigo}` và `{colors.brand-scarlet}` là nhận diện trường, không tự động mang nghĩa semantic.
- `{colors.official}` có thể dùng Scarlet cho marker của thông báo chính thức vì đó là tín hiệu nguồn phát hành; label chữ nhỏ trên tint dùng `{colors.official-ink}`.
- Trạng thái lỗi dùng `{colors.critical}`, tách khỏi brand Scarlet để người dùng không hiểu nhầm mọi yếu tố đỏ là lỗi.
- `{colors.primary}` là màu tương tác UI trên bề mặt thường ngày; `{colors.brand-indigo}` xuất hiện khi bề mặt cần bản sắc mạnh hơn hoặc active state chắc chắn.
- Scarlet chính thức được giữ nguyên cho artwork/marker; không đặt body text trắng cỡ nhỏ trực tiếp trên nền Scarlet nếu chưa vượt qua kiểm tra tương phản.

## Typography

### Font Family

**`Thang Long Sans`** là display face cho headline có tính đại diện thương hiệu: hero, tiêu đề sự kiện cấp trường, landing/sign-in statement và headline trong official announcement cover. Font này chỉ được dùng khi project có asset hoặc quyền nhúng phù hợp.

**`Manrope`** là typeface hỗ trợ được guideline chính thức chỉ định cho subhead và nội dung văn bản. Đây là lựa chọn chuẩn cho body khi triển khai mới hoặc khi đồng bộ font asset.

**`Be Vietnam Pro`** là fallback/implementation bridge cho ứng dụng đang có. Repo hiện tại đã cấu hình font này cho UI; nó bảo đảm tiếng Việt tốt và có thể tiếp tục dùng cho body, control, bảng dữ liệu cho tới khi có đợt đồng bộ font thương hiệu.

Fallback chains:

```css
--font-brand-display: "Thang Long Sans", "Be Vietnam Pro", "Manrope", Arial, sans-serif;
--font-ui: "Manrope", "Be Vietnam Pro", system-ui, Arial, sans-serif;
--font-current-ui: "Be Vietnam Pro", "Manrope", system-ui, Arial, sans-serif;
```

### Hierarchy

| Token | Size | Weight | Line Height | Letter Spacing | Face | Use |
|---|---:|---:|---:|---:|---|---|
| `{typography.hero-display}` | `56px` | `700` | `1.08` | `-0.04em` | Thang Long Sans | Auth/landing hero, flagship event statement |
| `{typography.display-lg}` | `44px` | `700` | `1.12` | `-0.035em` | Thang Long Sans | Page hero, official campaign banner |
| `{typography.heading-xl}` | `32px` | `700` | `1.18` | `-0.025em` | Thang Long Sans | Branded page headline |
| `{typography.heading-lg}` | `26px` | `650` | `1.25` | `-0.02em` | UI/brand | Page title, admin workspace title |
| `{typography.heading-md}` | `20px` | `650` | `1.30` | `-0.01em` | UI | Card group title, modal title |
| `{typography.heading-sm}` | `16px` | `650` | `1.38` | `0` | UI | Post author highlight, card heading |
| `{typography.subtitle}` | `16px` | `500` | `1.50` | `0` | Manrope/UI | Lead copy below headline |
| `{typography.body-md}` | `14px` | `400` | `1.57` | `0` | Manrope/UI | Post content, form body, description |
| `{typography.body-md-medium}` | `14px` | `550` | `1.50` | `0` | Manrope/UI | Button labels, selected navigation |
| `{typography.body-sm}` | `13px` | `400` | `1.46` | `0` | Manrope/UI | Secondary copy, helper text |
| `{typography.label}` | `12px` | `600` | `1.33` | `0.02em` | UI | Input labels, section metadata |
| `{typography.caption}` | `11px` | `500` | `1.36` | `0.01em` | UI | Timestamp, privacy text |
| `{typography.overline}` | `11px` | `700` | `1.27` | `0.14em` | UI | Sidebar section, badge label, unit tag |

### Typography Principles

- Dùng `Thang Long Sans` ở số lượng ít nhưng có trọng lượng thị giác lớn; không dùng cho feed body hoặc bảng admin dài.
- Không dùng italic trong branded headline; không trộn nhiều style trong một tiêu đề.
- Post, comment, tin nhắn và biểu mẫu cần ưu tiên khả năng đọc, dùng `{typography.body-md}` với line-height không dưới `1.50`.
- Tiêu đề tiếng Việt có dấu ở cỡ display cần giảm tracking và giữ line-height chặt vừa đủ để khối chữ chắc chắn.
- Uppercase chỉ dành cho overline/badge ngắn; không viết hoa toàn bộ câu thông báo hoặc hành động chính.

## Brand Graphic Language

### Geometric Signature

Đồ họa đặc trưng của TLU được hình thành từ các khối **vuông**, **tròn** và **tam giác** đặt trên lưới ô vuông mô-đun. Trong sản phẩm cộng đồng, motif này đóng vai trò nhận diện chứ không phải decoration phổ quát.

| Token | Rule | Use |
|---|---|---|
| `graphic.grid-unit` | Ô vuông mô-đun cơ bản | Xây dựng artwork cho banner/cover |
| `graphic.block-circle` | Bán nguyệt hoặc hình tròn trong ô vuông | Event banner, onboarding, empty state |
| `graphic.block-triangle` | Tam giác ghép có hướng chuyển động | CTA hero, milestone/sự kiện |
| `graphic.opacity-soft` | `8-14%` | Background motif sau nội dung chữ |
| `graphic.opacity-display` | `100%` | Artwork tách khỏi text trên hero/banner |

### Application Rules

- Dùng kỷ hà tại `official-announcement-hero`, `event-banner`, `club-cover-feature`, auth panel và empty state quan trọng.
- Với feed post thường, comment, chat bubble, input và table: không thêm motif.
- Nếu chữ nằm trên motif, giảm opacity của motif hoặc tách vùng chữ khỏi mảng đặc; độ đọc luôn ưu tiên trước nhận diện.
- Không để motif xâm phạm clear space của logo.
- Tránh đặt các hình rời rạc ngẫu nhiên ở bốn góc card; artwork cần dựa trên lưới và có quan hệ hình học rõ.

## Logo

### Logo Use

| Token | Value | Use |
|---|---:|---|
| `logo.primary-min-width` | `60px` | Phiên bản logo chính trên digital surfaces |
| `logo.secondary-min-width` | `45px` | Phiên bản phụ ở không gian hạn chế |
| `logo.micro-range` | `10-13px` | Chỉ dùng mark thu gọn khi UI quá hẹp |
| `logo.clear-space` | Chiều cao chữ `T` trong wordmark | Khoảng không tối thiểu quanh logo |

### Product Placement

- Desktop navbar/sidebar: logo ở góc trên trái, kết hợp chữ `TLU Community` nếu đủ chiều rộng.
- Mobile navbar: dùng mark/logo gọn cùng tên sản phẩm hoặc chỉ mark nếu chiều rộng không đủ; không giảm dưới ngưỡng guideline phù hợp với phiên bản đã chọn.
- Official announcement preview và printable/export view: có thể dùng logo chính ở đầu tài liệu, giữ clear space.

### Never

- Không đổi màu logo theo trạng thái interaction.
- Không dùng logo như avatar thông báo khi kích thước khiến wordmark mất đọc; dùng micro mark hoặc avatar tổ chức được chuẩn hóa.
- Không kéo giãn, thêm viền, shadow, gradient hay đè kỷ hà lên logo.

## Layout

### Spacing System

- **Base unit:** `4px`; nhịp sử dụng chủ đạo là `8px`.
- **Tokens:** `{spacing.xxs}` `4px` · `{spacing.xs}` `8px` · `{spacing.sm}` `12px` · `{spacing.md}` `16px` · `{spacing.lg}` `20px` · `{spacing.xl}` `24px` · `{spacing.xxl}` `32px` · `{spacing.xxxl}` `40px` · `{spacing.section}` `48px` · `{spacing.hero}` `64px`.
- Card feed tiêu chuẩn dùng padding `{spacing.md}` đến `{spacing.lg}`.
- Admin form/card dùng `{spacing.lg}` đến `{spacing.xl}` để tăng độ rõ trong quy trình duyệt.
- Branded banner/event cover dùng padding `{spacing.xl}` đến `{spacing.section}`.

### Application Shell

| Surface | Desktop Layout | Behaviour |
|---|---|---|
| Main feed | Left rail `280-300px` + center stream max `640px` + right rail `280px` | Right rail hiển thị xu hướng, sự kiện, bạn bè đang hoạt động |
| Notifications/messages | Main list + detail/popover hoặc chat dock | Ưu tiên timestamp, unread và context source |
| Admin workspace | Content max `1280px`; form + preview/approval rail | Sticky supporting rail khi màn hình rộng |
| Auth | Branded visual panel + focused form panel | Motif và logo xuất hiện đậm hơn main app |

### Whitespace Philosophy

- Feed là bề mặt đọc nhanh: giữ khoảng cách ổn định giữa composer, announcement strip và post cards; không dùng khoảng trống kiểu marketing quá lớn.
- Official announcement và event hero có thể thở rộng hơn để thể hiện nguồn phát hành và thời hạn.
- Admin pages nén hợp lý nhưng luôn phân tách các trạng thái duyệt, target audience và action destructive.

## Elevation & Depth

Hệ UI ưu tiên bề mặt sáng, đường viền rõ và shadow nhẹ. Nhận diện TLU đến từ màu, type và artwork, không đến từ shadow dày.

| Level | Treatment | Use |
|---|---|---|
| `0` | No shadow; `1px solid {colors.border}` | Feed cards, course/club tiles, sidebar modules |
| `1` | `0 1px 2px rgba(16, 21, 46, 0.06)` | Composer, popover rest surface, form card |
| `2` | `0 8px 24px rgba(0, 0, 102, 0.10)` | Dropdown, notification/message popup, dialog |
| `3` | `0 16px 36px rgba(0, 0, 102, 0.16)` | Mobile sheet, critical confirm dialog |

### Branded Depth

- Indigo hero có thể dùng kỷ hà Scarlet/white thay cho gradient hoặc shadow phô trương.
- Cover image được phủ `{colors.overlay}` khi cần đặt chữ trắng.
- Official card dùng accent bar hoặc header tint, không dùng glow đỏ xung quanh toàn card.

## Shapes

### Radius Scale

| Token | Value | Use |
|---|---:|---|
| `{rounded.xs}` | `4px` | Fine indicator, table highlight |
| `{rounded.sm}` | `6px` | Badge, small tag |
| `{rounded.md}` | `8px` | Input, menu item, compact option |
| `{rounded.lg}` | `10px` | Default button, feed post, admin panel |
| `{rounded.xl}` | `14px` | Composer, modal, event tile, branded panel |
| `{rounded.xxl}` | `20px` | Hero/card cover, auth visual surface |
| `{rounded.full}` | `999px` | Avatar, filter chip, notification count, segmented pill |
| `{rounded.circle}` | `999px` | Avatar and small brand geometry |

### Shape Principles

- Rounded rectangles are the functional UI signature; kỷ hà TLU is reserved for artwork.
- Buttons remain compact rounded rectangles (`{rounded.lg}`), matching current app ergonomics; pill buttons are for filters/chips where horizontal scanning matters.
- Avatars and unread counts remain circles for recognition speed.

## Components

### Buttons

**`button-primary`** - Hành động chính như `Đăng bài`, `Lưu thay đổi`, `Gửi duyệt`.

- Background `{colors.primary}`, text `{colors.on-brand}`, typography `{typography.body-md-medium}`, radius `{rounded.lg}`, height `40-44px`, padding `0 {spacing.md}`.
- Focus-visible: ring `3px rgba(29, 78, 216, 0.22)` với outline rõ.
- Pressed: background `{colors.primary-deep}`.
- Disabled: background `{colors.surface-soft}`, text `{colors.text-disabled}`.

**`button-brand`** - CTA đại diện trường trên auth/official/event hero.

- Background `{colors.brand-indigo}`, text `{colors.on-brand}`, typography `{typography.body-md-medium}`, radius `{rounded.lg}`; có thể đi kèm marker/artwork `{colors.brand-scarlet}` bên ngoài vùng chữ.
- Không đặt label nhỏ màu trắng trực tiếp trên nền Scarlet chuẩn; Scarlet được giữ cho marker và artwork nhận diện.
- Không dùng variant brand lặp lại cho mọi thao tác trong feed hoặc admin table.

**`button-secondary`** - Hành động phụ như `Xem trước`, `Hủy`.

- Background `{colors.surface}`, text `{colors.ink-brand}`, border `1px solid {colors.border-strong}`, radius `{rounded.lg}`.
- Active: background `{colors.primary-soft}`.

**`button-destructive`** - `Thu hồi`, `Xóa`, `Khóa`.

- Background `{colors.critical}`, text `{colors.on-brand}`; destructive status không sử dụng token brand Scarlet.

**`button-icon`** - Search, notification, message, menu actions.

- `40px` desktop, `44px` mobile; radius `{rounded.full}`; default transparent; selected background `{colors.primary-soft}`.

**`filter-pill`** + **`filter-pill-active`** - Tab trạng thái, audience, feed filter.

- Default: background `{colors.surface}`, border `1px solid {colors.border}`, text `{colors.text-secondary}`.
- Active: background `{colors.primary-soft}`, text `{colors.ink-brand}`, border `1px solid rgba(0, 0, 102, 0.18)`.
- Radius `{rounded.full}`, typography `{typography.label}`.

### Navigation

**`top-navbar`** - Thanh điều hướng desktop cố định.

- Background `{colors.surface}`, border-bottom `1px solid {colors.border}`, height `64px`.
- Logo ở trái; global search cạnh logo; điều hướng chính nằm trung tâm; notification, messages và account bên phải.
- Active route dùng icon/text `{colors.primary}` và indicator indigo gọn dưới item.

**`main-sidebar`** - Rail điều hướng hoặc khối profile ngữ cảnh.

- Background `{colors.surface}`, border/right hoặc card chrome `{colors.border}`.
- Active item: background `{colors.primary-soft}`, text `{colors.ink-brand}`, icon `{colors.primary}`.
- Section label dùng `{typography.overline}` và `{colors.text-muted}`.

**`mobile-bottom-nav`** - Điều hướng chính dưới `1024px`.

- Background `{colors.surface}`, border-top `1px solid {colors.border}`, safe-area aware.
- Active item dùng `{colors.primary}`; unread count dùng `{colors.brand-scarlet}` khi biểu thị thông báo chưa đọc, không dùng như error.
- Mỗi touch target tối thiểu `44px`.

**`global-search`** - Search trong navbar.

- Background `{colors.surface-soft}`, radius `{rounded.full}`, height `40px`, text `{typography.body-sm}`.
- Focus-visible chuyển border/ring sang `{colors.primary}`; result popover dùng elevation `2`.

### Feed & Community

**`post-composer`** - Bề mặt tạo bài đăng ở đầu feed.

- Background `{colors.surface}`, radius `{rounded.xl}`, border `{colors.border}`, elevation `1`, padding `{spacing.md}`.
- Avatar, placeholder và action đính kèm giữ trung tính; nút gửi dùng `button-primary`.
- Không dùng kỷ hà hoặc Scarlet trừ khi composer đang tạo thông báo official trong quyền phù hợp.

**`post-card`** - Bài đăng thường nhật.

- Background `{colors.surface}`, radius `{rounded.lg}`, border `1px solid {colors.border}`, padding `{spacing.md}`.
- Author heading dùng `{typography.heading-sm}`; time/privacy dùng `{typography.caption}`.
- Content dùng `{typography.body-md}`; media dùng `{rounded.md}` đến `{rounded.lg}`.
- Interaction row giữ neutral/indigo; không dùng branded artwork.

**`official-announcement-card`** - Thông báo chính thức xuất hiện trên feed.

- Background `{colors.surface}`, border `1px solid {colors.border}`, radius `{rounded.xl}`.
- Dải trái `4px solid {colors.brand-scarlet}` hoặc header tint `{colors.scarlet-soft}`.
- Có unit identity, badge `Chính thức`, priority/deadline và action acknowledgement nếu được yêu cầu.
- Kỷ hà chỉ được đặt trong header/cover riêng, không chen vào phần body nội dung cần đọc.

**`announcement-strip`** - Danh sách thông báo nổi bật đầu feed.

- Default variant: background `{colors.scarlet-soft}`, icon/accent `{colors.brand-scarlet}`, title `{colors.ink-brand}`.
- Pinned hoặc toàn trường: dùng branded header Indigo với Scarlet marker, giữ body nền sáng.
- Có nhãn nguồn phát hành; không làm giống quảng cáo.

**`event-card`** - Sự kiện sắp tới/right rail hoặc trang event.

- Compact variant giữ calendar date block Indigo/Scarlet và text nền trắng.
- Feature variant có cover/motif kỷ hà, title rõ, thời gian/địa điểm và CTA đăng ký.
- Event đa khối ngành có thể dùng hệ màu/ngôn ngữ đồ họa ngành khi có dữ liệu chính thức tương ứng.

**`club-card`** và **`course-card`** - Nội dung cộng đồng/học tập.

- Background `{colors.surface}`, radius `{rounded.lg}`, border `{colors.border}`.
- Avatar/logo của cộng đồng là điểm nhận diện chính; không thay bằng logo trường.
- Course metadata, member count và role dùng semantic badge nhẹ.

### Messaging & Notification

**`notification-popup`** - Danh sách thông báo nhanh từ navbar.

- Surface elevation `2`, radius `{rounded.xl}`, width khoảng `360-400px`.
- Unread row: background `{colors.primary-soft}`; official row thêm scarlet unit marker.
- Hành động `Xem tất cả` dùng text `{colors.link}`.

**`message-popup`** / **`chat-dock`** - Tin nhắn nhanh.

- Header Indigo cho active chat context hoặc text Indigo trên nền trắng, tùy mật độ UI.
- Tin nhắn của người dùng dùng `{colors.primary}` với text trắng; tin nhận dùng `{colors.surface-soft}` với `{colors.ink}`.
- Scarlet không dùng cho chat bình thường; chỉ dùng badge unread hoặc warning thực sự.

**`toast`** - Phản hồi thao tác.

- Success/info/warning/error theo semantic palette.
- Official issuance success có thể thêm micro mark/unit name nhưng vẫn dùng semantic success cho trạng thái hoàn tất.

### Admin & Governance

**`admin-page-header`** - Header của workspace quản trị.

- Title `{typography.heading-lg}`, supporting copy `{typography.body-sm}`.
- Bề mặt thông báo chính thức có nhãn đơn vị và scarlet accent marker.

**`announcement-workspace`** - Soạn thảo, preview, hàng đợi và lịch sử thông báo.

- Desktop: form chính + sticky preview/review rail.
- Tabs trạng thái dùng `filter-pill`; status badges theo semantic meaning.
- Preview official dùng logo/identity, scarlet marker và cấu trúc metadata chặt chẽ; không trình bày như post cá nhân.

**`review-timeline`** - Chuỗi duyệt/phát hành/thu hồi.

- Đã hoàn thành: `{colors.success}`.
- Đang chờ duyệt: `{colors.warning}`.
- Đã thu hồi hoặc thất bại: `{colors.critical}`.
- Nguồn official được biểu thị bằng label/accent Scarlet riêng, không thay màu trạng thái quy trình.

**`data-table`** - Quản trị users, sự kiện, khóa học, thông báo.

- Background `{colors.surface}`, header background `{colors.surface-soft}`, divider `{colors.border}`.
- Selected row `{colors.primary-soft}`; destructive action chỉ hiển thị đỏ tại action/confirmation.

### Inputs & Forms

**`text-input`**, **`textarea`**, **`select-field`**

- Background `{colors.surface}`, text `{colors.ink}`, border `1px solid {colors.border-strong}`, radius `{rounded.md}`, height tối thiểu `40px`.
- Focus-visible: border `{colors.primary}` + ring nhẹ.
- Invalid: border `{colors.critical}`, helper label `{colors.critical}`.
- Disabled: background `{colors.surface-soft}`, text `{colors.text-disabled}`.

**`radio-option`** và **`checkbox-option`**

- Selected: border `{colors.primary}`, background `{colors.primary-soft}`, check/control fill `{colors.primary}`.
- Official/audience selection không chuyển sang Scarlet; Scarlet là nguồn nhận diện, Indigo là selection affordance.

**`toggle-switch`**

- Checked interaction thường: track `{colors.primary}`.
- Các switch nguy hiểm không dùng scarlet trực tiếp; yêu cầu confirmation riêng.

### Badges & Status

| Component | Treatment | Example |
|---|---|---|
| `badge-official` | `{colors.scarlet-soft}` background, `{colors.official-ink}` text, `{colors.brand-scarlet}` marker tùy chọn | `Chính thức` |
| `badge-primary` | `{colors.primary-soft}` background, `{colors.ink-brand}` text | `Công khai`, `Môn học` |
| `badge-success` | `{colors.success-soft}` / `{colors.success}` | `Đã duyệt`, `Đang hoạt động` |
| `badge-warning` | `{colors.warning-soft}` / `{colors.warning}` | `Chờ duyệt`, `Sắp đến hạn` |
| `badge-critical` | `{colors.critical-soft}` / `{colors.critical}` | `Đã thu hồi`, `Bị khóa` |
| `badge-muted` | `{colors.surface-soft}` / `{colors.text-secondary}` | `Bản nháp`, `Lưu trữ` |

Badges dùng `{typography.overline}` hoặc `{typography.caption}`, radius `{rounded.full}` và padding `4px 8px`.

### Signature Components

**`auth-brand-panel`** - Bề mặt chào đón ở đăng nhập/đăng ký.

- Background `{colors.surface-brand}`; logo đúng clear space; display headline trắng; motif Scarlet/white theo lưới kỷ hà.
- Form đăng nhập vẫn nằm trên surface trắng để đọc và nhập liệu dễ.

**`official-announcement-hero`** - Thông báo toàn trường hoặc thông báo cần acknowledgement.

- Header Indigo hoặc white + Scarlet bar; title rõ, issuing unit, ngày ban hành, phạm vi nhận, mức ưu tiên.
- Có thể dùng kỷ hà tỉ lệ lớn tại vùng trống của header, opacity không ảnh hưởng chữ.

**`campus-event-banner`** - Sự kiện nổi bật.

- Image/geometry phối hợp cùng title; date block và CTA rõ; có thể dùng palette khối ngành khi đã có mapping thương hiệu hợp lệ.

**`feed-three-zone-shell`** - Layout chủ đạo của desktop.

- Left rail: profile, navigation và nhóm của người dùng.
- Center stream: composer, official strip, cập nhật gần đây và infinite feed.
- Right rail: trending, upcoming events và active contacts.
- Bề mặt branded luôn có lý do nội dung; phần còn lại giữ trung tính để feed không nhiễu.

**`admin-announcement-governance`** - Bề mặt quản trị mang tính thể chế.

- Compose + preview + approval/timeline; ưu tiên traceability.
- Brand identity xác nhận thẩm quyền phát hành; semantic states xác nhận tình trạng quy trình.

## Imagery & Iconography

### Photography

- Ảnh sự kiện, campus và câu lạc bộ nên mang tính cộng đồng thật, hoạt động thật; tránh ảnh stock không gắn với môi trường trường học.
- Cover có chữ phủ lên ảnh cần overlay Indigo; text trắng phải đủ tương phản.
- User-generated media không áp treatment nhận diện ép buộc ngoài radius/crop nhất quán.

### Icons

- Icon UI dùng nét đều, hiện tại phù hợp với hệ `lucide-react`.
- Icon mặc định dùng `{colors.text-secondary}`; active dùng `{colors.primary}`; official marker dùng `{colors.brand-scarlet}`.
- Không thay logo TLU bằng icon trang trí hoặc ngược lại.

## Motion

| Token | Value | Use |
|---|---:|---|
| `motion.fast` | `120ms ease-out` | Button/icon press, tab indicator |
| `motion.base` | `180ms ease-out` | Dropdown, hover/focus background, badge transition |
| `motion.panel` | `240ms ease-out` | Drawer, popover, mobile sheet |
| `motion.reduced` | `0-1ms` | Khi người dùng bật reduced motion |

- Không animate motif kỷ hà liên tục trong feed.
- Loading và real-time update dùng chuyển động tiết chế; nội dung chính thức không nhấp nháy để thu hút.

## Accessibility & Interaction States

- Text body trên surface trắng đạt tối thiểu WCAG AA; CTA primary và brand phải được kiểm tra contrast với text trắng trước khi triển khai.
- Focus-visible bắt buộc rõ trên button, link, input, nav item, dialog action và table action.
- Không truyền đạt trạng thái chỉ bằng Scarlet/Indigo; luôn có icon, label hoặc text.
- Notification unread, official content, error và destructive action phải phân biệt được khi người dùng không nhận biết màu.
- Touch target tối thiểu `44 x 44px` trên mobile cho nav icon, avatar menu và primary actions.
- Dark mode là phần mở rộng sản phẩm hiện có, không được coi là palette dark chính thức của thương hiệu nếu chưa có guideline tương ứng.

## Do's And Don'ts

### Do

- Dùng `{colors.brand-indigo}` và `{colors.brand-scarlet}` đúng vai trò thương hiệu, đặc biệt ở logo context, official surfaces và event identity.
- Dùng `{colors.primary}` cho hành động UI thường nhật để thao tác rõ mà không làm Scarlet mất giá trị nhận diện.
- Dùng `Thang Long Sans` cho headline biểu đạt thương hiệu khi asset hợp lệ; dùng `Manrope`/fallback Việt ngữ cho text dài.
- Phân biệt rõ `official announcement` với `post-card` bằng source label, Scarlet marker và metadata phát hành.
- Đặt kỷ hà trên bề mặt có không gian và mục đích nhận diện rõ, theo lưới mô-đun.
- Giữ feed, message và admin data surface đủ yên để nội dung và trạng thái dễ quét.

### Don't

- Không dùng Scarlet như màu primary cho mọi button, active tab hoặc link trong ứng dụng.
- Không dùng brand Scarlet thay cho error semantic; một thông báo chính thức không phải là lỗi.
- Không đưa kỷ hà vào từng post, input, chat bubble hoặc hàng bảng dữ liệu.
- Không bóp méo, đổi màu, thêm shadow, thêm viền hoặc đặt motif đè lên logo.
- Không dùng `Thang Long Sans` cho đoạn nội dung dài hoặc trộn italic/style trong branded headline.
- Không biến app shell thành một campaign page với nền màu và artwork dày ở mọi màn hình.

## Responsive Behavior

### Breakpoints

| Name | Width | Key Changes |
|---|---:|---|
| Mobile small | `< 480px` | Một cột; top bar gọn; bottom nav cố định; official hero giảm artwork; card padding giảm |
| Mobile large | `480-767px` | Một cột rộng hơn; event tiles có thể hai-up nếu đủ không gian |
| Tablet | `768-1023px` | Main content ưu tiên; context rail ẩn hoặc chuyển thành panel; admin preview xuống dưới form |
| Desktop | `1024-1279px` | Left rail + stream; right rail tùy trang; top navigation đầy đủ |
| Wide desktop | `>= 1280px` | Feed đủ ba vùng; admin form + sticky review/preview rail |

### Collapsing Strategy

- **Navbar:** desktop có search và action popovers; mobile chuyển search thành màn mở rộng trong top bar và dùng bottom navigation cho routes chính.
- **Feed:** dưới `1024px`, left/right contextual rails biến mất; content stream giữ thứ tự `composer -> official announcements -> posts`.
- **Official announcement:** metadata quan trọng giữ trên mobile; artwork giảm hoặc cắt gọn, không đẩy nội dung thiết yếu xuống quá sâu.
- **Admin workspace:** preview/review rail xuống dưới form ở tablet/mobile; action gửi duyệt/phát hành có thể sticky dưới màn hình khi cần.
- **Messages:** chat dock desktop chuyển thành full-screen conversation hoặc sheet trên mobile.
- **Event cards:** cover giữ aspect ratio ổn định; date, location và registration action luôn nhìn thấy.

### Dark Mode Extension

Ứng dụng hiện có chế độ tối. Khi map hệ này sang dark mode:

- Canvas và card chuyển sang lớp Indigo gần đen; brand Scarlet giữ độ nổi nhưng giảm diện tích sử dụng.
- Primary interaction phải được làm sáng để đủ tương phản trên dark surface.
- Official card vẫn cần phân biệt khỏi error state bằng nhãn và cấu trúc, không chỉ bằng màu.
- Các giá trị dark cụ thể cần được kiểm tra contrast và không được coi là màu thương hiệu chính thức nếu guideline TLU chưa quy định.

## Implementation Mapping

> Đây là mapping hướng dẫn, không phải xác nhận rằng source code đã được đồng bộ hoàn toàn.

| Design Surface | Existing Product Area |
|---|---|
| `top-navbar`, `global-search`, popups | `src/components/layout/top-navbar.tsx` |
| `main-sidebar` | `src/components/layout/main-sidebar.tsx` và rail trong feed |
| `mobile-bottom-nav` | `src/components/layout/mobile-bottom-nav.tsx` |
| `feed-three-zone-shell`, composer, post, strip | `src/app/(main)/feed/feed-page-client.tsx` và feed components |
| `admin-announcement-governance` | `src/app/admin/announcements/announcements-client.tsx` |
| Core tokens and dark mode | `src/app/globals.css` |
| Current logo asset | `public/logo.svg` |

### Current-State Note

Source hiện tại đã dùng hướng navy/red và font `Be Vietnam Pro` trong `src/app/globals.css`. Guide này chuẩn hóa cách gọi và cách phân vai theo nhận diện chính thức: Indigo/Scarlet là brand anchors; semantic status và daily interaction được phân biệt rõ. Việc map token CSS thực tế sang guide là một task triển khai riêng.

## Iteration Guide

1. Bắt đầu bằng token mapping: đưa `{colors.brand-indigo}`, `{colors.brand-scarlet}`, semantic palette và typography roles vào theme layer.
2. Đồng bộ shell trước: logo, navbar, sidebar, bottom nav, search, focus states và surface/card nền tảng.
3. Chuyển `official-announcement-card` và admin announcement workspace trước các bề mặt khác vì đây là nơi nhận diện và tính thể chế quan trọng nhất.
4. Áp dụng typography và card rules cho feed, events, clubs, courses, profile và messages.
5. Thêm motif kỷ hà qua asset/component riêng cho auth, official header và event banners; tránh chèn decoration ad hoc trong từng component.
6. Kiểm tra responsive, keyboard navigation, color contrast và dark mode sau mỗi nhóm bề mặt.
7. Chỉ mở rộng palette khối ngành khi có dữ liệu/guideline chính thức và use case cụ thể trong course/event/club.

## Known Gaps

- Font asset `Thang Long Sans` chưa được xác nhận là đã được nhúng trong repo; guide quy định vai trò nhưng triển khai cần xác minh quyền và asset.
- Hệ màu khối ngành tồn tại trong guideline hình ảnh nhưng chưa được trích thành token sản phẩm; không tự suy diễn mã màu cho tới khi có nguồn chuẩn.
- Dark-mode palette của app là mở rộng sản phẩm; chưa có xác nhận đó là palette dark chính thức của TLU.
- Component visual cho motif kỷ hà chưa được xây dựng trong source; cần thiết kế asset hoặc primitive riêng nếu triển khai.

## Sources

### Official TLU Brand Guideline

- [Logo - Digital Guideline](https://brand.thanglong.edu.vn/logo/): logo variants, clear space, digital minimum sizes, Thang Long Scarlet `#F32409`, Thang Long Indigo `#000066` và các trường hợp dùng sai.
- [Typography - Digital Guideline](https://brand.thanglong.edu.vn/typography/): vai trò `Thang Long Sans`, `Manrope`, tiếng Việt, tracking/leading và các giới hạn sử dụng.
- [Visual Graphic - Digital Guideline](https://brand.thanglong.edu.vn/visualgraphic/): kỷ hà vuông/tròn/tam giác, lưới mô-đun, tỉ lệ sử dụng, trường hợp đặc biệt và đồ họa khối ngành.

### Existing Product Context

- `src/app/globals.css`: token navy/red, dark mode, `Be Vietnam Pro` và decoration utilities hiện có.
- `public/logo.svg`: logo asset hiện được ứng dụng dùng.
- `src/components/layout/top-navbar.tsx`, `src/components/layout/main-sidebar.tsx`, `src/components/layout/mobile-bottom-nav.tsx`: shell điều hướng hiện tại.
- `src/app/(main)/feed/feed-page-client.tsx`: cấu trúc feed ba vùng, composer, announcement, event và realtime affordances.
- `src/app/admin/announcements/announcements-client.tsx`: workspace thông báo chính thức và governance flow.
