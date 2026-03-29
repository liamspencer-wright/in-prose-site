import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data } = await supabase
    .from("user_books")
    .select("isbn13")
    .eq("user_id", user.id);

  const isbns = (data ?? []).map((r) => r.isbn13);
  return NextResponse.json({ isbns });
}
