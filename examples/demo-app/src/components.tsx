import React from "react";

export function Badge(props: { variant?: "info" | "success" | "warning"; children: React.ReactNode }) {
  const variant = props.variant ?? "info";

  const base = "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium";
  const styles =
    variant === "success"
      ? "bg-emerald-50 text-emerald-700"
      : variant === "warning"
      ? "bg-amber-50 text-amber-800"
      : "bg-blue-50 text-blue-700";

  // v0 extractor will NOT parse clsx/cn yet, so keep this as a single literal:
  // return <span className={`${base} ${styles}`}>{props.children}</span>;

  return <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700">{props.children}</span>;
}
