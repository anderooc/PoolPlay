import { getCurrentUser } from "@/lib/auth";
import { MobileNav } from "./mobile-nav";
import { UserMenu } from "./user-menu";

export async function Header() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-background px-4 md:px-6">
      <MobileNav />
      <div className="flex-1" />
      {user && <UserMenu fullName={user.fullName} email={user.email} />}
    </header>
  );
}
