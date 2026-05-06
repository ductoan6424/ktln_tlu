This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## PWA & Web Push

Dự án hỗ trợ cài đặt như Progressive Web App và nhận thông báo đẩy qua Web Push API (Serwist + VAPID, self-hosted, không phụ thuộc dịch vụ ngoài).

### Setup lần đầu

1. **Sinh VAPID keys** (chỉ chạy một lần, lưu cố định trong `.env`):

   ```bash
   npx web-push generate-vapid-keys --json
   ```

   Copy `publicKey` → `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `privateKey` → `VAPID_PRIVATE_KEY`. Đặt `VAPID_SUBJECT=mailto:admin@tlu.edu.vn` (hoặc email liên hệ thật).

2. **Generate icons PWA** từ `public/logo.svg`:

   ```bash
   npm run pwa:icons
   ```

   Sinh ra `public/icons/*.png` (192/256/384/512, maskable, apple-touch-icon, badge).

3. **Build production** (Service worker chỉ enable ở production để không cản trở dev):

   ```bash
   npm run build
   npm start
   ```

   Mở DevTools → Application → kiểm tra `manifest.webmanifest`, Service Worker `/sw.js`, và nút **Install** trên thanh địa chỉ.

### Bật/tắt thông báo đẩy

User truy cập `/settings?section=notifications` → bật toggle **Thông báo đẩy trên thiết bị này**. Hệ thống sẽ:

- Yêu cầu quyền `Notification` từ trình duyệt.
- Đăng ký subscription qua `pushManager.subscribe`.
- Lưu vào DB (model `PushSubscription` trong Prisma).

Mỗi notification tạo qua `lib/notifications/service.ts` (`createNotification`) sẽ tự động gửi web push tới mọi subscription active của recipient. Subscription hết hạn (404/410) tự động được xóa.

### Lưu ý iOS Safari

iOS chỉ hỗ trợ Web Push khi user **Add to Home Screen** trước, sau đó mở app từ icon home screen. Đây là behavior chuẩn của Apple.
