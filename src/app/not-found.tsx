import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4">
      <h1 className="text-6xl font-semibold text-primary">404</h1>
      <h2 className="text-2xl font-semibold">Không tìm thấy trang</h2>
      <p className="text-muted-foreground">Trang bạn đang tìm kiếm không tồn tại.</p>
      <Link
        href="/"
        className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
      >
        Về trang chủ
      </Link>
    </div>
  );
}
