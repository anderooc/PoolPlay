import { getCurrentAuthProfile } from "@/lib/auth";
import { MobileNav } from "./mobile-nav";
import { HeaderNav } from "./header-nav";
import { PoolPlayMark } from "./poolplay-mark";
import { UserMenu } from "./user-menu";

export async function Header() {
  const user = await getCurrentAuthProfile();

  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur-sm transition-[background-color,backdrop-filter,padding,gap] duration-300 ease-out motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-1 md:gap-4 md:px-6">
      <PoolPlayMark href="/" wordmarkClassName="text-lg font-bold" />
      <MobileNav />
      <HeaderNav className="min-w-0" />
      <div className="flex-1" />
      {user && <UserMenu fullName={user.fullName} email={user.email} />}
    </header>
  );
}
