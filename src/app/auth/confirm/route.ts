import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as
    | "signup"
    | "recovery"
    | "email"
    | null;

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type,
    });

    if (!error) {
      if (type === "recovery") {
        return NextResponse.redirect(`${origin}/reset-password`);
      }
      // For signup confirmation, check if profile needs setup
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", user.id)
          .maybeSingle();

        if (!profile?.display_name) {
          return NextResponse.redirect(`${origin}/signup/profile`);
        }
      }

      return NextResponse.redirect(`${origin}/confirmed`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=confirmation_failed`);
}
