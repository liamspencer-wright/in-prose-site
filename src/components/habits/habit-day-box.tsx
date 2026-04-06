"use client";

interface HabitDayBoxProps {
  label: string;
  isCompleted: boolean;
  isToday: boolean;
  isFuture: boolean;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
}

const SIZES = {
  sm: "h-8 w-8 text-[10px]",
  md: "h-[38px] w-[38px] text-xs",
  lg: "h-12 w-12 text-sm",
};

export function HabitDayBox({
  label,
  isCompleted,
  isToday,
  isFuture,
  size = "md",
  onClick,
}: HabitDayBoxProps) {
  const sizeClass = SIZES[size];

  let bgClass: string;
  let borderClass: string;
  let textClass: string;

  if (isFuture) {
    bgClass = "bg-border";
    borderClass = "";
    textClass = "text-text-subtle";
  } else if (isCompleted) {
    bgClass = "bg-accent";
    borderClass = "";
    textClass = "text-white";
  } else if (isToday) {
    bgClass = "bg-transparent";
    borderClass = "border-2 border-accent";
    textClass = "text-accent font-bold";
  } else {
    bgClass = "bg-transparent";
    borderClass = "border border-border";
    textClass = "text-text-muted";
  }

  return (
    <button
      type="button"
      disabled={isFuture}
      onClick={onClick}
      className={`flex items-center justify-center rounded-lg transition-colors ${sizeClass} ${bgClass} ${borderClass} ${textClass} ${
        isFuture ? "cursor-default" : "cursor-pointer"
      }`}
    >
      {isCompleted ? (
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
        </svg>
      ) : (
        <span>{label}</span>
      )}
    </button>
  );
}
