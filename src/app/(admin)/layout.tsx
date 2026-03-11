export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Admin sidebar sẽ được thêm sau */}
      <main className="flex-1 p-6">
        {children}
      </main>
    </div>
  );
}
