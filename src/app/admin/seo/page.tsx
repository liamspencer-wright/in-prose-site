import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

/**
 * /admin/seo — internal SEO dashboard.
 *
 * Phase 1 (this commit): surfaces what we already collect locally —
 *   - AI-referrer event totals (last 7d / 30d) by source
 *   - Recent AI-referrer events (path + source + time)
 *   - Latest weekly metric snapshot row, if any
 *
 * Future (deferred): Search Console + Bing Webmaster API ingestion populating
 * the gsc_ and bing_ columns of seo_metrics_snapshots; citation tracker results.
 */

export const dynamic = "force-dynamic";

type ReferrerEvent = {
  id: number;
  occurred_at: string;
  referrer_host: string;
  source: string;
  path: string;
};

type SourceCount = { source: string; count: number };

export default async function SeoDashboardPage() {
  const supabase = await createClient();

  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: events30d } = await supabase
    .from("seo_referrer_events")
    .select("id, occurred_at, referrer_host, source, path")
    .gte("occurred_at", since30d)
    .order("occurred_at", { ascending: false })
    .limit(500);

  const ev30 = (events30d ?? []) as ReferrerEvent[];
  const ev7 = ev30.filter((e) => e.occurred_at >= since7d);

  const sources7d = countBySource(ev7);
  const sources30d = countBySource(ev30);

  const { data: snapshots } = await supabase
    .from("seo_metrics_snapshots")
    .select("*")
    .order("captured_at", { ascending: false })
    .limit(1);

  const snapshot = snapshots?.[0] ?? null;

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <Link
        href="/admin"
        className="mb-6 inline-block text-sm text-text-muted hover:text-text-primary"
      >
        ← Admin
      </Link>

      <h1 className="text-3xl font-bold">SEO dashboard</h1>
      <p className="mt-1 text-text-muted">
        Internal-only. Tracking organic + AI-mediated discovery for inprose.co.uk.
      </p>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">AI referrers — last 7d</h2>
        <Counter label="Total events" value={ev7.length} />
        <SourceTable rows={sources7d} />
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">AI referrers — last 30d</h2>
        <Counter label="Total events" value={ev30.length} />
        <SourceTable rows={sources30d} />
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">Recent events</h2>
        {ev30.length === 0 ? (
          <p className="mt-2 text-text-muted">
            No AI-referrer events recorded yet. Beacon fires from
            <code className="mx-1 rounded bg-bg-medium px-1">
              {"<AiReferrerBeacon />"}
            </code>
            on every public page.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-border-subtle text-sm">
            {ev30.slice(0, 25).map((e) => (
              <li key={e.id} className="flex justify-between gap-4 py-2">
                <span className="font-mono text-text-muted">
                  {new Date(e.occurred_at).toLocaleString("en-GB")}
                </span>
                <span className="font-semibold">{e.source}</span>
                <span className="truncate text-text-muted" title={e.path}>
                  {e.path}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">Latest weekly snapshot</h2>
        {!snapshot ? (
          <p className="mt-2 text-text-muted">
            No snapshots captured yet. Snapshots populate via the weekly cron
            once Search Console + Bing API ingestion is wired (deferred from
            this ticket).
          </p>
        ) : (
          <pre className="mt-3 overflow-x-auto rounded-(--radius-card) bg-bg-medium p-4 text-xs">
            {JSON.stringify(snapshot, null, 2)}
          </pre>
        )}
      </section>

      <section className="mt-10 rounded-(--radius-card) border border-border-subtle p-4 text-sm text-text-muted">
        <p className="font-semibold text-text-primary">Configuration checklist</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            <code>GOOGLE_SITE_VERIFICATION</code> env — set to verify in Google
            Search Console.
          </li>
          <li>
            <code>BING_SITE_VERIFICATION</code> env — set to verify in Bing
            Webmaster Tools.
          </li>
          <li>
            <code>INDEXNOW_KEY</code> env — 8–128 chars; key file served at
            <code className="mx-1">/&lt;key&gt;.txt</code>.
          </li>
          <li>
            <code>SUPABASE_SERVICE_ROLE_KEY</code> env — required for the
            referrer beacon to write events.
          </li>
        </ul>
      </section>
    </div>
  );
}

function countBySource(events: ReferrerEvent[]): SourceCount[] {
  const counts = new Map<string, number>();
  for (const e of events) {
    counts.set(e.source, (counts.get(e.source) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count);
}

function Counter({ label, value }: { label: string; value: number }) {
  return (
    <div className="mt-2">
      <span className="text-2xl font-bold">{value}</span>
      <span className="ml-2 text-text-muted">{label}</span>
    </div>
  );
}

function SourceTable({ rows }: { rows: SourceCount[] }) {
  if (rows.length === 0) {
    return <p className="mt-2 text-sm text-text-muted">No events.</p>;
  }
  return (
    <table className="mt-3 w-full text-left text-sm">
      <thead className="text-text-muted">
        <tr>
          <th className="pb-2">Source</th>
          <th className="pb-2 text-right">Events</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.source} className="border-t border-border-subtle">
            <td className="py-2 font-mono">{r.source}</td>
            <td className="py-2 text-right">{r.count}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
