import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { isbn13, title, authors, publisher, coverUrl, pages, pubYear, synopsis } = body;

  if (!isbn13 || typeof isbn13 !== "string") {
    return NextResponse.json({ error: "isbn13 is required" }, { status: 400 });
  }

  // 1. Upsert book metadata (ignoreDuplicates so existing books aren't modified)
  const { error: bookError } = await supabase.from("books").upsert(
    {
      isbn13,
      title: title ?? null,
      publisher: publisher ?? null,
      image: coverUrl ?? null,
      pages: pages ?? null,
      date_published: pubYear ? String(pubYear) : null,
      synopsis: synopsis ?? null,
    },
    { onConflict: "isbn13", ignoreDuplicates: true }
  );

  if (bookError) {
    console.error("books upsert failed:", bookError);
    return NextResponse.json(
      { error: "Failed to save book metadata" },
      { status: 500 }
    );
  }

  // 2. Link authors
  const authorList: string[] = authors ?? [];
  for (let i = 0; i < authorList.length; i++) {
    const authorName = authorList[i]?.trim();
    if (!authorName) continue;
    const { error: authorError } = await supabase.rpc("upsert_author_and_link", {
      isbn13_in: isbn13,
      author_name_in: authorName,
      sort_name_in: null,
      ord_in: i + 1,
    });
    if (authorError) {
      console.error(`upsert_author_and_link failed for "${authorName}":`, authorError);
    }
  }

  // 3. Insert user_books record (accept optional fields for edit-on-add flow)
  const { error: linkError } = await supabase.from("user_books").insert({
    user_id: user.id,
    isbn13,
    status: body.status ?? "to_read",
    ownership: body.ownership ?? "not_owned",
    visibility: body.visibility ?? "public",
    rating: body.rating ?? null,
    review: body.review ?? null,
    started_at: body.started_at ?? null,
    finished_at: body.finished_at ?? null,
  });

  if (linkError) {
    // Might be a duplicate — user already has this book
    if (linkError.code === "23505") {
      return NextResponse.json({ error: "Book already in library" }, { status: 409 });
    }
    console.error("user_books insert failed:", linkError);
    return NextResponse.json(
      { error: "Failed to add book to library" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
