import { BottomNav } from "@/components/bottom-nav";

export default function AppShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto min-h-dvh max-w-md bg-background">
      {children}
      <BottomNav />
    </div>
  );
}
