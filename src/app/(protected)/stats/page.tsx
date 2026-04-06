"use client";

import { useState } from "react";
import { TargetsTab } from "@/components/targets/targets-tab";
import { HabitsTab } from "@/components/habits/habits-tab";

type Tab = "targets" | "habits";

const TAB_LABELS: Record<Tab, string> = {
  targets: "Targets",
  habits: "Habits",
};

export default function StatsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("targets");

  return (
    <div className="mx-auto w-full max-w-3xl px-6 pt-4 pb-12 max-sm:px-4">
      <h1 className="mb-6 text-3xl font-bold">Charts</h1>

      {/* Tab selector */}
      <div className="mb-6 flex rounded-full border border-border bg-bg-medium p-1">
        {(Object.keys(TAB_LABELS) as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 cursor-pointer rounded-full py-2 text-center text-sm font-semibold transition-colors ${
              activeTab === tab
                ? "bg-accent text-white"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "targets" && <TargetsTab />}
      {activeTab === "habits" && <HabitsTab />}
    </div>
  );
}
