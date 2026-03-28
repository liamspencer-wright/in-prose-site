"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "./auth-provider";

const NAV_ITEMS = [
  { href: "/", icon: "/icons/home.png", label: "Home" },
  { href: "/search", icon: "/icons/search.png", label: "Search" },
  { href: "/library", icon: "/icons/library.png", label: "Library" },
  { href: "/friends", icon: "/icons/friends.png", label: "Friends" },
  { href: "/stats", icon: "/icons/charts.png", label: "Stats" },
  { href: "/account", icon: "/icons/account.png", label: "Account" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);

  if (!user) return <main id="main-content">{children}</main>;

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
          aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
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
        <nav aria-label="Main navigation" className="flex flex-1 flex-col gap-1 px-2 pt-4">
          {NAV_ITEMS.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
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

        {/* Settings, Contact + Logout */}
        <div className="border-t border-border px-2 py-3">
          <Link
            href="/contact"
            aria-label="Contact"
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
              pathname.startsWith("/contact")
                ? "bg-accent/15 opacity-100"
                : "opacity-50 hover:bg-accent/5 hover:opacity-80"
            }`}
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6 flex-shrink-0 fill-current">
              <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
            </svg>
            {expanded && (
              <span className="text-sm font-semibold">Contact</span>
            )}
          </Link>
          <Link
            href="/settings"
            aria-label="Settings"
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
              pathname.startsWith("/settings")
                ? "bg-accent/15 opacity-100"
                : "opacity-50 hover:bg-accent/5 hover:opacity-80"
            }`}
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6 flex-shrink-0 fill-current">
              <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z" />
            </svg>
            {expanded && (
              <span className="text-sm font-semibold">Settings</span>
            )}
          </Link>
          <button
            onClick={signOut}
            aria-label="Log out"
            className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-accent opacity-50 transition-colors hover:bg-accent/5 hover:opacity-80"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6 flex-shrink-0 fill-current">
              <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
            </svg>
            {expanded && <span>Log out</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main id="main-content" className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
