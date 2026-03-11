---
description: Quy trình triển khai ứng dụng UniConnect lên production
---

# Triển khai ứng dụng

## Môi trường triển khai
- **Hosting**: Vercel
- **Database**: Supabase (PostgreSQL)
- **Cache**: Redis Cloud
- **Realtime**: Ably
- **Media**: Cloudinary

## Trước khi triển khai

### Checklist bắt buộc
- [ ] Tất cả tests pass: `npm test`
- [ ] Build thành công: `npm run build` (không có errors)
- [ ] Không có TypeScript errors
- [ ] Không còn console.log debug
- [ ] Environment variables production đã cấu hình
- [ ] Prisma migrations đã chạy trên production database
- [ ] RLS policies đã thiết lập cho bảng mới

### Kiểm tra environment variables
Đảm bảo tất cả biến trong `.env.example` đã có giá trị trên Vercel:
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
DATABASE_URL
REDIS_URL
NEXT_PUBLIC_ABLY_API_KEY
ABLY_API_KEY
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
```

## Quy trình deploy

### 1. Deploy lên Vercel
```bash
# Push code lên branch main
git push origin main

# Vercel tự động deploy qua GitHub integration
# Hoặc deploy thủ công:
npx vercel --prod
```

### 2. Chạy migration trên production
```bash
npx prisma migrate deploy
```

### 3. Verify sau deploy
1. Mở URL production trên trình duyệt
2. Kiểm tra:
   - [ ] Trang load thành công (không 500)
   - [ ] Đăng nhập hoạt động
   - [ ] Feed hiển thị đúng
   - [ ] Realtime hoạt động (nhắn tin, thông báo)
   - [ ] Upload media hoạt động
3. Kiểm tra Vercel logs nếu có lỗi

### 4. Rollback (nếu cần)
```bash
# Trên Vercel Dashboard:
# Deployments → chọn deployment trước đó → Promote to Production

# Hoặc dùng CLI:
npx vercel rollback
```

> **QUAN TRỌNG**: Phải xin phép user trước khi deploy lên production.
