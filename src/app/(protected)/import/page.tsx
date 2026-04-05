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
  csvRawRating: string | null;
  csvRawStatus: string | null;
  csvRawStarted: string | null;
  csvRawFinished: string | null;
  csvReview: string | null;
  meta: BookMeta | null;
  metaStatus: "pending" | "loading" | "found" | "not_found";
  selected: boolean;
  isDuplicate: boolean;
  // Editable fields
  status: string;
  ownership: string;
  visibility: string;
  rating: number | null;
  review: string | null;
  started_at: string | null;
  finished_at: string | null;
};

type ExistingBook = {
  isbn13: string;
  title: string | null;
  status: string | null;
  rating: number | null;
  review: string | null;
  started_at: string | null;
  finished_at: string | null;
  ownership: string | null;
  visibility: string | null;
  cover_url: string | null;
  first_author_name: string | null;
};

type Step =
  | "upload"
  | "mapping"
  | "validate"
  | "fetching"
  | "review-ready"
  | "review-library"
  | "review-notfound"
  | "done";

type ImportResult = {
  added: number;
  updated: number;
  skipped: number;
  errors: string[];
};

type RatingScale = "0-5" | "0-10" | "0-100";
type DateFormat = "auto" | "YYYY-MM-DD" | "DD/MM/YYYY" | "MM/DD/YYYY";

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

const STATUS_MAP: [RegExp, string][] = [
  [/^(read|finished|completed|done)$/i, "finished"],
  [
    /^(currently[- ]reading|reading|in[- ]progress|started)$/i,
    "reading",
  ],
  [
    /^(to[- ]read|want[- ]to[- ]read|tbr|wishlist|plan[- ]to[- ]read)$/i,
    "to_read",
  ],
  [/^(did[_\- ]not[_\- ]finish|dnf|abandoned|quit|stopped)$/i, "dnf"],
];

function mapStatus(raw: string | null): string {
  if (!raw) return "to_read";
  const s = raw.trim();
  for (const [pattern, status] of STATUS_MAP) {
    if (pattern.test(s)) return status;
  }
  return "to_read";
}

const STATUS_LABEL: Record<string, string> = {
  to_read: "To read",
  reading: "Reading",
  finished: "Finished",
  dnf: "DNF",
};

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

/* ── Rating normalisation ── */

function normaliseRating(raw: string | null, scale: RatingScale): number | null {
  if (!raw) return null;
  const n = parseFloat(raw);
  if (isNaN(n) || n === 0) return null;

  let normalised: number;
  switch (scale) {
    case "0-5":
      normalised = n * 2;
      break;
    case "0-10":
      normalised = n;
      break;
    case "0-100":
      normalised = n / 10;
      break;
  }

  return Math.max(0, Math.min(10, Math.round(normalised * 10) / 10));
}

function detectRatingScale(ratings: (string | null)[]): RatingScale {
  const maxRating = ratings.reduce((max, r) => {
    const v = r ? parseFloat(r) : 0;
    return isNaN(v) ? max : Math.max(max, v);
  }, 0);

  if (maxRating > 10) return "0-100";
  if (maxRating > 5) return "0-10";
  return "0-5";
}

/* ── Date normalisation ── */

/**
 * Scan all date strings in a column and determine the most likely format.
 * If any date has its first number > 12, the column must be DD/MM/YYYY.
 * If any date has its second number > 12, the column must be MM/DD/YYYY.
 * If all values are YYYY-MM-DD, return that.
 * Otherwise default to DD/MM/YYYY (UK locale).
 */
function detectDateFormat(dates: (string | null)[]): DateFormat {
  let hasSlashDates = false;
  let allIso = true;
  let forceDDMM = false;
  let forceMMDD = false;

  for (const raw of dates) {
    if (!raw || !raw.trim()) continue;
    const s = raw.trim();

    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
      continue; // ISO format
    }

    allIso = false;

    const slashMatch = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
    if (slashMatch) {
      hasSlashDates = true;
      const a = parseInt(slashMatch[1]!);
      const b = parseInt(slashMatch[2]!);

      if (a > 12) forceDDMM = true; // first position can't be a month
      if (b > 12) forceMMDD = true; // second position can't be a month
    }
  }

  if (allIso && !hasSlashDates) return "YYYY-MM-DD";
  if (forceDDMM && !forceMMDD) return "DD/MM/YYYY";
  if (forceMMDD && !forceDDMM) return "MM/DD/YYYY";
  // Conflicting or fully ambiguous — default to DD/MM/YYYY (UK locale)
  if (hasSlashDates) return "DD/MM/YYYY";
  return "YYYY-MM-DD";
}

function normaliseDate(raw: string | null, format: DateFormat): string | null {
  if (!raw || !raw.trim()) return null;
  const s = raw.trim();

  // ISO format — always try regardless of format setting
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }

  const slashMatch = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (slashMatch) {
    const [, a, b, year] = slashMatch;

    if (format === "DD/MM/YYYY") {
      const d = new Date(
        `${year}-${b!.padStart(2, "0")}-${a!.padStart(2, "0")}`
      );
      if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    }

    if (format === "MM/DD/YYYY") {
      const d = new Date(
        `${year}-${a!.padStart(2, "0")}-${b!.padStart(2, "0")}`
      );
      if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    }

    // auto: should not normally reach here if detectDateFormat was called,
    // but fall back to DD/MM/YYYY for safety
    if (format === "auto") {
      const d = new Date(
        `${year}-${b!.padStart(2, "0")}-${a!.padStart(2, "0")}`
      );
      if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    }
  }

  // Fallback: natural language
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);

  return null;
}

/* ── ISBN cleaning ── */

function cleanIsbn(raw: string | null): string | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[\s"'=-]/g, "");
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
  const [ratingScale, setRatingScale] = useState<RatingScale>("0-5");
  const [dateFormat, setDateFormat] = useState<DateFormat>("auto");
  const [statusMap, setStatusMap] = useState<Record<string, string>>({});
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [existingBooks, setExistingBooks] = useState<
    Map<string, ExistingBook>
  >(new Map());
  const [fetchProgress, setFetchProgress] = useState({ done: 0, total: 0 });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef(false);

  /* ── Bulk edit helpers ── */

  const toggleChecked = useCallback((id: number) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAllChecked = useCallback((ids: number[]) => {
    setCheckedIds((prev) => {
      const allChecked = ids.every((id) => prev.has(id));
      if (allChecked) return new Set();
      return new Set(ids);
    });
  }, []);

  const bulkUpdate = useCallback(
    (fields: { status?: string; ownership?: string; visibility?: string }) => {
      setRows((prev) =>
        prev.map((r) => {
          if (!checkedIds.has(r.id)) return r;
          const updated = { ...r };
          if (fields.status !== undefined) {
            updated.status = fields.status;
            // Clear dates if setting to to_read
            if (fields.status === "to_read") {
              updated.started_at = null;
              updated.finished_at = null;
            }
          }
          if (fields.ownership !== undefined)
            updated.ownership = fields.ownership;
          if (fields.visibility !== undefined)
            updated.visibility = fields.visibility;
          return updated;
        })
      );
    },
    [checkedIds]
  );

  /* ── Upload step ── */

  const handleFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
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
    },
    []
  );

  /* ── Mapping → Validate ── */

  const handleMappingConfirm = useCallback(() => {
    if (fieldMap.isbn13 === null || fieldMap.isbn13 === undefined) {
      setError("You must map a CSV column to ISBN.");
      return;
    }
    setError(null);

    // Auto-detect rating scale
    const ratingIdx = fieldMap.rating ?? -1;
    if (ratingIdx >= 0) {
      const allRatings = rawRows.map((r) => r[ratingIdx] ?? null);
      setRatingScale(detectRatingScale(allRatings));
    }

    // Auto-detect date format from all dates in the column
    const startedIdx = fieldMap.started_at ?? -1;
    const finishedIdx = fieldMap.finished_at ?? -1;
    if (startedIdx >= 0 || finishedIdx >= 0) {
      const allDates: (string | null)[] = [];
      for (const row of rawRows) {
        if (startedIdx >= 0) allDates.push(row[startedIdx]?.trim() || null);
        if (finishedIdx >= 0) allDates.push(row[finishedIdx]?.trim() || null);
      }
      setDateFormat(detectDateFormat(allDates));
    }

    // Build initial status map from unique CSV values
    const statusIdx = fieldMap.status ?? -1;
    if (statusIdx >= 0) {
      const uniqueStatuses = new Set<string>();
      for (const row of rawRows) {
        const s = row[statusIdx]?.trim();
        if (s) uniqueStatuses.add(s);
      }
      const initialMap: Record<string, string> = {};
      for (const s of uniqueStatuses) {
        initialMap[s] = mapStatus(s);
      }
      setStatusMap(initialMap);
    }

    setStep("validate");
  }, [fieldMap, rawRows]);

  /* ── Validate → Fetch ── */

  const handleValidateConfirm = useCallback(() => {
    setError(null);

    const isbnIdx = fieldMap.isbn13 ?? -1;
    const titleIdx = fieldMap.title ?? -1;
    const ratingIdx = fieldMap.rating ?? -1;
    const statusIdx = fieldMap.status ?? -1;
    const startedIdx = fieldMap.started_at ?? -1;
    const finishedIdx = fieldMap.finished_at ?? -1;
    const reviewIdx = fieldMap.review ?? -1;

    const parsed: ImportRow[] = [];
    let id = 0;

    for (const row of rawRows) {
      const isbn = cleanIsbn(row[isbnIdx] ?? null);
      if (!isbn) continue;

      const csvRawRating = ratingIdx >= 0 ? (row[ratingIdx] ?? null) : null;
      const csvRawStatus =
        statusIdx >= 0 ? (row[statusIdx]?.trim() || null) : null;
      const csvRawStarted =
        startedIdx >= 0 ? (row[startedIdx]?.trim() || null) : null;
      const csvRawFinished =
        finishedIdx >= 0 ? (row[finishedIdx]?.trim() || null) : null;
      const csvReview =
        reviewIdx >= 0 ? (row[reviewIdx]?.trim() || null) : null;
      const csvTitle =
        titleIdx >= 0 ? (row[titleIdx]?.trim() || null) : null;

      const rating = normaliseRating(csvRawRating, ratingScale);
      const mappedStatus = csvRawStatus
        ? statusMap[csvRawStatus] ?? mapStatus(csvRawStatus)
        : "to_read";
      const startedAt = normaliseDate(csvRawStarted, dateFormat);
      const finishedAt = normaliseDate(csvRawFinished, dateFormat);

      parsed.push({
        id: id++,
        isbn13: isbn,
        csvTitle,
        csvRawRating,
        csvRawStatus,
        csvRawStarted,
        csvRawFinished,
        csvReview,
        meta: null,
        metaStatus: "pending",
        selected: true,
        isDuplicate: false,
        status: mappedStatus,
        ownership: "not_owned",
        visibility: "public",
        rating,
        review: csvReview,
        started_at: startedAt,
        finished_at: finishedAt,
      });
    }

    if (parsed.length === 0) {
      setError("No valid ISBNs found in the CSV.");
      return;
    }

    const seen = new Set<string>();
    const deduped = parsed.filter((r) => {
      if (seen.has(r.isbn13)) return false;
      seen.add(r.isbn13);
      return true;
    });

    setRows(deduped);
    setStep("fetching");
    fetchMetadata(deduped);
  }, [fieldMap, rawRows, ratingScale, dateFormat, statusMap]);

  /* ── Metadata fetch ── */

  const fetchMetadata = useCallback(async (importRows: ImportRow[]) => {
    abortRef.current = false;
    setFetchProgress({ done: 0, total: importRows.length });

    // Fetch existing library ISBNs + their data
    const existingMap = new Map<string, ExistingBook>();
    try {
      const res = await fetch("/api/library/isbns?details=1");
      if (res.ok) {
        const data = await res.json();
        for (const book of data.books ?? []) {
          existingMap.set(book.isbn13, book);
        }
      }
    } catch {
      // Continue without duplicate detection
    }
    setExistingBooks(existingMap);

    const updated = [...importRows];

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
              const isDuplicate = existingMap.has(row.isbn13);
              updated[idx] = {
                ...updated[idx],
                meta,
                metaStatus: meta ? "found" : "not_found",
                isDuplicate,
                selected: !isDuplicate,
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
      setFetchProgress({
        done: Math.min(i + 5, updated.length),
        total: updated.length,
      });
    }

    // Determine first review step based on available data
    const hasReady = updated.some(
      (r) => r.metaStatus === "found" && !existingMap.has(r.isbn13)
    );
    const hasDuplicates = updated.some((r) => existingMap.has(r.isbn13));
    const hasNotFound = updated.some((r) => r.metaStatus === "not_found");

    if (hasReady) setStep("review-ready");
    else if (hasDuplicates) setStep("review-library");
    else if (hasNotFound) setStep("review-notfound");
    else setStep("review-ready"); // fallback
  }, []);

  /* ── Review helpers ── */

  const toggleRow = useCallback((id: number) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, selected: !r.selected } : r))
    );
  }, []);

  const updateRow = useCallback(
    (id: number, field: string, value: string | number | null) => {
      setRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
      );
    },
    []
  );

  const updateRowMeta = useCallback(
    (id: number, meta: BookMeta) => {
      setRows((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, meta, metaStatus: "found" as const } : r
        )
      );
    },
    []
  );

  /* ── Navigation between review steps ── */

  const ready = rows.filter(
    (r) => r.metaStatus === "found" && !r.isDuplicate
  );
  const duplicates = rows.filter((r) => r.isDuplicate);
  const notFound = rows.filter((r) => r.metaStatus === "not_found");

  const nextReviewStep = useCallback(
    (current: Step) => {
      if (current === "review-ready") {
        if (duplicates.length > 0) return "review-library";
        if (notFound.length > 0) return "review-notfound";
        return null;
      }
      if (current === "review-library") {
        if (notFound.length > 0) return "review-notfound";
        return null;
      }
      return null;
    },
    [duplicates.length, notFound.length]
  );

  const prevReviewStep = useCallback(
    (current: Step) => {
      if (current === "review-notfound") {
        if (duplicates.length > 0) return "review-library";
        if (ready.length > 0) return "review-ready";
        return null;
      }
      if (current === "review-library") {
        if (ready.length > 0) return "review-ready";
        return null;
      }
      return null;
    },
    [duplicates.length, ready.length]
  );

  /* ── Submit ── */

  const handleSubmit = useCallback(async () => {
    const selected = rows.filter((r) => r.selected);
    if (selected.length === 0) return;

    const newBooks = selected.filter((r) => !r.isDuplicate);
    const updates = selected.filter((r) => r.isDuplicate);

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          books: newBooks.map((r) => ({
            isbn13: r.isbn13,
            status: r.status,
            ownership: r.ownership,
            visibility: r.visibility,
            rating: r.rating,
            review: r.review,
            started_at: r.started_at,
            finished_at: r.finished_at,
          })),
          updates: updates.map((r) => ({
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

  const resetAll = useCallback(() => {
    setStep("upload");
    setRows([]);
    setRawHeaders([]);
    setRawRows([]);
    setFieldMap({});
    setExistingBooks(new Map());
    if (fileRef.current) fileRef.current.value = "";
  }, []);

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-4xl px-6 pt-4 pb-12">
        <p className="py-12 text-center text-text-muted">
          Please log in to import books.
        </p>
      </div>
    );
  }

  const isReviewStep = step.startsWith("review-");
  const selectedCount = rows.filter((r) => r.selected).length;

  return (
    <div className="mx-auto w-full max-w-5xl px-6 pt-4 pb-12 max-sm:px-4">
      <h1 className="mb-2 text-3xl font-bold">Import books</h1>
      <p className="mb-8 text-text-muted">
        Upload a CSV file from Goodreads, StoryGraph, or any book tracking
        service to import your reading history.
      </p>

      <StepIndicator current={step} />

      {error && (
        <div className="mb-6 rounded-(--radius-card) border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      {step === "upload" && (
        <UploadStep fileRef={fileRef} onFile={handleFile} />
      )}

      {step === "mapping" && (
        <MappingStep
          headers={rawHeaders}
          sampleRows={rawRows.slice(0, 3)}
          fieldMap={fieldMap}
          onChange={(field, colIdx) =>
            setFieldMap((prev) => ({ ...prev, [field]: colIdx }))
          }
          onConfirm={handleMappingConfirm}
          onBack={resetAll}
        />
      )}

      {step === "validate" && (
        <ValidateStep
          rawRows={rawRows}
          fieldMap={fieldMap}
          rawHeaders={rawHeaders}
          ratingScale={ratingScale}
          onRatingScaleChange={setRatingScale}
          dateFormat={dateFormat}
          onDateFormatChange={setDateFormat}
          statusMap={statusMap}
          onStatusMapChange={(csvVal, inProseVal) =>
            setStatusMap((prev) => ({ ...prev, [csvVal]: inProseVal }))
          }
          onConfirm={handleValidateConfirm}
          onBack={() => setStep("mapping")}
        />
      )}

      {step === "fetching" && (
        <FetchingStep progress={fetchProgress} rows={rows} />
      )}

      {step === "review-ready" && (
        <ReviewSection
          title="Ready to import"
          subtitle={`${ready.length} book${ready.length !== 1 ? "s" : ""} found with metadata`}
          rows={ready}
          onToggle={toggleRow}
          onUpdate={updateRow}
          onNext={
            nextReviewStep("review-ready")
              ? () => { setCheckedIds(new Set()); setStep(nextReviewStep("review-ready")!); }
              : undefined
          }
          onSubmit={!nextReviewStep("review-ready") ? handleSubmit : undefined}
          submitting={submitting}
          selectedCount={selectedCount}
          onBack={resetAll}
          checkedIds={checkedIds}
          onToggleChecked={toggleChecked}
          onToggleAllChecked={toggleAllChecked}
          onBulkUpdate={bulkUpdate}
        />
      )}

      {step === "review-library" && (
        <ReviewLibrarySection
          rows={duplicates}
          existingBooks={existingBooks}
          onToggle={toggleRow}
          onUpdate={updateRow}
          onNext={
            nextReviewStep("review-library")
              ? () => { setCheckedIds(new Set()); setStep(nextReviewStep("review-library")!); }
              : undefined
          }
          onPrev={
            prevReviewStep("review-library")
              ? () => { setCheckedIds(new Set()); setStep(prevReviewStep("review-library")!); }
              : undefined
          }
          onSubmit={
            !nextReviewStep("review-library") ? handleSubmit : undefined
          }
          submitting={submitting}
          selectedCount={selectedCount}
          onBack={resetAll}
          checkedIds={checkedIds}
          onToggleChecked={toggleChecked}
          onToggleAllChecked={toggleAllChecked}
          onBulkUpdate={bulkUpdate}
        />
      )}

      {step === "review-notfound" && (
        <ReviewNotFoundSection
          rows={notFound}
          onToggle={toggleRow}
          onUpdate={updateRow}
          onUpdateMeta={updateRowMeta}
          onPrev={
            prevReviewStep("review-notfound")
              ? () => { setCheckedIds(new Set()); setStep(prevReviewStep("review-notfound")!); }
              : undefined
          }
          onSubmit={handleSubmit}
          submitting={submitting}
          selectedCount={selectedCount}
          onBack={resetAll}
          checkedIds={checkedIds}
          onToggleChecked={toggleChecked}
          onToggleAllChecked={toggleAllChecked}
          onBulkUpdate={bulkUpdate}
        />
      )}

      {step === "done" && result && <DoneStep result={result} />}
    </div>
  );
}

/* ── Step Indicator ── */

const STEP_GROUPS = [
  { label: "Upload", keys: ["upload"] },
  { label: "Map columns", keys: ["mapping"] },
  { label: "Validate", keys: ["validate"] },
  { label: "Fetch", keys: ["fetching"] },
  { label: "Review", keys: ["review-ready", "review-library", "review-notfound"] },
  { label: "Done", keys: ["done"] },
];

function StepIndicator({ current }: { current: Step }) {
  const currentGroupIdx = STEP_GROUPS.findIndex((g) =>
    g.keys.includes(current)
  );

  return (
    <div className="mb-8 flex items-center gap-1">
      {STEP_GROUPS.map((g, i) => (
        <div key={g.label} className="flex items-center gap-1">
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
              i <= currentGroupIdx
                ? "bg-accent text-white"
                : "bg-bg-medium text-text-muted"
            }`}
          >
            {i < currentGroupIdx ? "\u2713" : i + 1}
          </div>
          <span
            className={`text-sm max-sm:hidden ${
              i === currentGroupIdx ? "font-semibold" : "text-text-muted"
            }`}
          >
            {g.label}
          </span>
          {i < STEP_GROUPS.length - 1 && (
            <div
              className={`mx-1 h-px w-6 ${
                i < currentGroupIdx ? "bg-accent" : "bg-border"
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
          fileRef.current.dispatchEvent(
            new Event("change", { bubbles: true })
          );
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

const MAPPABLE_FIELDS = [
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
                      value={
                        selectedCol !== null ? String(selectedCol) : ""
                      }
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

/* ── Validate Step ── */

function ValidateStep({
  rawRows,
  fieldMap,
  rawHeaders,
  ratingScale,
  onRatingScaleChange,
  dateFormat,
  onDateFormatChange,
  statusMap,
  onStatusMapChange,
  onConfirm,
  onBack,
}: {
  rawRows: string[][];
  fieldMap: Record<string, number | null>;
  rawHeaders: string[];
  ratingScale: RatingScale;
  onRatingScaleChange: (s: RatingScale) => void;
  dateFormat: DateFormat;
  onDateFormatChange: (f: DateFormat) => void;
  statusMap: Record<string, string>;
  onStatusMapChange: (csvVal: string, inProseVal: string) => void;
  onConfirm: () => void;
  onBack: () => void;
}) {
  const ratingIdx = fieldMap.rating ?? -1;
  const statusIdx = fieldMap.status ?? -1;
  const startedIdx = fieldMap.started_at ?? -1;
  const finishedIdx = fieldMap.finished_at ?? -1;

  // Get sample values for preview
  const sampleRows = rawRows.slice(0, 5);

  const hasRating = ratingIdx >= 0;
  const hasStatus = statusIdx >= 0;
  const hasDates = startedIdx >= 0 || finishedIdx >= 0;

  return (
    <div>
      <p className="mb-6 text-sm text-text-muted">
        Check how your data will be converted. Adjust the format settings if the
        preview doesn&apos;t look right.
      </p>

      {/* Rating validation */}
      {hasRating && (
        <div className="mb-6 rounded-(--radius-card) border border-border p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">Rating</h3>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-text-muted">Scale:</span>
              <select
                value={ratingScale}
                onChange={(e) =>
                  onRatingScaleChange(e.target.value as RatingScale)
                }
                className="cursor-pointer rounded border border-accent bg-accent/5 px-2 py-1 font-serif text-sm outline-none"
              >
                <option value="0-5">0 &ndash; 5</option>
                <option value="0-10">0 &ndash; 10</option>
                <option value="0-100">0 &ndash; 100</option>
              </select>
            </div>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="px-2 py-1.5 text-left text-text-muted">
                  CSV ({rawHeaders[ratingIdx]})
                </th>
                <th className="px-2 py-1.5 text-left text-text-muted">
                  in prose (0&ndash;10)
                </th>
              </tr>
            </thead>
            <tbody>
              {sampleRows.map((row, i) => {
                const raw = row[ratingIdx] ?? "";
                const converted = normaliseRating(raw, ratingScale);
                return (
                  <tr key={i} className="border-b border-border-subtle">
                    <td className="px-2 py-1.5">{raw || "\u2014"}</td>
                    <td className="px-2 py-1.5 font-semibold">
                      {converted !== null ? `${converted}/10` : "\u2014"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Status validation */}
      {hasStatus && (
        <div className="mb-6 rounded-(--radius-card) border border-border p-4">
          <h3 className="mb-3 font-semibold">Status mapping</h3>
          <p className="mb-3 text-xs text-text-muted">
            Choose which in prose status each CSV value should map to.
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="px-2 py-1.5 text-left text-text-muted">
                  CSV value
                </th>
                <th className="px-2 py-1.5 text-left text-text-muted">
                  Maps to
                </th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(statusMap).map(([csvVal, inProseVal]) => (
                <tr key={csvVal} className="border-b border-border-subtle">
                  <td className="px-2 py-1.5">&ldquo;{csvVal}&rdquo;</td>
                  <td className="px-2 py-1.5">
                    <select
                      value={inProseVal}
                      onChange={(e) =>
                        onStatusMapChange(csvVal, e.target.value)
                      }
                      className="cursor-pointer rounded border border-accent bg-accent/5 px-2 py-1 font-serif text-sm outline-none"
                    >
                      {STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Date validation */}
      {hasDates && (
        <div className="mb-6 rounded-(--radius-card) border border-border p-4">
          <div className="mb-3">
            <h3 className="mb-2 font-semibold">Dates</h3>
            <div className="flex items-center gap-3 rounded border border-accent/30 bg-accent/5 px-3 py-2">
              <label className="text-sm font-medium">Date format:</label>
              <select
                value={dateFormat}
                onChange={(e) =>
                  onDateFormatChange(e.target.value as DateFormat)
                }
                className="cursor-pointer rounded border border-accent bg-white px-3 py-1.5 font-serif text-sm font-semibold outline-none"
              >
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              </select>
              <span className="text-xs text-text-muted">
                Auto-detected from your data. Change if the preview below looks wrong.
              </span>
            </div>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="px-2 py-1.5 text-left text-text-muted">
                  CSV value
                </th>
                <th className="px-2 py-1.5 text-left text-text-muted">
                  Converted
                </th>
              </tr>
            </thead>
            <tbody>
              {getDateSamples(rawRows, startedIdx, finishedIdx).map(
                (raw, i) => {
                  const converted = normaliseDate(raw, dateFormat);
                  return (
                    <tr key={i} className="border-b border-border-subtle">
                      <td className="px-2 py-1.5">{raw}</td>
                      <td
                        className={`px-2 py-1.5 font-semibold ${
                          converted ? "" : "text-error"
                        }`}
                      >
                        {converted ?? "Could not parse"}
                      </td>
                    </tr>
                  );
                }
              )}
            </tbody>
          </table>
        </div>
      )}

      {!hasRating && !hasStatus && !hasDates && (
        <div className="mb-6 rounded-(--radius-card) border border-border p-6 text-center text-text-muted">
          No optional fields mapped. Books will be imported with default values
          (To read, no rating).
        </div>
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
          className="cursor-pointer rounded-(--radius-input) bg-accent px-8 py-2.5 font-serif font-bold text-white transition-opacity hover:opacity-88"
        >
          Looks good, continue
        </button>
      </div>
    </div>
  );
}

function getDateSamples(
  rows: string[][],
  startedIdx: number,
  finishedIdx: number
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const row of rows) {
    for (const idx of [startedIdx, finishedIdx]) {
      if (idx < 0) continue;
      const raw = row[idx]?.trim();
      if (!raw || seen.has(raw)) continue;
      seen.add(raw);
      result.push(raw);
      if (result.length >= 5) return result;
    }
  }
  return result;
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

/* ── Review Section (Ready to import) ── */

function ReviewSection({
  title,
  subtitle,
  rows,
  onToggle,
  onUpdate,
  onNext,
  onSubmit,
  submitting,
  selectedCount,
  onBack,
  checkedIds,
  onToggleChecked,
  onToggleAllChecked,
  onBulkUpdate,
}: {
  title: string;
  subtitle: string;
  rows: ImportRow[];
  onToggle: (id: number) => void;
  onUpdate: (id: number, field: string, value: string | number | null) => void;
  onNext?: () => void;
  onSubmit?: () => void;
  submitting: boolean;
  selectedCount: number;
  onBack: () => void;
} & BulkEditProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const rowIds = rows.map((r) => r.id);
  const checkedCount = rowIds.filter((id) => checkedIds.has(id)).length;

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-xl font-bold">{title}</h2>
        <p className="text-sm text-text-muted">{subtitle}</p>
      </div>

      <BookTable
        rows={rows}
        expandedId={expandedId}
        onToggleExpand={(id) =>
          setExpandedId(expandedId === id ? null : id)
        }
        onToggle={onToggle}
        onUpdate={onUpdate}
        checkedIds={checkedIds}
        onToggleChecked={onToggleChecked}
        onToggleAllChecked={() => onToggleAllChecked(rowIds)}
      />

      {checkedCount > 0 && (
        <BulkEditToolbar
          checkedCount={checkedCount}
          onBulkUpdate={onBulkUpdate}
          onClear={() => onToggleAllChecked([])}
        />
      )}

      <ReviewNav
        onBack={onBack}
        onNext={onNext}
        onSubmit={onSubmit}
        submitting={submitting}
        selectedCount={selectedCount}
      />
    </div>
  );
}

/* ── Review Library Section (duplicates) ── */

function ReviewLibrarySection({
  rows,
  existingBooks,
  onToggle,
  onUpdate,
  onNext,
  onPrev,
  onSubmit,
  submitting,
  selectedCount,
  onBack,
  checkedIds,
  onToggleChecked,
  onToggleAllChecked,
  onBulkUpdate,
}: {
  rows: ImportRow[];
  existingBooks: Map<string, ExistingBook>;
  onToggle: (id: number) => void;
  onUpdate: (id: number, field: string, value: string | number | null) => void;
  onNext?: () => void;
  onPrev?: () => void;
  onSubmit?: () => void;
  submitting: boolean;
  selectedCount: number;
  onBack: () => void;
} & BulkEditProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const rowIds = rows.map((r) => r.id);
  const checkedCount = rowIds.filter((id) => checkedIds.has(id)).length;
  const allChecked = rowIds.length > 0 && checkedCount === rowIds.length;

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-xl font-bold">Already in your library</h2>
        <p className="text-sm text-text-muted">
          These books are already in your library. Select any to update with
          imported data. Expand a row to choose which values to keep.
        </p>
      </div>

      {rows.length > 1 && (
        <div className="mb-2 px-1">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={allChecked}
              onChange={() => onToggleAllChecked(rowIds)}
              className="accent-accent"
            />
            <span className="font-medium text-text-muted">Select all for bulk edit</span>
          </label>
        </div>
      )}

      <div className="mb-6 space-y-3">
        {rows.map((row) => {
          const existing = existingBooks.get(row.isbn13);
          const title = row.meta?.title ?? row.csvTitle ?? row.isbn13;
          const authors = row.meta?.authors?.join(", ") ?? "";
          const coverUrl = row.meta?.coverUrl ?? existing?.cover_url;
          const isExpanded = expandedId === row.id;
          const isChecked = checkedIds.has(row.id);

          return (
            <div
              key={row.id}
              className={`rounded-(--radius-card) border transition-colors ${
                row.selected ? "border-accent" : "border-border"
              } ${isChecked ? "ring-2 ring-accent/30" : ""}`}
            >
              {/* Header */}
              <div className="flex items-center gap-3 px-4 py-3">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => onToggleChecked(row.id)}
                  className="accent-accent"
                  title="Select for bulk edit"
                />
                <input
                  type="checkbox"
                  checked={row.selected}
                  onChange={() => onToggle(row.id)}
                  className="accent-accent"
                  title="Include in import"
                />
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
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{title}</p>
                  {authors && (
                    <p className="truncate text-xs text-text-muted">
                      {authors}
                    </p>
                  )}
                </div>
                <button
                  onClick={() =>
                    setExpandedId(isExpanded ? null : row.id)
                  }
                  className="cursor-pointer text-sm font-semibold text-accent"
                >
                  {isExpanded ? "Hide" : "Compare"}
                </button>
              </div>

              {/* Comparison */}
              {isExpanded && existing && (
                <div className="border-t border-border px-4 py-4">
                  <ComparisonTable
                    row={row}
                    existing={existing}
                    onUpdate={(field, value) =>
                      onUpdate(row.id, field, value)
                    }
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {checkedCount > 0 && (
        <BulkEditToolbar
          checkedCount={checkedCount}
          onBulkUpdate={onBulkUpdate}
          onClear={() => onToggleAllChecked([])}
        />
      )}

      <ReviewNav
        onBack={onBack}
        onPrev={onPrev}
        onNext={onNext}
        onSubmit={onSubmit}
        submitting={submitting}
        selectedCount={selectedCount}
      />
    </div>
  );
}

/* ── Comparison Table ── */

function ComparisonTable({
  row,
  existing,
  onUpdate,
}: {
  row: ImportRow;
  existing: ExistingBook;
  onUpdate: (field: string, value: string | number | null) => void;
}) {
  const fields: {
    key: string;
    label: string;
    existingVal: string | null;
    importVal: string | null;
  }[] = [
    {
      key: "status",
      label: "Status",
      existingVal: existing.status
        ? STATUS_LABEL[existing.status] ?? existing.status
        : null,
      importVal: STATUS_LABEL[row.status] ?? row.status,
    },
    {
      key: "rating",
      label: "Rating",
      existingVal:
        existing.rating !== null ? `${existing.rating}/10` : null,
      importVal: row.rating !== null ? `${row.rating}/10` : null,
    },
    {
      key: "started_at",
      label: "Started",
      existingVal: existing.started_at?.slice(0, 10) ?? null,
      importVal: row.started_at,
    },
    {
      key: "finished_at",
      label: "Finished",
      existingVal: existing.finished_at?.slice(0, 10) ?? null,
      importVal: row.finished_at,
    },
    {
      key: "review",
      label: "Review",
      existingVal: existing.review,
      importVal: row.review,
    },
  ];

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border-subtle">
          <th className="px-2 py-1.5 text-left font-semibold">Field</th>
          <th className="px-2 py-1.5 text-left text-text-muted">
            Current library
          </th>
          <th className="px-2 py-1.5 text-left text-text-muted">
            From import
          </th>
          <th className="px-2 py-1.5 text-left text-text-muted">Keep</th>
        </tr>
      </thead>
      <tbody>
        {fields.map((f) => {
          // Determine which value is currently selected
          let currentlyUsingImport = true;
          if (f.key === "status") {
            currentlyUsingImport =
              (STATUS_LABEL[row.status] ?? row.status) === f.importVal;
          } else if (f.key === "rating") {
            currentlyUsingImport =
              row.rating !== null
                ? `${row.rating}/10` === f.importVal
                : f.importVal === null;
          } else {
            const rowVal =
              f.key === "started_at"
                ? row.started_at
                : f.key === "finished_at"
                  ? row.finished_at
                  : row.review;
            currentlyUsingImport = rowVal === f.importVal;
          }

          const handleKeep = (source: "existing" | "import") => {
            if (source === "existing") {
              if (f.key === "status" && existing.status) {
                onUpdate("status", existing.status);
              } else if (f.key === "rating") {
                onUpdate("rating", existing.rating);
              } else if (f.key === "started_at") {
                onUpdate(
                  "started_at",
                  existing.started_at?.slice(0, 10) ?? null
                );
              } else if (f.key === "finished_at") {
                onUpdate(
                  "finished_at",
                  existing.finished_at?.slice(0, 10) ?? null
                );
              } else if (f.key === "review") {
                onUpdate("review", existing.review);
              }
            } else {
              if (f.key === "status") {
                onUpdate("status", mapStatus(row.csvRawStatus));
              } else if (f.key === "rating") {
                onUpdate("rating", row.rating);
              } else if (f.key === "started_at") {
                onUpdate("started_at", row.started_at);
              } else if (f.key === "finished_at") {
                onUpdate("finished_at", row.finished_at);
              } else if (f.key === "review") {
                onUpdate("review", row.csvReview);
              }
            }
          };

          const bothSame =
            f.existingVal === f.importVal ||
            (!f.existingVal && !f.importVal);

          return (
            <tr key={f.key} className="border-b border-border-subtle">
              <td className="px-2 py-1.5 font-medium">{f.label}</td>
              <td className="max-w-[200px] truncate px-2 py-1.5">
                {f.existingVal ?? (
                  <span className="text-text-subtle">&mdash;</span>
                )}
              </td>
              <td className="max-w-[200px] truncate px-2 py-1.5">
                {f.importVal ?? (
                  <span className="text-text-subtle">&mdash;</span>
                )}
              </td>
              <td className="px-2 py-1.5">
                {bothSame ? (
                  <span className="text-xs text-text-subtle">Same</span>
                ) : (
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleKeep("existing")}
                      className={`cursor-pointer rounded px-2 py-0.5 text-xs font-semibold transition-colors ${
                        !currentlyUsingImport
                          ? "bg-accent text-white"
                          : "bg-bg-medium text-text-muted hover:bg-accent/10"
                      }`}
                    >
                      Current
                    </button>
                    <button
                      onClick={() => handleKeep("import")}
                      className={`cursor-pointer rounded px-2 py-0.5 text-xs font-semibold transition-colors ${
                        currentlyUsingImport
                          ? "bg-accent text-white"
                          : "bg-bg-medium text-text-muted hover:bg-accent/10"
                      }`}
                    >
                      Import
                    </button>
                  </div>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/* ── Review Not Found Section ── */

function ReviewNotFoundSection({
  rows,
  onToggle,
  onUpdate,
  onUpdateMeta,
  onPrev,
  onSubmit,
  submitting,
  selectedCount,
  onBack,
  checkedIds,
  onToggleChecked,
  onToggleAllChecked,
  onBulkUpdate,
}: {
  rows: ImportRow[];
  onToggle: (id: number) => void;
  onUpdate: (id: number, field: string, value: string | number | null) => void;
  onUpdateMeta: (id: number, meta: BookMeta) => void;
  onPrev?: () => void;
  onSubmit?: () => void;
  submitting: boolean;
  selectedCount: number;
  onBack: () => void;
} & BulkEditProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [searchingId, setSearchingId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<BookMeta[]>([]);
  const [searching, setSearching] = useState(false);

  const rowIds = rows.map((r) => r.id);
  const checkedCount = rowIds.filter((id) => checkedIds.has(id)).length;
  const allChecked = rowIds.length > 0 && checkedCount === rowIds.length;

  const handleSearch = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(query)}`
      );
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.results ?? []);
      }
    } catch {
      // ignore
    } finally {
      setSearching(false);
    }
  }, []);

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-xl font-bold">Metadata not found</h2>
        <p className="text-sm text-text-muted">
          These ISBNs couldn&apos;t be found. Search to find the right book, or
          skip them.
        </p>
      </div>

      {rows.length > 1 && (
        <div className="mb-2 px-1">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={allChecked}
              onChange={() => onToggleAllChecked(rowIds)}
              className="accent-accent"
            />
            <span className="font-medium text-text-muted">Select all for bulk edit</span>
          </label>
        </div>
      )}

      <div className="mb-6 space-y-3">
        {rows.map((row) => {
          const title = row.meta?.title ?? row.csvTitle ?? row.isbn13;
          const isExpanded = expandedId === row.id;
          const isSearching = searchingId === row.id;
          const isChecked = checkedIds.has(row.id);

          return (
            <div
              key={row.id}
              className={`rounded-(--radius-card) border transition-colors ${
                row.selected ? "border-border" : "border-border opacity-40"
              } ${isChecked ? "ring-2 ring-accent/30" : ""}`}
            >
              <div className="flex items-center gap-3 px-4 py-3">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => onToggleChecked(row.id)}
                  className="accent-accent"
                  title="Select for bulk edit"
                />
                <input
                  type="checkbox"
                  checked={row.selected}
                  onChange={() => onToggle(row.id)}
                  className="accent-accent"
                  title="Include in import"
                />
                <div className="flex h-12 w-8 shrink-0 items-center justify-center rounded bg-bg-medium text-[8px] text-text-subtle">
                  ?
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{title}</p>
                  <p className="text-xs text-text-muted">
                    ISBN: {row.isbn13}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (isSearching) {
                        setSearchingId(null);
                        setSearchQuery("");
                        setSearchResults([]);
                      } else {
                        setSearchingId(row.id);
                        setSearchQuery(row.csvTitle ?? "");
                        setSearchResults([]);
                        setExpandedId(null);
                      }
                    }}
                    className="cursor-pointer text-sm font-semibold text-accent"
                  >
                    {isSearching ? "Cancel" : "Search"}
                  </button>
                  <button
                    onClick={() =>
                      setExpandedId(isExpanded ? null : row.id)
                    }
                    className="cursor-pointer text-sm text-text-muted"
                  >
                    {isExpanded ? "Hide" : "Edit"}
                  </button>
                </div>
              </div>

              {/* Search panel */}
              {isSearching && (
                <div className="border-t border-border px-4 py-3">
                  <div className="mb-3 flex gap-2">
                    <input
                      type="text"
                      placeholder="Search by title or author..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSearch(searchQuery);
                      }}
                      className="flex-1 rounded-(--radius-input) border border-border bg-bg-light px-3 py-2 font-serif text-sm outline-none focus:border-accent"
                    />
                    <button
                      onClick={() => handleSearch(searchQuery)}
                      disabled={searching}
                      className="cursor-pointer rounded-(--radius-input) bg-accent px-4 py-2 text-sm font-bold text-white transition-opacity hover:opacity-88 disabled:opacity-55"
                    >
                      {searching ? "..." : "Search"}
                    </button>
                  </div>
                  {searchResults.length > 0 && (
                    <div className="max-h-64 space-y-2 overflow-y-auto">
                      {searchResults.slice(0, 10).map((result) => (
                        <button
                          key={result.isbn13}
                          onClick={() => {
                            onUpdateMeta(row.id, result);
                            setSearchingId(null);
                            setSearchQuery("");
                            setSearchResults([]);
                          }}
                          className="flex w-full cursor-pointer items-center gap-3 rounded-lg border border-border-subtle px-3 py-2 text-left transition-colors hover:bg-bg-light"
                        >
                          {result.coverUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={result.coverUrl}
                              alt=""
                              className="h-10 w-7 shrink-0 rounded object-cover"
                            />
                          ) : (
                            <div className="h-10 w-7 shrink-0 rounded bg-bg-medium" />
                          )}
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">
                              {result.title}
                            </p>
                            <p className="truncate text-xs text-text-muted">
                              {result.authors.join(", ")}
                              {result.pubYear && ` (${result.pubYear})`}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {searchResults.length === 0 && !searching && searchQuery.length >= 2 && (
                    <p className="text-sm text-text-muted">
                      No results found.
                    </p>
                  )}
                </div>
              )}

              {/* Edit panel */}
              {isExpanded && (
                <div className="border-t border-border px-4 py-4">
                  <EditFields row={row} onUpdate={(f, v) => onUpdate(row.id, f, v)} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {checkedCount > 0 && (
        <BulkEditToolbar
          checkedCount={checkedCount}
          onBulkUpdate={onBulkUpdate}
          onClear={() => onToggleAllChecked([])}
        />
      )}

      <ReviewNav
        onBack={onBack}
        onPrev={onPrev}
        onSubmit={onSubmit}
        submitting={submitting}
        selectedCount={selectedCount}
      />
    </div>
  );
}

/* ── Shared Book Table ── */

function BookTable({
  rows,
  expandedId,
  onToggleExpand,
  onToggle,
  onUpdate,
  checkedIds,
  onToggleChecked,
  onToggleAllChecked,
}: {
  rows: ImportRow[];
  expandedId: number | null;
  onToggleExpand: (id: number) => void;
  onToggle: (id: number) => void;
  onUpdate: (id: number, field: string, value: string | number | null) => void;
  checkedIds: Set<number>;
  onToggleChecked: (id: number) => void;
  onToggleAllChecked: () => void;
}) {
  const rowIds = rows.map((r) => r.id);
  const allChecked = rowIds.length > 0 && rowIds.every((id) => checkedIds.has(id));

  return (
    <div className="mb-6 overflow-x-auto rounded-(--radius-card) border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-bg-light">
            <th className="w-10 px-3 py-2.5">
              <input
                type="checkbox"
                checked={allChecked}
                onChange={onToggleAllChecked}
                className="accent-accent"
                title="Select all for bulk edit"
              />
            </th>
            <th className="w-10 px-3 py-2.5" />
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
          {rows.map((row) => {
            const title = row.meta?.title ?? row.csvTitle ?? row.isbn13;
            const authors = row.meta?.authors?.join(", ") ?? "";
            const coverUrl = row.meta?.coverUrl;
            const expanded = expandedId === row.id;

            return (
              <BookTableRow
                key={row.id}
                row={row}
                title={title}
                authors={authors}
                coverUrl={coverUrl}
                expanded={expanded}
                onToggleExpand={() => onToggleExpand(row.id)}
                onToggle={() => onToggle(row.id)}
                onUpdate={(field, value) => onUpdate(row.id, field, value)}
                isChecked={checkedIds.has(row.id)}
                onToggleChecked={() => onToggleChecked(row.id)}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function BookTableRow({
  row,
  title,
  authors,
  coverUrl,
  expanded,
  onToggleExpand,
  onToggle,
  onUpdate,
  isChecked,
  onToggleChecked,
}: {
  row: ImportRow;
  title: string;
  authors: string;
  coverUrl: string | null | undefined;
  expanded: boolean;
  onToggleExpand: () => void;
  onToggle: () => void;
  onUpdate: (field: string, value: string | number | null) => void;
  isChecked: boolean;
  onToggleChecked: () => void;
}) {
  return (
    <>
      <tr
        className={`border-b border-border-subtle transition-colors ${
          !row.selected ? "opacity-40" : ""
        } ${isChecked ? "bg-accent/5" : ""}`}
      >
        <td className="px-3 py-2.5">
          <input
            type="checkbox"
            checked={isChecked}
            onChange={onToggleChecked}
            className="accent-accent"
            title="Select for bulk edit"
          />
        </td>
        <td className="px-3 py-2.5">
          <input
            type="checkbox"
            checked={row.selected}
            onChange={onToggle}
            className="accent-accent"
            title="Include in import"
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
            </div>
          </div>
        </td>
        <td className="px-3 py-2.5 max-sm:hidden">
          <select
            value={row.status}
            onChange={(e) => onUpdate("status", e.target.value)}
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
          <td colSpan={6} className="px-6 py-4">
            <EditFields row={row} onUpdate={onUpdate} />
          </td>
        </tr>
      )}
    </>
  );
}

/* ── Edit Fields (shared between review sections) ── */

function EditFields({
  row,
  onUpdate,
}: {
  row: ImportRow;
  onUpdate: (field: string, value: string | number | null) => void;
}) {
  return (
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
          step={0.1}
          value={row.rating ?? ""}
          onChange={(e) =>
            onUpdate(
              "rating",
              e.target.value
                ? Math.round(parseFloat(e.target.value) * 10) / 10
                : null
            )
          }
          className="w-full rounded border border-border bg-bg-light px-2 py-1.5 font-serif text-sm outline-none"
        />
      </FieldGroup>

      <FieldGroup label="Date started">
        <input
          type="date"
          value={row.started_at ?? ""}
          onChange={(e) => onUpdate("started_at", e.target.value || null)}
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
            onChange={(e) => onUpdate("review", e.target.value || null)}
            rows={2}
            className="w-full rounded border border-border bg-bg-light px-2 py-1.5 font-serif text-sm outline-none"
          />
        </FieldGroup>
      </div>
    </div>
  );
}

/* ── Bulk Edit Toolbar ── */

type BulkEditProps = {
  checkedIds: Set<number>;
  onToggleChecked: (id: number) => void;
  onToggleAllChecked: (ids: number[]) => void;
  onBulkUpdate: (fields: {
    status?: string;
    ownership?: string;
    visibility?: string;
  }) => void;
};

function BulkEditToolbar({
  checkedCount,
  onBulkUpdate,
  onClear,
}: {
  checkedCount: number;
  onBulkUpdate: BulkEditProps["onBulkUpdate"];
  onClear: () => void;
}) {
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkOwnership, setBulkOwnership] = useState("");
  const [bulkVisibility, setBulkVisibility] = useState("");

  const handleApply = () => {
    const fields: {
      status?: string;
      ownership?: string;
      visibility?: string;
    } = {};
    if (bulkStatus) fields.status = bulkStatus;
    if (bulkOwnership) fields.ownership = bulkOwnership;
    if (bulkVisibility) fields.visibility = bulkVisibility;
    if (Object.keys(fields).length === 0) return;
    onBulkUpdate(fields);
    setBulkStatus("");
    setBulkOwnership("");
    setBulkVisibility("");
  };

  const hasSelection = bulkStatus || bulkOwnership || bulkVisibility;

  return (
    <div className="sticky bottom-4 z-10 mx-auto max-w-4xl rounded-(--radius-card) border border-accent bg-white px-4 py-3 shadow-lg">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-semibold">
          {checkedCount} book{checkedCount !== 1 ? "s" : ""} selected
        </span>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value)}
            className="cursor-pointer rounded border border-border bg-bg-light px-2 py-1.5 font-serif text-sm outline-none"
          >
            <option value="">Status...</option>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          <select
            value={bulkOwnership}
            onChange={(e) => setBulkOwnership(e.target.value)}
            className="cursor-pointer rounded border border-border bg-bg-light px-2 py-1.5 font-serif text-sm outline-none"
          >
            <option value="">Ownership...</option>
            {OWNERSHIP_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          <select
            value={bulkVisibility}
            onChange={(e) => setBulkVisibility(e.target.value)}
            className="cursor-pointer rounded border border-border bg-bg-light px-2 py-1.5 font-serif text-sm outline-none"
          >
            <option value="">Visibility...</option>
            {VISIBILITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleApply}
            disabled={!hasSelection}
            className="cursor-pointer rounded-(--radius-input) bg-accent px-4 py-1.5 font-serif text-sm font-bold text-white transition-opacity hover:opacity-88 disabled:cursor-default disabled:opacity-55"
          >
            Apply
          </button>
          <button
            onClick={onClear}
            className="cursor-pointer rounded-(--radius-input) border border-border px-4 py-1.5 font-serif text-sm font-semibold transition-colors hover:bg-bg-medium"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Review Navigation ── */

function ReviewNav({
  onBack,
  onPrev,
  onNext,
  onSubmit,
  submitting,
  selectedCount,
}: {
  onBack: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  onSubmit?: () => void;
  submitting: boolean;
  selectedCount: number;
}) {
  return (
    <div className="flex gap-3">
      <button
        onClick={onBack}
        className="cursor-pointer rounded-(--radius-input) border border-border px-6 py-2.5 font-serif font-semibold transition-colors hover:bg-bg-medium"
      >
        Start over
      </button>
      {onPrev && (
        <button
          onClick={onPrev}
          className="cursor-pointer rounded-(--radius-input) border border-border px-6 py-2.5 font-serif font-semibold transition-colors hover:bg-bg-medium"
        >
          Back
        </button>
      )}
      <div className="flex-1" />
      {onNext && (
        <button
          onClick={onNext}
          className="cursor-pointer rounded-(--radius-input) bg-accent px-8 py-2.5 font-serif font-bold text-white transition-opacity hover:opacity-88"
        >
          Continue
        </button>
      )}
      {onSubmit && (
        <button
          onClick={onSubmit}
          disabled={submitting || selectedCount === 0}
          className="cursor-pointer rounded-(--radius-input) bg-accent px-8 py-2.5 font-serif font-bold text-white transition-opacity hover:opacity-88 disabled:cursor-default disabled:opacity-55"
        >
          {submitting
            ? "Importing..."
            : `Import ${selectedCount} book${selectedCount !== 1 ? "s" : ""}`}
        </button>
      )}
    </div>
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
        {result.added > 0 && (
          <div>
            <p className="text-2xl font-bold text-accent">{result.added}</p>
            <p className="text-text-muted">added</p>
          </div>
        )}
        {result.updated > 0 && (
          <div>
            <p className="text-2xl font-bold text-accent-blue">
              {result.updated}
            </p>
            <p className="text-text-muted">updated</p>
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
