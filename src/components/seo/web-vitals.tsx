"use client";

import { useEffect } from "react";
import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from "web-vitals";

/**
 * Subscribes to Core Web Vitals via the `web-vitals` library and pings
 * /api/web-vitals (sendBeacon, fire-and-forget) so we can track route-level
 * p75 in production.
 *
 * Render once globally from src/app/layout.tsx. The library handles dedup
 * internally — fine to mount once.
 */
export function WebVitalsBeacon() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const send = (metric: Metric) => {
      const payload = JSON.stringify({
        route: window.location.pathname,
        metric: metric.name,
        value: metric.value,
        rating: metric.rating,
        navigationType: metric.navigationType,
      });

      if ("sendBeacon" in navigator) {
        navigator.sendBeacon(
          "/api/web-vitals",
          new Blob([payload], { type: "application/json" })
        );
      } else {
        void fetch("/api/web-vitals", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: payload,
          keepalive: true,
        }).catch(() => {
          /* never crash a render over telemetry */
        });
      }
    };

    onCLS(send);
    onINP(send);
    onLCP(send);
    onFCP(send);
    onTTFB(send);
  }, []);

  return null;
}
