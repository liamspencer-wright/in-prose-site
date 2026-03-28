"use client";

import Link from "next/link";
import Image from "next/image";
import { useAuth } from "./auth-provider";

export function NavBar() {
  const { user, loading, signOut } = useAuth();

  // Sidebar handles navigation when logged in
  if (user) return null;

  return (
    <nav aria-label="Main navigation" className="flex items-center justify-between px-6 py-4 max-sm:px-4">
      <Link href="/">
        <Image
          src="/logo.png"
          alt="in prose logo"
          width={100}
          height={100}
          className="h-auto w-[100px] max-sm:w-[80px]"
          priority
        />
      </Link>

      {loading ? (
        <div className="h-10 w-20" />
      ) : (
        <Link
          href="/login"
          className="rounded-(--radius-input) border-[1.5px] border-accent px-5 py-2 font-serif text-base font-semibold text-accent transition-colors hover:bg-accent hover:text-white"
        >
          Log in
        </Link>
      )}
    </nav>
  );
}

