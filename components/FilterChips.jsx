"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

function normalizeFilterValue(v) {
  return String(v || "")
    .trim()
    .toLowerCase()
    .replace(/[’‘`]/g, "'"); // normalize apostrophes
}

export default function FilterChips({
  options = [],
  active = "Tous",
  paramName = "filter",
  className = "flex flex-wrap gap-2 mb-8",
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const normalizedActive = useMemo(
    () => normalizeFilterValue(active),
    [active],
  );

  const safeOptions = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const o of options) {
      const s = String(o || "").trim();
      if (!s) continue;
      const k = normalizeFilterValue(s);
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(s);
    }
    return out;
  }, [options]);

  function setFilter(next) {
    const sp = new URLSearchParams(searchParams?.toString() || "");
    const isAll = normalizeFilterValue(next) === "tous";
    if (isAll) sp.delete(paramName);
    else sp.set(paramName, next);
    const qs = sp.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <div className={className}>
      {safeOptions.map((f) => {
        const isActive = normalizeFilterValue(f) === normalizedActive;
        return (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              isActive
                ? "bg-primary text-[#0f1e23] font-bold"
                : "bg-slate-800 hover:bg-slate-700 text-slate-300"
            }`}
          >
            {f}
          </button>
        );
      })}
    </div>
  );
}

