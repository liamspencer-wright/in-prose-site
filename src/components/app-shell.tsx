"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "./auth-provider";

const TABS = [
  { href: "/", icon: "/icons/home.png", label: "Home" },
  { href: "/friends", icon: "/icons/friends.png", label: "Friends" },
  { href: "/library", icon: "/icons/library.png", label: "Library" },
  { href: "/stats", icon: "/icons/charts.png", label: "Stats" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname();

  // Only show app shell for authenticated users on app pages
  if (!user) return <>{children}</>;

  const isHome = pathname === "/";

  return (
    <div className="flex min-h-svh flex-col">
      {/* Brand header */}
      <header className="sticky top-0 z-40 border-b-2 border-accent bg-bg-medium">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="in prose"
              width={32}
              height={32}
              className="h-8 w-8"
            />
            <span className="text-lg font-bold lowercase">in prose</span>
          </Link>
          {isHome && (
            <span className="hidden text-sm text-text-muted sm:block">
              Books and data — perfectly bound.
            </span>
          )}
          <UserMenu />
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 pb-20">{children}</main>

      {/* Bottom toolbar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-accent bg-bg-medium">
        <div className="mx-auto flex max-w-md items-center justify-around py-2">
          {TABS.map((tab) => {
            const active = tab.href === "/"
              ? pathname === "/"
              : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-col items-center gap-0.5 rounded-lg px-4 py-1.5 transition-opacity ${
                  active ? "opacity-100" : "opacity-40 hover:opacity-70"
                }`}
              >
                <Image
                  src={tab.icon}
                  alt=""
                  width={28}
                  height={28}
                  className="h-7 w-7"
                />
                <span className="text-[10px] font-semibold">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function UserMenu() {
  const { signOut } = useAuth();
  return (
    <button
      onClick={signOut}
      className="cursor-pointer rounded-(--radius-input) px-3 py-1.5 text-sm font-semibold text-accent transition-colors hover:bg-accent/10"
    >
      Log out
    </button>
  );
}
