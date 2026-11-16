"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clock3, Files, Share2 } from "lucide-react";
import { cn } from "cn";

const items = [
  { href: "/dashboard", label: "My Documents", icon: Files, exact: true },
  { href: "/dashboard/shared", label: "Shared with Me", icon: Share2 },
  { href: "/dashboard/recent", label: "Recent", icon: Clock3 },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <ul className="flex gap-1 overflow-x-auto md:flex-col">
      {items.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <li key={href} className="shrink-0 md:shrink">
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-muted",
                active ? "bg-muted text-foreground" : "text-muted-foreground",
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
