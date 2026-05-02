/**
 * JSON-LD builders for in prose. Single source of truth for schema.org output.
 *
 * Conventions:
 *  - Every entity gets a stable `@id` keyed off its canonical URL via `siteId()`.
 *  - Cross-references between schemas use the same `@id` so crawlers + AI can
 *    resolve relationships (e.g. Review.itemReviewed -> Book @id).
 *  - All builders return plain objects; render via the `<JsonLd>` component
 *    or a `<script type="application/ld+json">` tag.
 *
 * See docs/SEO.md for the policy this file implements.
 */

export const SITE_URL = "https://inprose.co.uk";

/** Build a stable @id from a path. Always absolute, no trailing slash. */
export function siteId(path: string): string {
  const trimmed = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${trimmed.replace(/\/$/, "")}`;
}

// ── Organization + WebSite (site-wide) ──

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": siteId("/#organization"),
    name: "in prose",
    url: SITE_URL,
    logo: `${SITE_URL}/inprose-logo.png`,
    sameAs: [
      // Add socials when set up.
    ],
  };
}

/**
 * WebSite + SearchAction makes us eligible for the sitelinks searchbox.
 * The search target intentionally points at the public search experience
 * (the protected /search route is auth-gated and won't index).
 */
export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": siteId("/#website"),
    url: SITE_URL,
    name: "in prose",
    publisher: { "@id": siteId("/#organization") },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

// ── Book + author ──

export type BookSchemaInput = {
  isbn13: string;
  title: string;
  authors?: string[] | null;
  image?: string | null;
  publisher?: string | null;
  pubYear?: number | null;
  pages?: number | null;
  genres?: string[] | null;
  description?: string | null;
  rating?: {
    ratingValue: number;
    ratingCount: number;
    bestRating?: number;
    worstRating?: number;
  } | null;
  /** Optional override for the canonical URL — defaults to /book/{isbn13}. */
  canonicalIsbn?: string;
};

export function bookSchema(input: BookSchemaInput) {
  const id = siteId(`/book/${input.canonicalIsbn ?? input.isbn13}`);

  const ld: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Book",
    "@id": id,
    name: input.title,
    isbn: input.isbn13,
    url: id,
  };

  if (input.authors && input.authors.length > 0) {
    ld.author = input.authors.map((name) => ({
      "@type": "Person",
      name,
    }));
  }

  if (input.image) ld.image = input.image;
  if (input.description) ld.description = input.description;
  if (input.pubYear) ld.datePublished = String(input.pubYear);
  if (input.pages) ld.numberOfPages = input.pages;
  if (input.genres && input.genres.length > 0) ld.genre = input.genres;
  if (input.publisher) {
    ld.publisher = { "@type": "Organization", name: input.publisher };
  }

  if (input.rating && input.rating.ratingCount > 0) {
    ld.aggregateRating = aggregateRatingSchema(input.rating);
  }

  return ld;
}

export function aggregateRatingSchema(input: {
  ratingValue: number;
  ratingCount: number;
  bestRating?: number;
  worstRating?: number;
}) {
  return {
    "@type": "AggregateRating",
    ratingValue: input.ratingValue,
    ratingCount: input.ratingCount,
    bestRating: input.bestRating ?? 10,
    worstRating: input.worstRating ?? 0,
  };
}

// ── Review ──

export type ReviewSchemaInput = {
  itemReviewedId: string; // an @id, e.g. siteId(`/book/${isbn}`)
  authorName: string;
  authorUrl?: string;
  ratingValue: number | null;
  reviewBody: string;
  datePublished?: string;
};

export function reviewSchema(input: ReviewSchemaInput) {
  const ld: Record<string, unknown> = {
    "@type": "Review",
    itemReviewed: { "@id": input.itemReviewedId },
    author: {
      "@type": "Person",
      name: input.authorName,
      ...(input.authorUrl && { url: input.authorUrl }),
    },
    reviewBody: input.reviewBody,
  };

  if (input.ratingValue !== null) {
    ld.reviewRating = {
      "@type": "Rating",
      ratingValue: input.ratingValue,
      bestRating: 10,
      worstRating: 0,
    };
  }

  if (input.datePublished) ld.datePublished = input.datePublished;

  return ld;
}

// ── Person + ProfilePage ──

export type PersonSchemaInput = {
  username: string;
  displayName?: string | null;
  description?: string | null;
  avatarUrl?: string | null;
  sameAs?: string[];
};

export function personSchema(input: PersonSchemaInput) {
  const url = siteId(`/u/${input.username}`);
  const ld: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": url,
    url,
    name: input.displayName ?? input.username,
    alternateName: `@${input.username}`,
  };

  if (input.description) ld.description = input.description;
  if (input.avatarUrl) ld.image = input.avatarUrl;
  if (input.sameAs && input.sameAs.length > 0) ld.sameAs = input.sameAs;

  return ld;
}

export function profilePageSchema(input: { username: string; displayName?: string | null }) {
  const url = siteId(`/u/${input.username}`);
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    "@id": `${url}#profilepage`,
    url,
    mainEntity: { "@id": url },
    name: input.displayName ?? input.username,
  };
}

// ── ItemList ──

export type ItemListSchemaInput = {
  name: string;
  description?: string;
  items: Array<{ url: string; name?: string; position?: number }>;
  /** ItemListOrderType — "ItemListOrderAscending", etc. Default unordered. */
  itemListOrder?: string;
};

export function itemListSchema(input: ItemListSchemaInput) {
  const ld: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: input.name,
    numberOfItems: input.items.length,
    itemListElement: input.items.map((item, i) => ({
      "@type": "ListItem",
      position: item.position ?? i + 1,
      url: item.url,
      ...(item.name && { name: item.name }),
    })),
  };

  if (input.description) ld.description = input.description;
  if (input.itemListOrder) ld.itemListOrder = input.itemListOrder;

  return ld;
}

// ── BreadcrumbList ──

export function breadcrumbListSchema(crumbs: Array<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: c.url,
    })),
  };
}

// ── FAQPage ──

export function faqPageSchema(qa: Array<{ question: string; answer: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: qa.map((q) => ({
      "@type": "Question",
      name: q.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: q.answer,
      },
    })),
  };
}

// ── Article (news posts) ──

export type MentionRef = {
  /** schema.org @type — Book, Person, ItemList (for series/universe/lists). */
  type: "Book" | "Person" | "ItemList";
  /** Canonical @id (matches the entity's own page schema). */
  id: string;
  /** Display name (optional — strengthens AI citation context). */
  name?: string;
};

export type ArticleSchemaInput = {
  slug: string;
  headline: string;
  description?: string | null;
  image?: string | null;
  datePublished?: string | null;
  dateModified?: string | null;
  authorName?: string;
  /**
   * Entities the article references. Each entry cross-references a Book / Person
   * / Series / Universe / List elsewhere on the site so AI assistants can
   * resolve "which books does this article actually talk about".
   */
  mentions?: MentionRef[];
};

export function articleSchema(input: ArticleSchemaInput) {
  const url = siteId(`/news/${input.slug}`);
  const ld: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": url,
    url,
    headline: input.headline,
    publisher: { "@id": siteId("/#organization") },
    mainEntityOfPage: { "@id": url },
  };

  if (input.description) ld.description = input.description;
  if (input.image) ld.image = input.image;
  if (input.datePublished) ld.datePublished = input.datePublished;
  if (input.dateModified) ld.dateModified = input.dateModified;
  if (input.authorName) {
    ld.author = { "@type": "Person", name: input.authorName };
  }

  if (input.mentions && input.mentions.length > 0) {
    ld.mentions = input.mentions.map((m) => ({
      "@type": m.type,
      "@id": m.id,
      ...(m.name && { name: m.name }),
    }));
  }

  return ld;
}

// ── Helpers ──

/** Serialise one or more schema objects for a single <script> tag. */
export function serialiseSchemas(schemas: unknown[]): string {
  if (schemas.length === 1) return JSON.stringify(schemas[0]);
  return JSON.stringify({ "@graph": schemas });
}
