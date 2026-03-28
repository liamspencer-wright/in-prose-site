"use client";

import { useAuth } from "@/components/auth-provider";
import { Dashboard } from "@/components/dashboard";

export function HomePageSwitch({
  marketingPage,
}: {
  marketingPage: React.ReactNode;
}) {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (user) return <Dashboard />;

  return <>{marketingPage}</>;
}
