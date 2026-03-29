"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth-provider";
import Link from "next/link";

type Friend = {
  id: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
};

type FriendRequest = {
  id: string;
  requester_id: string;
  addressee_id: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
};

type Tab = "friends" | "requests";

export default function FriendsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("friends");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incoming, setIncoming] = useState<FriendRequest[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [addUsername, setAddUsername] = useState("");
  const [addError, setAddError] = useState("");
  const [addSuccess, setAddSuccess] = useState("");

  const loadData = useCallback(async () => {
    if (!user) return;
    const supabase = createClient();

    // Load accepted friends
    const { data: friendRows } = await supabase
      .from("friendships_expanded")
      .select("id, requester_id, addressee_id, requester_display_name, requester_username, requester_avatar_url, addressee_display_name, addressee_username, addressee_avatar_url")
      .eq("status", "accepted");

    const friendList: Friend[] = (friendRows ?? []).map((f: Record<string, string>) => {
      const isRequester = f.requester_id === user.id;
      return {
        id: isRequester ? f.addressee_id : f.requester_id,
        display_name: isRequester ? f.addressee_display_name : f.requester_display_name,
        username: isRequester ? f.addressee_username : f.requester_username,
        avatar_url: isRequester ? f.addressee_avatar_url : f.requester_avatar_url,
      };
    });
    setFriends(friendList);

    // Load pending incoming requests
    const { data: inRows } = await supabase
      .from("friendships_expanded")
      .select("id, requester_id, addressee_id, requester_display_name, requester_username, requester_avatar_url")
      .eq("status", "pending")
      .eq("addressee_id", user.id);

    setIncoming(
      (inRows ?? []).map((r: Record<string, string>) => ({
        id: r.id,
        requester_id: r.requester_id,
        addressee_id: r.addressee_id,
        display_name: r.requester_display_name,
        username: r.requester_username,
        avatar_url: r.requester_avatar_url,
      }))
    );

    // Load pending outgoing requests
    const { data: outRows } = await supabase
      .from("friendships_expanded")
      .select("id, requester_id, addressee_id, addressee_display_name, addressee_username, addressee_avatar_url")
      .eq("status", "pending")
      .eq("requester_id", user.id);

    setOutgoing(
      (outRows ?? []).map((r: Record<string, string>) => ({
        id: r.id,
        requester_id: r.requester_id,
        addressee_id: r.addressee_id,
        display_name: r.addressee_display_name,
        username: r.addressee_username,
        avatar_url: r.addressee_avatar_url,
      }))
    );

    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleAccept(requestId: string) {
    const supabase = createClient();
    await supabase
      .from("friendships")
      .update({ status: "accepted" })
      .eq("id", requestId);
    loadData();
  }

  async function handleReject(requestId: string) {
    const supabase = createClient();
    await supabase.from("friendships").delete().eq("id", requestId);
    loadData();
  }

  async function handleUnfriend(friendId: string) {
    if (!user) return;
    const supabase = createClient();
    await supabase
      .from("friendships")
      .delete()
      .or(
        `and(requester_id.eq.${user.id},addressee_id.eq.${friendId}),and(requester_id.eq.${friendId},addressee_id.eq.${user.id})`
      );
    loadData();
  }

  async function handleSendRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setAddError("");
    setAddSuccess("");

    const username = addUsername.trim().toLowerCase();
    if (!username) return;

    const supabase = createClient();

    // Look up user by username
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, username")
      .eq("username", username)
      .maybeSingle();

    if (!profile) {
      setAddError("User not found.");
      return;
    }

    if (profile.id === user.id) {
      setAddError("You can't add yourself.");
      return;
    }

    // Check if friendship already exists
    const { data: existing } = await supabase
      .from("friendships")
      .select("id, status")
      .or(
        `and(requester_id.eq.${user.id},addressee_id.eq.${profile.id}),and(requester_id.eq.${profile.id},addressee_id.eq.${user.id})`
      )
      .maybeSingle();

    if (existing) {
      setAddError(
        existing.status === "accepted"
          ? "You're already friends."
          : "Request already pending."
      );
      return;
    }

    const { error } = await supabase
      .from("friendships")
      .insert({ requester_id: user.id, addressee_id: profile.id });

    if (error) {
      setAddError("Failed to send request.");
      return;
    }

    setAddSuccess(`Friend request sent to @${username}!`);
    setAddUsername("");
    loadData();
  }

  const filteredFriends = search.trim()
    ? friends.filter(
        (f) =>
          f.display_name?.toLowerCase().includes(search.toLowerCase()) ||
          f.username?.toLowerCase().includes(search.toLowerCase())
      )
    : friends;

  const pendingCount = incoming.length + outgoing.length;

  return (
    <div className="mx-auto w-full max-w-2xl px-6 pt-4 pb-12 max-sm:px-4">
      <h1 className="mb-6 text-3xl font-bold">Friends</h1>

      {/* Send request */}
      <form onSubmit={handleSendRequest} className="mb-6 flex gap-2">
        <input
          type="text"
          placeholder="Add friend by username..."
          value={addUsername}
          onChange={(e) => setAddUsername(e.target.value)}
          className="flex-1 rounded-(--radius-input) border-[1.5px] border-border bg-bg-light px-4 py-2.5 font-serif text-lg outline-none transition-colors placeholder:text-text-subtle focus:border-accent"
        />
        <button
          type="submit"
          className="cursor-pointer rounded-(--radius-input) bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-88"
        >
          Send
        </button>
      </form>
      {addError && <p className="mb-4 text-sm text-error">{addError}</p>}
      {addSuccess && (
        <p className="mb-4 text-sm text-green-700">{addSuccess}</p>
      )}

      {/* Tabs */}
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setTab("friends")}
          className={`cursor-pointer rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
            tab === "friends"
              ? "bg-accent text-white"
              : "bg-bg-medium text-text-muted hover:bg-accent/10"
          }`}
        >
          Friends ({friends.length})
        </button>
        <button
          onClick={() => setTab("requests")}
          className={`cursor-pointer rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
            tab === "requests"
              ? "bg-accent text-white"
              : "bg-bg-medium text-text-muted hover:bg-accent/10"
          }`}
        >
          Requests{pendingCount > 0 ? ` (${pendingCount})` : ""}
        </button>
      </div>

      {loading ? (
        <p className="py-12 text-center text-text-muted">Loading...</p>
      ) : tab === "friends" ? (
        <>
          {friends.length > 3 && (
            <input
              type="text"
              placeholder="Search friends..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mb-4 w-full rounded-(--radius-input) border-[1.5px] border-border bg-bg-light px-4 py-2.5 font-serif outline-none transition-colors placeholder:text-text-subtle focus:border-accent"
            />
          )}
          {filteredFriends.length === 0 ? (
            <p className="py-12 text-center text-text-muted">
              {friends.length === 0
                ? "No friends yet. Send a friend request above!"
                : "No friends match your search."}
            </p>
          ) : (
            <div className="space-y-2">
              {filteredFriends.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center gap-3 rounded-(--radius-card) border border-border-subtle bg-bg-medium p-3"
                >
                  <Avatar url={f.avatar_url} name={f.display_name} />
                  <Link
                    href={`/friends/${f.id}`}
                    className="flex-1 hover:underline"
                  >
                    <p className="font-semibold">{f.display_name}</p>
                    <p className="text-sm text-text-muted">@{f.username}</p>
                  </Link>
                  <button
                    onClick={() => handleUnfriend(f.id)}
                    className="cursor-pointer text-xs text-text-subtle hover:text-error"
                  >
                    Unfriend
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="space-y-6">
          {/* Incoming */}
          <div>
            <h2 className="mb-2 text-sm font-semibold text-text-muted">
              Incoming ({incoming.length})
            </h2>
            {incoming.length === 0 ? (
              <p className="text-sm text-text-subtle">No pending requests.</p>
            ) : (
              <div className="space-y-2">
                {incoming.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center gap-3 rounded-(--radius-card) border border-border-subtle bg-bg-medium p-3"
                  >
                    <Avatar url={r.avatar_url} name={r.display_name} />
                    <div className="flex-1">
                      <p className="font-semibold">{r.display_name}</p>
                      <p className="text-sm text-text-muted">@{r.username}</p>
                    </div>
                    <button
                      onClick={() => handleAccept(r.id)}
                      className="cursor-pointer rounded-(--radius-input) bg-accent px-3 py-1 text-xs font-semibold text-white transition-opacity hover:opacity-88"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleReject(r.id)}
                      className="cursor-pointer text-xs text-text-subtle hover:text-error"
                    >
                      Reject
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Outgoing */}
          <div>
            <h2 className="mb-2 text-sm font-semibold text-text-muted">
              Outgoing ({outgoing.length})
            </h2>
            {outgoing.length === 0 ? (
              <p className="text-sm text-text-subtle">No sent requests.</p>
            ) : (
              <div className="space-y-2">
                {outgoing.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center gap-3 rounded-(--radius-card) border border-border-subtle bg-bg-medium p-3"
                  >
                    <Avatar url={r.avatar_url} name={r.display_name} />
                    <div className="flex-1">
                      <p className="font-semibold">{r.display_name}</p>
                      <p className="text-sm text-text-muted">@{r.username}</p>
                    </div>
                    <span className="text-xs text-text-subtle">Pending</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Avatar({ url, name }: { url: string | null; name: string }) {
  if (url) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={url}
        alt={name}
        className="h-10 w-10 rounded-full object-cover"
      />
    );
  }
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/15 text-sm font-bold text-accent">
      {name?.[0]?.toUpperCase() ?? "?"}
    </div>
  );
}
