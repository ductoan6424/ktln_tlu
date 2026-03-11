export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar sẽ được thêm sau */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
