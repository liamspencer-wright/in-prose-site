export default function ProfileLoading() {
  return (
    <div className="mx-auto w-full max-w-xl px-6 py-12 max-sm:px-4">
      <div className="animate-pulse">
        {/* Avatar + name */}
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 rounded-full bg-border" />
          <div className="flex flex-col gap-2">
            <div className="h-6 w-40 rounded bg-border" />
            <div className="h-4 w-24 rounded bg-border" />
          </div>
        </div>

        {/* Bio */}
        <div className="mt-6 space-y-2">
          <div className="h-4 w-full rounded bg-border" />
          <div className="h-4 w-3/4 rounded bg-border" />
        </div>

        {/* Books grid */}
        <div className="mt-8 grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-[120px] rounded-lg bg-border" />
          ))}
        </div>
      </div>
    </div>
  );
}
