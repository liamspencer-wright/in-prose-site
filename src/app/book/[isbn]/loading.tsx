export default function BookLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-12 max-sm:px-4">
      <div className="animate-pulse">
        {/* Cover + title area */}
        <div className="flex gap-6">
          <div className="h-[200px] w-[135px] flex-shrink-0 rounded-lg bg-border" />
          <div className="flex flex-1 flex-col gap-3 pt-2">
            <div className="h-7 w-3/4 rounded bg-border" />
            <div className="h-5 w-1/2 rounded bg-border" />
            <div className="h-4 w-1/3 rounded bg-border" />
          </div>
        </div>

        {/* Details */}
        <div className="mt-8 space-y-3">
          <div className="h-4 w-full rounded bg-border" />
          <div className="h-4 w-5/6 rounded bg-border" />
          <div className="h-4 w-2/3 rounded bg-border" />
        </div>
      </div>
    </div>
  );
}
