"use client";

import Image from "next/image";

const BADGE_GOLD = "#D4A017";

interface UserAvatarProps {
  url: string | null;
  name: string | null;
  size: number;
  badgeType?: string | null;
  showTextBadge?: boolean;
}

export default function UserAvatar({
  url,
  name,
  size,
  badgeType,
  showTextBadge = false,
}: UserAvatarProps) {
  const isEarlyAdopter = badgeType === "early_adopter";
  const ringWidth = Math.max(2, Math.round(size * 0.03));
  const starSize = Math.max(12, Math.round(size * 0.22));
  const initial = (name ?? "?").charAt(0).toUpperCase();

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative inline-flex flex-shrink-0" style={{ width: size, height: size }}>
        {url ? (
          <Image
            src={url}
            alt={name ?? ""}
            width={size}
            height={size}
            className="rounded-full object-cover"
            style={{
              width: size,
              height: size,
              ...(isEarlyAdopter
                ? { boxShadow: `0 0 0 ${ringWidth}px ${BADGE_GOLD}` }
                : {}),
            }}
          />
        ) : (
          <div
            className="flex items-center justify-center rounded-full bg-accent font-bold text-text-on-accent"
            style={{
              width: size,
              height: size,
              fontSize: size * 0.42,
              ...(isEarlyAdopter
                ? { boxShadow: `0 0 0 ${ringWidth}px ${BADGE_GOLD}` }
                : {}),
            }}
          >
            {initial}
          </div>
        )}

        {isEarlyAdopter && (
          <span
            className="absolute flex items-center justify-center rounded-full bg-bg-light"
            style={{
              width: starSize,
              height: starSize,
              bottom: -size * 0.02,
              right: -size * 0.02,
              fontSize: starSize * 0.6,
              color: BADGE_GOLD,
              lineHeight: 1,
            }}
          >
            ★
          </span>
        )}
      </div>

      {showTextBadge && isEarlyAdopter && (
        <span
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
          style={{ backgroundColor: `${BADGE_GOLD}20`, color: BADGE_GOLD }}
        >
          <span style={{ fontSize: 10 }}>★</span>
          Early Adopter
        </span>
      )}
    </div>
  );
}
