"use client";

import { useState, useCallback, useRef } from "react";
import { useAuth } from "@/components/auth-provider";
import Papa from "papaparse";
import Link from "next/link";

/* ── Types ── */

type BookMeta = {
  isbn13: string;
  title: string;
  authors: string[];
  coverUrl: string | null;
  pubYear: number | null;
  publisher: string | null;
  pages: number | null;
  synopsis: string | null;
};

type ImportRow = {
  id: number;
  isbn13: string;
  csvTitle: string | null;
  csvRating: number | null;
  csvStatus: string | null;
  csvStartedAt: string | null;
  csvFinishedAt: string | null;
  csvReview: string | null;
  meta: BookMeta | null;
  metaStatus: "pending" | "loading" | "found" | "not_found";
  selected: boolean;
  isDuplicate: boolean;
  // Editable fields for approval
  status: string;
  ownership: string;
  visibility: string;
  rating: number | null;
  review: string | null;
  started_at: string | null;
  finished_at: string | null;
};

type Step = "upload" | "mapping" | "fetching" | "approval" | "done";

type ImportResult = {
  added: number;
  skipped: number;
  duplicates: number;
  errors: string[];
};

/* ── Column mapping patterns ── */

const FIELD_PATTERNS: Record<string, RegExp> = {
  isbn13: /^(isbn[_\- ]?13|isbn)$/i,
  title: /^(title|book\s*title|name)$/i,
  rating: /^(rating|my\s*rating|score|star\s*rating)$/i,
  status: /^(status|shelf|exclusive\s*shelf|read\s*status|bookshelves)$/i,
  started_at: /^(date\s*started|started[_ ]?at|start\s*date)$/i,
  finished_at:
    /^(date\s*(read|finished)|finished[_ ]?at|finish\s*date|date\s*completed)$/i,
  review: /^(review|my\s*review|notes|comments)$/i,
};

/* ── Status mapping ── */

function mapStatus(raw: string | null): string {
  if (!raw) return "to_read";
  const s = raw.toLowerCase().trim();
  if (/^(read|finished|completed)$/.test(s)) return "finished";
  if (/^(currently[- ]reading|reading|in[- ]progress)$/.test(s)) return "reading";
  if (/^(to[- ]read|want[- ]to[- ]read|tbr)$/.test(s)) return "to_read";
  if (/^(did[- ]not[- ]finish|dnf|abandoned)$/.test(s)) return "dnf";
  return "to_read";
}

/* ── Rating normalisation ── */

function normaliseRating(raw: string | null, allRatings: (string | null)[]): number | null {
  if (!raw) return null;
  const n = parseFloat(raw);
  if (isNaN(n)) return null;

  // Detect scale from all ratings
  const maxRating = allRatings.reduce((max, r) => {
    const v = r ? parseFloat(r) : 0;
    return isNaN(v) ? max : Math.max(max, v);
  }, 0);

  if (maxRating <= 5) return Math.round(n * 2); // 0-5 → 0-10
  if (maxRating <= 10) return Math.round(n); // 0-10 → 0-10
  if (maxRating <= 100) return Math.round(n / 10); // 0-100 → 0-10
  return Math.round(n);
}

/* ── Date normalisation ── */

function normaliseDate(raw: string | null): string | null {
  if (!raw || !raw.trim()) return null;
  const d = new Date(raw.trim());
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

/* ── ISBN cleaning ── */

function cleanIsbn(raw: string | null): string | null {
  if (!raw) return null;
  // Remove hyphens, spaces, quotes, equals signs (Excel prefix)
  const cleaned = raw.replace(/[\s"'=-]/g, "");
  // Accept 13-digit or 10-digit ISBNs
  if (/^\d{13}$/.test(cleaned)) return cleaned;
  if (/^\d{9}[\dXx]$/.test(cleaned)) return cleaned;
  return null;
}

/* ── Component ── */

export default function ImportPage() {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>("upload");
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [fieldMap, setFieldMap] = useState<Record<string, number | null>>({});
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [fetchProgress, setFetchProgress] = useState({ done: 0, total: 0 });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef(false);

  /* ── Upload step ── */

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    Papa.parse(file, {
      skipEmptyLines: true,
      complete(results) {
        const data = results.data as string[][];
        if (data.length < 2) {
          setError("CSV must have a header row and at least one data row.");
          return;
        }

        const headers = data[0];
        const dataRows = data.slice(1);

        if (dataRows.length > 500) {
          setError("Maximum 500 rows allowed. Please split your file.");
          return;
        }

        setRawHeaders(headers);
        setRawRows(dataRows);

        // Auto-detect column mapping (field → column index)
        const autoMap: Record<string, number | null> = {};
        for (const field of Object.keys(FIELD_PATTERNS)) {
          autoMap[field] = null;
        }
        headers.forEach((h, i) => {
          const trimmed = h.trim();
          for (const [field, pattern] of Object.entries(FIELD_PATTERNS)) {
            if (pattern.test(trimmed) && autoMap[field] === null) {
              autoMap[field] = i;
              break;
            }
          }
        });
        setFieldMap(autoMap);
        setStep("mapping");
      },
      error() {
        setError("Failed to parse CSV file. Please check the format.");
      },
    });
  }, []);

  /* ── Mapping step ── */

  const handleMappingConfirm = useCallback(() => {
    if (fieldMap.isbn13 === null || fieldMap.isbn13 === undefined) {
      setError("You must map a CSV column to ISBN.");
      return;
    }

    setError(null);

    const isbnIdx = fieldMap.isbn13 ?? -1;
    const titleIdx = fieldMap.title ?? -1;
    const ratingIdx = fieldMap.rating ?? -1;
    const statusIdx = fieldMap.status ?? -1;
    const startedIdx = fieldMap.started_at ?? -1;
    const finishedIdx = fieldMap.finished_at ?? -1;
    const reviewIdx = fieldMap.review ?? -1;

    // Collect all raw ratings for scale detection
    const allRatings = ratingIdx >= 0 ? rawRows.map((r) => r[ratingIdx] ?? null) : [];

    const parsed: ImportRow[] = [];
    let id = 0;

    for (const row of rawRows) {
      const isbn = cleanIsbn(row[isbnIdx] ?? null);
      if (!isbn) continue;

      const csvRating =
        ratingIdx >= 0
          ? normaliseRating(row[ratingIdx] ?? null, allRatings)
          : null;
      const csvStatus = statusIdx >= 0 ? mapStatus(row[statusIdx] ?? null) : "to_read";
      const csvStartedAt = startedIdx >= 0 ? normaliseDate(row[startedIdx] ?? null) : null;
      const csvFinishedAt = finishedIdx >= 0 ? normaliseDate(row[finishedIdx] ?? null) : null;
      const csvReview = reviewIdx >= 0 ? (row[reviewIdx]?.trim() || null) : null;
      const csvTitle = titleIdx >= 0 ? (row[titleIdx]?.trim() || null) : null;

      parsed.push({
        id: id++,
        isbn13: isbn,
        csvTitle,
        csvRating,
        csvStatus,
        csvStartedAt,
        csvFinishedAt,
        csvReview,
        meta: null,
        metaStatus: "pending",
        selected: true,
        isDuplicate: false,
        status: csvStatus,
        ownership: "not_owned",
        visibility: "public",
        rating: csvRating,
        review: csvReview,
        started_at: csvStartedAt,
        finished_at: csvFinishedAt,
      });
    }

    if (parsed.length === 0) {
      setError("No valid ISBNs found in the CSV.");
      return;
    }

    // Deduplicate by ISBN (keep first occurrence)
    const seen = new Set<string>();
    const deduped = parsed.filter((r) => {
      if (seen.has(r.isbn13)) return false;
      seen.add(r.isbn13);
      return true;
    });

    setRows(deduped);
    setStep("fetching");
    fetchMetadata(deduped);
  }, [fieldMap, rawRows]);

  /* ── Metadata fetch step ── */

  const fetchMetadata = useCallback(
    async (importRows: ImportRow[]) => {
      abortRef.current = false;
      setFetchProgress({ done: 0, total: importRows.length });

      // Check which ISBNs are already in user's library
      const existingIsbns = new Set<string>();
      try {
        const res = await fetch("/api/library/isbns");
        if (res.ok) {
          const data = await res.json();
          for (const isbn of data.isbns ?? []) existingIsbns.add(isbn);
        }
      } catch {
        // Continue without duplicate detection
      }

      const updated = [...importRows];

      // Fetch metadata in batches of 5
      for (let i = 0; i < updated.length; i += 5) {
        if (abortRef.current) break;

        const batch = updated.slice(i, i + 5);
        await Promise.all(
          batch.map(async (row) => {
            const idx = updated.findIndex((r) => r.id === row.id);
            updated[idx] = { ...updated[idx], metaStatus: "loading" };

            try {
              const res = await fetch(
                `/api/import?isbn=${encodeURIComponent(row.isbn13)}`
              );
              if (res.ok) {
                const meta: BookMeta | null = await res.json();
                updated[idx] = {
                  ...updated[idx],
                  meta,
                  metaStatus: meta ? "found" : "not_found",
                  isDuplicate: existingIsbns.has(row.isbn13),
                };
              } else {
                updated[idx] = { ...updated[idx], metaStatus: "not_found" };
              }
            } catch {
              updated[idx] = { ...updated[idx], metaStatus: "not_found" };
            }
          })
        );

        setRows([...updated]);
        setFetchProgress({ done: Math.min(i + 5, updated.length), total: updated.length });
      }

      setStep("approval");
    },
    []
  );

  /* ── Approval step helpers ── */

  const toggleRow = useCallback((id: number) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, selected: !r.selected } : r))
    );
  }, []);

  const toggleAll = useCallback(() => {
    setRows((prev) => {
      const allSelected = prev.every((r) => r.selected);
      return prev.map((r) => ({ ...r, selected: !allSelected }));
    });
  }, []);

  const updateRow = useCallback(
    (id: number, field: string, value: string | number | null) => {
      setRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
      );
    },
    []
  );

  /* ── Submit step ── */

  const handleSubmit = useCallback(async () => {
    const selected = rows.filter((r) => r.selected && !r.isDuplicate);
    if (selected.length === 0) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          books: selected.map((r) => ({
            isbn13: r.isbn13,
            status: r.status,
            ownership: r.ownership,
            visibility: r.visibility,
            rating: r.rating,
            review: r.review,
            started_at: r.started_at,
            finished_at: r.finished_at,
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Import failed");
        setSubmitting(false);
        return;
      }

      const data: ImportResult = await res.json();
      setResult(data);
      setStep("done");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [rows]);

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-4xl px-6 pt-4 pb-12">
        <p className="py-12 text-center text-text-muted">
          Please log in to import books.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-6 pt-4 pb-12 max-sm:px-4">
      <h1 className="mb-2 text-3xl font-bold">Import books</h1>
      <p className="mb-8 text-text-muted">
        Upload a CSV file from Goodreads, StoryGraph, or any book tracking
        service to import your reading history.
      </p>

      {/* Step indicator */}
      <StepIndicator current={step} />

      {error && (
        <div className="mb-6 rounded-(--radius-card) border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      {step === "upload" && <UploadStep fileRef={fileRef} onFile={handleFile} />}

      {step === "mapping" && (
        <MappingStep
          headers={rawHeaders}
          sampleRows={rawRows.slice(0, 3)}
          fieldMap={fieldMap}
          onChange={(field, colIdx) =>
            setFieldMap((prev) => ({ ...prev, [field]: colIdx }))
          }
          onConfirm={handleMappingConfirm}
          onBack={() => {
            setStep("upload");
            setRawHeaders([]);
            setRawRows([]);
            setFieldMap({});
            if (fileRef.current) fileRef.current.value = "";
          }}
        />
      )}

      {step === "fetching" && (
        <FetchingStep progress={fetchProgress} rows={rows} />
      )}

      {step === "approval" && (
        <ApprovalStep
          rows={rows}
          onToggle={toggleRow}
          onToggleAll={toggleAll}
          onUpdate={updateRow}
          onSubmit={handleSubmit}
          submitting={submitting}
          onBack={() => {
            setStep("upload");
            setRows([]);
            setRawHeaders([]);
            setRawRows([]);
            setFieldMap({});
            if (fileRef.current) fileRef.current.value = "";
          }}
        />
      )}

      {step === "done" && result && <DoneStep result={result} />}
    </div>
  );
}

/* ── Step Indicator ── */

const STEPS: { key: Step; label: string }[] = [
  { key: "upload", label: "Upload" },
  { key: "mapping", label: "Map columns" },
  { key: "fetching", label: "Fetch metadata" },
  { key: "approval", label: "Review" },
  { key: "done", label: "Done" },
];

function StepIndicator({ current }: { current: Step }) {
  const currentIdx = STEPS.findIndex((s) => s.key === current);

  return (
    <div className="mb-8 flex items-center gap-1">
      {STEPS.map((s, i) => (
        <div key={s.key} className="flex items-center gap-1">
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
              i < currentIdx
                ? "bg-accent text-white"
                : i === currentIdx
                  ? "bg-accent text-white"
                  : "bg-bg-medium text-text-muted"
            }`}
          >
            {i < currentIdx ? "\u2713" : i + 1}
          </div>
          <span
            className={`text-sm max-sm:hidden ${
              i === currentIdx ? "font-semibold" : "text-text-muted"
            }`}
          >
            {s.label}
          </span>
          {i < STEPS.length - 1 && (
            <div
              className={`mx-1 h-px w-6 ${
                i < currentIdx ? "bg-accent" : "bg-border"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Upload Step ── */

function UploadStep({
  fileRef,
  onFile,
}: {
  fileRef: React.RefObject<HTMLInputElement | null>;
  onFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const [dragOver, setDragOver] = useState(false);

  return (
    <div
      className={`flex flex-col items-center justify-center rounded-(--radius-card) border-2 border-dashed px-8 py-16 text-center transition-colors ${
        dragOver ? "border-accent bg-accent/5" : "border-border"
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file && fileRef.current) {
          const dt = new DataTransfer();
          dt.items.add(file);
          fileRef.current.files = dt.files;
          fileRef.current.dispatchEvent(new Event("change", { bubbles: true }));
        }
      }}
    >
      <svg
        className="mb-4 h-12 w-12 text-text-subtle"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
        />
      </svg>
      <p className="mb-2 text-lg font-semibold">
        Drag and drop your CSV file here
      </p>
      <p className="mb-6 text-sm text-text-muted">
        or click below to browse. Supports Goodreads, StoryGraph, and most book
        tracking exports.
      </p>
      <label className="cursor-pointer rounded-(--radius-input) bg-accent px-8 py-3 font-serif text-lg font-bold text-white transition-opacity hover:opacity-88">
        Choose file
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={onFile}
        />
      </label>
      <p className="mt-4 text-xs text-text-subtle">
        Maximum 500 rows. Only ISBN column is required.
      </p>
    </div>
  );
}

/* ── Mapping Step ── */

type MappableField = {
  key: string;
  label: string;
  required: boolean;
};

const MAPPABLE_FIELDS: MappableField[] = [
  { key: "isbn13", label: "ISBN", required: true },
  { key: "title", label: "Title", required: false },
  { key: "status", label: "Status", required: false },
  { key: "rating", label: "Rating", required: false },
  { key: "started_at", label: "Date started", required: false },
  { key: "finished_at", label: "Date finished", required: false },
  { key: "review", label: "Review", required: false },
];

function MappingStep({
  headers,
  sampleRows,
  fieldMap,
  onChange,
  onConfirm,
  onBack,
}: {
  headers: string[];
  sampleRows: string[][];
  fieldMap: Record<string, number | null>;
  onChange: (field: string, colIdx: number | null) => void;
  onConfirm: () => void;
  onBack: () => void;
}) {
  const hasIsbn = fieldMap.isbn13 !== null && fieldMap.isbn13 !== undefined;

  return (
    <div>
      <p className="mb-4 text-sm text-text-muted">
        Match your CSV columns to in prose fields. We auto-detected what we
        could.
      </p>

      <div className="mb-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="px-3 py-2 text-left font-semibold">
                in prose field
              </th>
              <th className="px-3 py-2 text-left font-semibold">
                Your CSV column
              </th>
              <th className="px-3 py-2 text-left font-semibold text-text-muted">
                Sample data
              </th>
            </tr>
          </thead>
          <tbody>
            {MAPPABLE_FIELDS.map((field) => {
              const selectedCol = fieldMap[field.key] ?? null;
              return (
                <tr key={field.key} className="border-b border-border-subtle">
                  <td className="px-3 py-2">
                    <span className="font-medium">{field.label}</span>
                    {field.required && (
                      <span className="ml-1 text-xs font-semibold text-error">
                        *
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={selectedCol !== null ? String(selectedCol) : ""}
                      onChange={(e) =>
                        onChange(
                          field.key,
                          e.target.value === ""
                            ? null
                            : parseInt(e.target.value)
                        )
                      }
                      className={`cursor-pointer rounded border px-2 py-1 font-serif text-sm outline-none ${
                        selectedCol !== null
                          ? "border-accent bg-accent/5"
                          : "border-border bg-bg-light"
                      }`}
                    >
                      <option value="">Not mapped</option>
                      {headers.map((h, i) => (
                        <option key={i} value={String(i)}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2 text-text-muted">
                    {selectedCol !== null
                      ? sampleRows
                          .slice(0, 2)
                          .map((r) => r[selectedCol] ?? "")
                          .filter(Boolean)
                          .join(", ")
                      : "\u2014"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!hasIsbn && (
        <p className="mb-4 text-sm font-semibold text-error">
          ISBN is required to look up book metadata.
        </p>
      )}

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="cursor-pointer rounded-(--radius-input) border border-border px-6 py-2.5 font-serif font-semibold transition-colors hover:bg-bg-medium"
        >
          Back
        </button>
        <button
          onClick={onConfirm}
          disabled={!hasIsbn}
          className="cursor-pointer rounded-(--radius-input) bg-accent px-8 py-2.5 font-serif font-bold text-white transition-opacity hover:opacity-88 disabled:cursor-default disabled:opacity-55"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

/* ── Fetching Step ── */

function FetchingStep({
  progress,
  rows,
}: {
  progress: { done: number; total: number };
  rows: ImportRow[];
}) {
  const pct =
    progress.total > 0
      ? Math.round((progress.done / progress.total) * 100)
      : 0;
  const found = rows.filter((r) => r.metaStatus === "found").length;

  return (
    <div className="py-8 text-center">
      <p className="mb-4 text-lg font-semibold">Fetching book metadata...</p>
      <div className="mx-auto mb-4 h-3 w-full max-w-md overflow-hidden rounded-full bg-bg-medium">
        <div
          className="h-full rounded-full bg-accent transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-sm text-text-muted">
        {progress.done} / {progress.total} books processed
        {found > 0 && ` \u2014 ${found} found`}
      </p>
    </div>
  );
}

/* ── Approval Step ── */

function ApprovalStep({
  rows,
  onToggle,
  onToggleAll,
  onUpdate,
  onSubmit,
  submitting,
  onBack,
}: {
  rows: ImportRow[];
  onToggle: (id: number) => void;
  onToggleAll: () => void;
  onUpdate: (id: number, field: string, value: string | number | null) => void;
  onSubmit: () => void;
  submitting: boolean;
  onBack: () => void;
}) {
  const selected = rows.filter((r) => r.selected && !r.isDuplicate);
  const duplicates = rows.filter((r) => r.isDuplicate);
  const notFound = rows.filter((r) => r.metaStatus === "not_found");
  const allSelected = rows.every((r) => r.selected);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  return (
    <div>
      {/* Summary bar */}
      <div className="mb-4 flex flex-wrap items-center gap-4 text-sm">
        <span className="font-semibold">
          {selected.length} book{selected.length !== 1 ? "s" : ""} to import
        </span>
        {duplicates.length > 0 && (
          <span className="text-text-muted">
            {duplicates.length} already in library
          </span>
        )}
        {notFound.length > 0 && (
          <span className="text-text-muted">
            {notFound.length} not found
          </span>
        )}
      </div>

      {/* Book list */}
      <div className="mb-6 overflow-x-auto rounded-(--radius-card) border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-bg-light">
              <th className="px-3 py-2.5 text-left">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onToggleAll}
                  className="accent-accent"
                />
              </th>
              <th className="px-3 py-2.5 text-left font-semibold">Book</th>
              <th className="px-3 py-2.5 text-left font-semibold max-sm:hidden">
                Status
              </th>
              <th className="px-3 py-2.5 text-left font-semibold max-sm:hidden">
                Rating
              </th>
              <th className="w-10 px-3 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <ApprovalRow
                key={row.id}
                row={row}
                expanded={expandedId === row.id}
                onToggleExpand={() =>
                  setExpandedId(expandedId === row.id ? null : row.id)
                }
                onToggle={() => onToggle(row.id)}
                onUpdate={(field, value) => onUpdate(row.id, field, value)}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="cursor-pointer rounded-(--radius-input) border border-border px-6 py-2.5 font-serif font-semibold transition-colors hover:bg-bg-medium"
        >
          Start over
        </button>
        <button
          onClick={onSubmit}
          disabled={submitting || selected.length === 0}
          className="cursor-pointer rounded-(--radius-input) bg-accent px-8 py-2.5 font-serif font-bold text-white transition-opacity hover:opacity-88 disabled:cursor-default disabled:opacity-55"
        >
          {submitting
            ? "Importing..."
            : `Import ${selected.length} book${selected.length !== 1 ? "s" : ""}`}
        </button>
      </div>
    </div>
  );
}

/* ── Approval Row ── */

const STATUS_OPTIONS = [
  { value: "to_read", label: "To read" },
  { value: "reading", label: "Reading" },
  { value: "finished", label: "Finished" },
  { value: "dnf", label: "DNF" },
];

const OWNERSHIP_OPTIONS = [
  { value: "not_owned", label: "Not owned" },
  { value: "owned", label: "Owned" },
  { value: "borrowed", label: "Borrowed" },
];

const VISIBILITY_OPTIONS = [
  { value: "public", label: "Public" },
  { value: "friends_only", label: "Friends only" },
  { value: "private", label: "Private" },
];

function ApprovalRow({
  row,
  expanded,
  onToggleExpand,
  onToggle,
  onUpdate,
}: {
  row: ImportRow;
  expanded: boolean;
  onToggleExpand: () => void;
  onToggle: () => void;
  onUpdate: (field: string, value: string | number | null) => void;
}) {
  const title = row.meta?.title ?? row.csvTitle ?? row.isbn13;
  const authors = row.meta?.authors?.join(", ") ?? "";
  const coverUrl = row.meta?.coverUrl;

  return (
    <>
      <tr
        className={`border-b border-border-subtle transition-colors ${
          row.isDuplicate
            ? "bg-bg-medium/50 opacity-60"
            : row.metaStatus === "not_found"
              ? "bg-error/3"
              : ""
        }`}
      >
        <td className="px-3 py-2.5">
          <input
            type="checkbox"
            checked={row.selected}
            disabled={row.isDuplicate}
            onChange={onToggle}
            className="accent-accent"
          />
        </td>
        <td className="px-3 py-2.5">
          <div className="flex items-center gap-3">
            {coverUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={coverUrl}
                alt=""
                className="h-12 w-8 shrink-0 rounded object-cover"
              />
            ) : (
              <div className="flex h-12 w-8 shrink-0 items-center justify-center rounded bg-bg-medium text-[8px] text-text-subtle">
                ?
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate font-semibold">{title}</p>
              {authors && (
                <p className="truncate text-xs text-text-muted">{authors}</p>
              )}
              {row.isDuplicate && (
                <span className="text-xs font-semibold text-accent">
                  Already in library
                </span>
              )}
              {row.metaStatus === "not_found" && (
                <span className="text-xs text-error">
                  Metadata not found
                </span>
              )}
            </div>
          </div>
        </td>
        <td className="px-3 py-2.5 max-sm:hidden">
          <select
            value={row.status}
            onChange={(e) => onUpdate("status", e.target.value)}
            disabled={row.isDuplicate}
            className="cursor-pointer rounded border border-border bg-bg-light px-2 py-1 font-serif text-xs outline-none"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </td>
        <td className="px-3 py-2.5 max-sm:hidden">
          {row.rating !== null ? (
            <span className="text-xs font-semibold">{row.rating}/10</span>
          ) : (
            <span className="text-xs text-text-subtle">&mdash;</span>
          )}
        </td>
        <td className="px-3 py-2.5">
          <button
            onClick={onToggleExpand}
            className="cursor-pointer text-text-muted transition-colors hover:text-text-primary"
          >
            <svg
              className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m19.5 8.25-7.5 7.5-7.5-7.5"
              />
            </svg>
          </button>
        </td>
      </tr>

      {expanded && (
        <tr className="border-b border-border-subtle bg-bg-light/50">
          <td colSpan={5} className="px-6 py-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <FieldGroup label="Status">
                <select
                  value={row.status}
                  onChange={(e) => onUpdate("status", e.target.value)}
                  className="w-full cursor-pointer rounded border border-border bg-bg-light px-2 py-1.5 font-serif text-sm outline-none"
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </FieldGroup>

              <FieldGroup label="Ownership">
                <select
                  value={row.ownership}
                  onChange={(e) => onUpdate("ownership", e.target.value)}
                  className="w-full cursor-pointer rounded border border-border bg-bg-light px-2 py-1.5 font-serif text-sm outline-none"
                >
                  {OWNERSHIP_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </FieldGroup>

              <FieldGroup label="Visibility">
                <select
                  value={row.visibility}
                  onChange={(e) => onUpdate("visibility", e.target.value)}
                  className="w-full cursor-pointer rounded border border-border bg-bg-light px-2 py-1.5 font-serif text-sm outline-none"
                >
                  {VISIBILITY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </FieldGroup>

              <FieldGroup label="Rating (0-10)">
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={row.rating ?? ""}
                  onChange={(e) =>
                    onUpdate(
                      "rating",
                      e.target.value ? parseInt(e.target.value) : null
                    )
                  }
                  className="w-full rounded border border-border bg-bg-light px-2 py-1.5 font-serif text-sm outline-none"
                />
              </FieldGroup>

              <FieldGroup label="Date started">
                <input
                  type="date"
                  value={row.started_at ?? ""}
                  onChange={(e) =>
                    onUpdate("started_at", e.target.value || null)
                  }
                  className="w-full rounded border border-border bg-bg-light px-2 py-1.5 font-serif text-sm outline-none"
                />
              </FieldGroup>

              <FieldGroup label="Date finished">
                <input
                  type="date"
                  value={row.finished_at ?? ""}
                  onChange={(e) =>
                    onUpdate("finished_at", e.target.value || null)
                  }
                  className="w-full rounded border border-border bg-bg-light px-2 py-1.5 font-serif text-sm outline-none"
                />
              </FieldGroup>

              <div className="col-span-2 sm:col-span-3">
                <FieldGroup label="Review">
                  <textarea
                    value={row.review ?? ""}
                    onChange={(e) =>
                      onUpdate("review", e.target.value || null)
                    }
                    rows={2}
                    className="w-full rounded border border-border bg-bg-light px-2 py-1.5 font-serif text-sm outline-none"
                  />
                </FieldGroup>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

/* ── Done Step ── */

function DoneStep({ result }: { result: ImportResult }) {
  return (
    <div className="py-8 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 text-3xl text-accent">
        {"\u2713"}
      </div>
      <h2 className="mb-2 text-2xl font-bold">Import complete</h2>
      <div className="mx-auto mb-6 flex max-w-sm justify-center gap-6 text-sm">
        <div>
          <p className="text-2xl font-bold text-accent">{result.added}</p>
          <p className="text-text-muted">added</p>
        </div>
        {result.duplicates > 0 && (
          <div>
            <p className="text-2xl font-bold">{result.duplicates}</p>
            <p className="text-text-muted">already in library</p>
          </div>
        )}
        {result.skipped > 0 && (
          <div>
            <p className="text-2xl font-bold">{result.skipped}</p>
            <p className="text-text-muted">skipped</p>
          </div>
        )}
      </div>
      {result.errors.length > 0 && (
        <div className="mx-auto mb-6 max-w-md rounded-(--radius-card) border border-error/30 bg-error/5 p-4 text-left text-xs text-error">
          <p className="mb-2 font-semibold">Errors:</p>
          {result.errors.map((e, i) => (
            <p key={i}>{e}</p>
          ))}
        </div>
      )}
      <Link
        href="/library"
        className="inline-block rounded-(--radius-input) bg-accent px-8 py-3 font-serif text-lg font-bold text-white transition-opacity hover:opacity-88"
      >
        View your library
      </Link>
    </div>
  );
}

/* ── Helpers ── */

function FieldGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-text-muted">
        {label}
      </label>
      {children}
    </div>
  );
}
