import { createClient } from "@/lib/supabase/server";
import { NewsPostForm } from "@/components/news/news-post-form";
import { notFound } from "next/navigation";

export default async function EditNewsPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: post } = await supabase
    .from("news_posts")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!post) notFound();

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="mb-8 text-3xl font-bold">Edit post</h1>
      <NewsPostForm post={post} />
    </div>
  );
}
