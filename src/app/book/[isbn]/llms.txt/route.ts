import { createClient } from "@/lib/supabase/server";
import { getCanonicalIsbn } from "@/lib/seo/canonical";
import { redirect } from "next/navigation";

/**
 * /book/[isbn]/llms.txt — clean text/markdown version of a book page.
 *
 * AI crawlers can parse facts more reliably from this than from rendered HTML.
 * Linked from the HTML page via <link rel="alternate" type="text/markdown">.
 */

const SITE_URL = "https://inprose.co.uk";

type Props = {
  params: Promise<{ isbn: string }>;
};

export async function GET(_req: Request, { params }: Props) {
  const { isbn } = await params;

  // Match HTML edition canonicalisation: redirect to canonical's llms.txt.
  const canonical = await getCanonicalIsbn(isbn);
  if (canonical !== isbn) {
    redirect(`/book/${canonical}/llms.txt`);
  }

  const supabase = await createClient();

  const { data: book } = await supabase
    .from("books_expanded")
    .select(
      "isbn13, title, subtitle, first_author_name, all_author_names, publisher, pages, pub_year, synopsis, genres"
    )
    .eq("isbn13", isbn)
    .maybeSingle();

  if (!book) {
    return new Response("Not found\n", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const authors = book.all_author_names?.join(", ") ?? book.first_author_name ?? "Unknown";
  const url = `${SITE_URL}/book/${book.isbn13}`;

  const lines: string[] = [];
  lines.push(`# ${book.title ?? "Untitled"}`);
  lines.push("");
  if (book.subtitle) {
    lines.push(`> ${book.subtitle}`);
    lines.push("");
  }
  lines.push(`Source: ${url}`);
  lines.push("");
  lines.push(`- Author: ${authors}`);
  lines.push(`- ISBN-13: ${book.isbn13}`);
  if (book.pub_year) lines.push(`- Published: ${book.pub_year}`);
  if (book.publisher) lines.push(`- Publisher: ${book.publisher}`);
  if (book.pages) lines.push(`- Pages: ${book.pages}`);
  if (book.genres && book.genres.length > 0) {
    lines.push(`- Genres: ${book.genres.slice(0, 8).join(", ")}`);
  }
  lines.push("");

  if (book.synopsis) {
    lines.push("## Synopsis");
    lines.push("");
    lines.push(stripHtml(book.synopsis));
    lines.push("");
  }

  // Programmatic FAQ — same content as the HTML page's FAQPage schema, kept
  // here as fact-dense bullets that AI assistants can lift verbatim.
  const faq = buildFaq({
    title: book.title ?? "this book",
    authors: book.all_author_names ?? (book.first_author_name ? [book.first_author_name] : null),
    pages: book.pages,
    pubYear: book.pub_year,
    publisher: book.publisher,
    genres: book.genres,
  });

  if (faq.length > 0) {
    lines.push("## FAQ");
    lines.push("");
    for (const { question, answer } of faq) {
      lines.push(`**${question}** ${answer}`);
      lines.push("");
    }
  }

  // Public reviews — fact-dense, citation-friendly, capped to 5.
  const { data: reviews } = await supabase.rpc(
    "get_public_reviews_for_isbn",
    { p_isbn13: isbn, p_limit: 5 }
  );

  type ReviewRow = {
    display_name: string | null;
    username: string | null;
    rating: number | null;
    review: string;
  };

  if (reviews && (reviews as ReviewRow[]).length > 0) {
    lines.push("## Reviews");
    lines.push("");
    for (const r of reviews as ReviewRow[]) {
      const who = r.display_name ?? r.username ?? "A reader";
      const rating = r.rating !== null && r.rating > 0 ? ` (${Number(r.rating).toFixed(1)}/10)` : "";
      lines.push(`- **${who}${rating}**: ${r.review}`);
      lines.push("");
    }
  }

  return new Response(lines.join("\n"), {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}

function buildFaq(book: {
  title: string;
  authors: string[] | null;
  pages: number | null;
  pubYear: number | null;
  publisher: string | null;
  genres: string[] | null;
}): Array<{ question: string; answer: string }> {
  const qa: Array<{ question: string; answer: string }> = [];

  if (book.authors && book.authors.length > 0) {
    qa.push({
      question: `Who wrote ${book.title}?`,
      answer: `${book.title} was written by ${book.authors.join(", ")}.`,
    });
  }

  if (book.pages) {
    const hours = Math.round((book.pages * 2) / 60);
    qa.push({
      question: `How long is ${book.title}?`,
      answer: `${book.title} is ${book.pages} pages — roughly ${hours} hours of reading at an average pace.`,
    });
  }

  if (book.pubYear) {
    qa.push({
      question: `When was ${book.title} published?`,
      answer: `${book.title} was first published in ${book.pubYear}${
        book.publisher ? ` by ${book.publisher}` : ""
      }.`,
    });
  }

  if (book.genres && book.genres.length > 0) {
    qa.push({
      question: `What genre is ${book.title}?`,
      answer: `${book.title} is categorised as ${book.genres.slice(0, 3).join(", ")}.`,
    });
  }

  return qa;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}
