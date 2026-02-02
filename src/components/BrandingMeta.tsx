"use client";

import { useEffect } from "react";
import { useBranding } from "@/context/BrandingContext";

function setFavicon(href: string) {
  if (!href) return;

  const head = document.head;

  // Remove existing icon links to avoid duplicates.
  const existing = Array.from(
    head.querySelectorAll<HTMLLinkElement>('link[rel="icon"], link[rel="shortcut icon"]'),
  );
  existing.forEach((el) => el.parentNode?.removeChild(el));

  const link = document.createElement("link");
  link.rel = "icon";
  link.href = href;
  head.appendChild(link);

  const shortcut = document.createElement("link");
  shortcut.rel = "shortcut icon";
  shortcut.href = href;
  head.appendChild(shortcut);
}

/**
 * Keeps document metadata (title + favicon) in sync with branding settings.
 */
export default function BrandingMeta() {
  const { headerTitle, brandLogoUrl, isLoading } = useBranding();

  useEffect(() => {
    if (isLoading) return;

    if (headerTitle) {
      document.title = headerTitle;
    }
  }, [headerTitle, isLoading]);

  useEffect(() => {
    if (isLoading) return;

    // Use the uploaded brand logo as the app icon.
    if (brandLogoUrl) {
      setFavicon(brandLogoUrl);
    }
  }, [brandLogoUrl, isLoading]);

  return null;
}
