"use client";

import type { ReactNode } from "react";

/**
 * Sticks to the top so the screen you are on stays named while you scroll,
 * with the page showing through blurred behind it.
 */
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 -mx-4 mb-4 border-b border-border/60 bg-bg/80 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="tight text-xl font-semibold">{title}</h1>
          {subtitle && (
            <p className="mt-0.5 truncate text-xs text-muted">{subtitle}</p>
          )}
        </div>
        {action}
      </div>
    </header>
  );
}
