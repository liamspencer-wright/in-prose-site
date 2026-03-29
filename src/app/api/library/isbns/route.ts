import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const details = request.nextUrl.searchParams.get("details") === "1";

  if (details) {
    const { data } = await supabase
      .from("user_books_expanded")
      .select(
        "isbn13, title, first_author_name, cover_url, status, ownership, visibility, rating, review, started_at, finished_at"
      );

    return NextResponse.json({ books: data ?? [] });
  }

  const { data } = await supabase
    .from("user_books")
    .select("isbn13")
    .eq("user_id", user.id);

  const isbns = (data ?? []).map((r) => r.isbn13);
  return NextResponse.json({ isbns });
}
