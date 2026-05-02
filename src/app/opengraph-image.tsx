import { ImageResponse } from "next/og";
import {
  Fallback,
  OG_SIZE,
  OG_CONTENT_TYPE,
} from "@/lib/seo/og-template";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "in prose — Books and data, perfectly bound.";

export default function HomeOgImage() {
  return new ImageResponse(<Fallback />, OG_SIZE);
}
