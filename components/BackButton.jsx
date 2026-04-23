"use client";

import { useRouter } from "next/navigation";

export default function BackButton({
  fallbackHref = "/bibliotheque",
  className = "",
  children = "Retour",
}) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window !== "undefined" && window.history.length > 1) {
          router.back();
          return;
        }
        router.push(fallbackHref);
      }}
      className={className}
    >
      {children}
    </button>
  );
}

