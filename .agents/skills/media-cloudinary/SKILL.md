---
name: Media Management with Cloudinary
description: Patterns upload và quản lý hình ảnh, video ngắn với Cloudinary trong UniConnect
---

# Media Management with Cloudinary

## 1. Cấu hình

### Server-side
```typescript
// src/lib/cloudinary/client.ts
import { v2 as cloudinary } from "cloudinary"

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
})

export { cloudinary }
```

### Client-side (next-cloudinary)
```typescript
// Sử dụng CldUploadWidget hoặc CldImage từ next-cloudinary
import { CldImage, CldUploadWidget } from "next-cloudinary"
```

## 2. Folder Structure trên Cloudinary

```
uniconnect/
├── avatars/          # Ảnh đại diện
│   └── {userId}/
├── posts/            # Media trong bài viết
│   └── {postId}/
├── clubs/            # Ảnh CLB (cover, logo)
│   └── {clubId}/
├── announcements/    # Ảnh trong thông báo
│   └── {announcementId}/
└── messages/         # Media trong tin nhắn
    └── {conversationId}/
```

## 3. Upload Patterns

### Signed Upload (bảo mật, qua server)
```typescript
// src/app/api/upload/route.ts
import { NextRequest, NextResponse } from "next/server"
import { cloudinary } from "@/lib/cloudinary/client"
import { getCurrentUser } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get("file") as File
  const folder = formData.get("folder") as string

  if (!file) return NextResponse.json({ error: "Thiếu file" }, { status: 400 })

  // Kiểm tra kích thước (tối đa 10MB cho ảnh, 50MB cho video ngắn)
  const maxSize = file.type.startsWith("video/") ? 50 * 1024 * 1024 : 10 * 1024 * 1024
  if (file.size > maxSize) {
    return NextResponse.json({ error: "File quá lớn" }, { status: 400 })
  }

  // Upload lên Cloudinary
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const result = await new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder: `uniconnect/${folder}`,
          resource_type: "auto",
          // Tối ưu ảnh tự động
          transformation: file.type.startsWith("image/")
            ? [{ quality: "auto", fetch_format: "auto" }]
            : undefined,
        },
        (error, result) => {
          if (error) reject(error)
          else resolve(result)
        }
      )
      .end(buffer)
  })

  return NextResponse.json({ url: (result as any).secure_url })
}
```

### Upload Widget (client-side, tiện lợi)
```tsx
"use client"

import { CldUploadWidget } from "next-cloudinary"

interface ImageUploaderProps {
  onUploadSuccess: (url: string) => void
  folder: string
}

export function ImageUploader({ onUploadSuccess, folder }: ImageUploaderProps) {
  return (
    <CldUploadWidget
      uploadPreset="uniconnect_preset"
      options={{
        folder: `uniconnect/${folder}`,
        maxFiles: 5,
        maxFileSize: 10_000_000, // 10MB
        resourceType: "auto",
        sources: ["local", "camera"],
      }}
      onSuccess={(result: any) => {
        onUploadSuccess(result.info.secure_url)
      }}
    >
      {({ open }) => (
        <button type="button" onClick={() => open()}>
          Tải ảnh lên
        </button>
      )}
    </CldUploadWidget>
  )
}
```

## 4. Hiển thị ảnh tối ưu

```tsx
import { CldImage } from "next-cloudinary"

// Ảnh avatar (tự động crop, resize)
<CldImage
  src={avatarUrl}
  width={48}
  height={48}
  crop="fill"
  gravity="face"
  alt={`Ảnh đại diện ${userName}`}
  className="rounded-full"
/>

// Ảnh bài viết (responsive, lazy load)
<CldImage
  src={postImageUrl}
  width={600}
  height={400}
  crop="fill"
  alt="Ảnh bài viết"
  sizes="(max-width: 640px) 100vw, 600px"
  loading="lazy"
/>
```

## 5. Giới hạn media

| Loại | Kích thước tối đa | Định dạng |
|---|---|---|
| Ảnh đại diện | 5MB | JPG, PNG, WebP |
| Ảnh bài viết | 10MB | JPG, PNG, WebP, GIF |
| Video ngắn | 50MB, tối đa 60 giây | MP4, WebM |
| Ảnh CLB (cover) | 10MB | JPG, PNG, WebP |

```typescript
// src/utils/constants.ts
export const MEDIA_LIMITS = {
  AVATAR_MAX_SIZE: 5 * 1024 * 1024,        // 5MB
  POST_IMAGE_MAX_SIZE: 10 * 1024 * 1024,    // 10MB
  VIDEO_MAX_SIZE: 50 * 1024 * 1024,         // 50MB
  VIDEO_MAX_DURATION: 60,                    // 60 giây
  MAX_IMAGES_PER_POST: 10,
  ALLOWED_IMAGE_TYPES: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  ALLOWED_VIDEO_TYPES: ["video/mp4", "video/webm"],
} as const
```

## 6. Lưu ý
- **Luôn validate** file type và size trước khi upload
- **Sử dụng `CldImage`** thay vì `<img>` hoặc `next/image` cho ảnh Cloudinary
- **Lưu URL Cloudinary** vào database (Prisma), không lưu file local
- **Folder structure** giúp dễ quản lý và cleanup assets không dùng
