import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { lookupIsbn, type BookMeta } from "../shared";

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const isbns: string[] = body.isbns ?? [];

  if (!Array.isArray(isbns) || isbns.length === 0) {
    return NextResponse.json(
      { error: "isbns array is required" },
      { status: 400 }
    );
  }

  if (isbns.length > 500) {
    return NextResponse.json(
      { error: "Maximum 500 ISBNs per request" },
      { status: 400 }
    );
  }

  const total = isbns.length;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const found: BookMeta[] = [];
      const notFound: string[] = [];

      for (let i = 0; i < isbns.length; i++) {
        const isbn = isbns[i];

        try {
          const meta = await lookupIsbn(isbn, supabase);

          if (meta) {
            found.push(meta);
          } else {
            notFound.push(isbn);
          }

          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                type: "progress",
                isbn,
                result: meta,
                index: i + 1,
                total,
              }) + "\n"
            )
          );
        } catch (err) {
          console.error(`[stream-meta] Error looking up ${isbn}:`, err);
          notFound.push(isbn);
          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                type: "progress",
                isbn,
                result: null,
                index: i + 1,
                total,
              }) + "\n"
            )
          );
        }
      }

      // Final summary event
      controller.enqueue(
        encoder.encode(
          JSON.stringify({ type: "done", found, notFound }) + "\n"
        )
      );
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Transfer-Encoding": "chunked",
    },
  });
}
