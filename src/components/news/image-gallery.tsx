import Image from "next/image";

export function ImageGallery({ urls, alt }: { urls: string[]; alt: string }) {
  if (!urls || urls.length === 0) return null;

  if (urls.length === 1) {
    return (
      <div className="relative h-80 w-full overflow-hidden rounded-(--radius-card) bg-border-subtle sm:h-96">
        <Image src={urls[0]} alt={alt} fill className="object-cover" />
      </div>
    );
  }

  if (urls.length === 2) {
    return (
      <div className="grid grid-cols-2 gap-2">
        {urls.map((u, i) => (
          <div
            key={i}
            className="relative h-64 w-full overflow-hidden rounded-(--radius-card) bg-border-subtle"
          >
            <Image src={u} alt={`${alt} (${i + 1})`} fill className="object-cover" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {urls.map((u, i) => (
        <div
          key={i}
          className="relative aspect-square w-full overflow-hidden rounded-(--radius-card) bg-border-subtle"
        >
          <Image src={u} alt={`${alt} (${i + 1})`} fill className="object-cover" />
        </div>
      ))}
    </div>
  );
}
