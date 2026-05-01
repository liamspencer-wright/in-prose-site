import { NewsPostForm } from "@/components/news/news-post-form";

export default function NewNewsPostPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="mb-8 text-3xl font-bold">New post</h1>
      <NewsPostForm />
    </div>
  );
}
