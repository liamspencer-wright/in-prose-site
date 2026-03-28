"use client";

import { useState } from "react";

type Tab = "feed" | "friends" | "find";

const TAB_LABELS: Record<Tab, string> = {
  feed: "Feed",
  friends: "Friends",
  find: "Find",
};

export default function FriendsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("feed");

  return (
    <div className="mx-auto w-full max-w-4xl px-6 pt-4 pb-12 max-sm:px-4">
      <h1 className="mb-6 text-3xl font-bold">Friends</h1>

      {/* Tab switcher */}
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
      {activeTab === "feed" && <FeedTab />}
      {activeTab === "friends" && <FriendsTab />}
      {activeTab === "find" && <FindTab />}
    </div>
  );
}

function FeedTab() {
  return (
    <p className="py-12 text-center text-text-muted">
      Activity feed coming soon.
    </p>
  );
}

function FriendsTab() {
  return (
    <p className="py-12 text-center text-text-muted">
      Friends list coming soon.
    </p>
  );
}

function FindTab() {
  return (
    <p className="py-12 text-center text-text-muted">
      Find friends coming soon.
    </p>
  );
}
