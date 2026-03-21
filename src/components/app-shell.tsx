"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "./auth-provider";

const NAV_ITEMS = [
  { href: "/", icon: "/icons/home.png", label: "Home" },
  { href: "/library", icon: "/icons/library.png", label: "Library" },
  { href: "/friends", icon: "/icons/friends.png", label: "Friends" },
  { href: "/stats", icon: "/icons/charts.png", label: "Stats" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);

  if (!user) return <>{children}</>;

  return (
    <div className="flex min-h-svh">
      {/* Sidebar */}
      <aside
        className={`sticky top-0 flex h-svh flex-col border-r border-border bg-bg-medium transition-all duration-200 ${
          expanded ? "w-52" : "w-16"
        }`}
      >
        {/* Logo + toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex cursor-pointer items-center gap-3 border-b-2 border-accent px-4 py-4"
        >
          <Image
            src="/logo.png"
            alt="in prose"
            width={32}
            height={32}
            className="h-8 w-8 flex-shrink-0"
          />
          {expanded && (
            <span className="text-lg font-bold lowercase">in prose</span>
          )}
        </button>

        {/* Nav items */}
        <nav className="flex flex-1 flex-col gap-1 px-2 pt-4">
          {NAV_ITEMS.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                  active
                    ? "bg-accent/15 opacity-100"
                    : "opacity-50 hover:bg-accent/5 hover:opacity-80"
                }`}
              >
                <Image
                  src={item.icon}
                  alt=""
                  width={24}
                  height={24}
                  className="h-6 w-6 flex-shrink-0"
                />
                {expanded && (
                  <span className="text-sm font-semibold">{item.label}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Account / logout */}
        <div className="border-t border-border px-2 py-3">
          <button
            onClick={signOut}
            className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-accent transition-colors hover:bg-accent/5 ${
              expanded ? "" : "justify-center"
            }`}
          >
            <Image
              src="/icons/account.png"
              alt=""
              width={24}
              height={24}
              className="h-6 w-6 flex-shrink-0"
            />
            {expanded && <span>Log out</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
