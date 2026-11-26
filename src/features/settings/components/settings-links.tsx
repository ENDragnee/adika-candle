"use client";

import { ArrowRightIcon, FlaskIcon } from "@phosphor-icons/react";
import Link from "next/link";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Split out from the (Server Component) settings page so the
// @phosphor-icons/react import stays inside a Client Component — see
// docs/DECISIONS.md, "Epic 9 decisions".
const SETTINGS_LINKS = [
  {
    href: "/manager/settings/materials",
    label: "Raw materials",
    description:
      "The production inputs you buy (wax, kir). Wax use is worked out from production.",
    icon: FlaskIcon,
  },
];

export function SettingsLinks() {
  return (
    <div className="flex flex-col gap-3">
      {SETTINGS_LINKS.map((link) => {
        const Icon = link.icon;

        return (
          <Link key={link.href} href={link.href}>
            <Card className="transition-colors hover:bg-muted/50">
              <CardHeader className="flex items-center gap-3">
                <Icon className="size-8 shrink-0 text-muted-foreground" />
                <div className="flex-1">
                  <CardTitle>{link.label}</CardTitle>
                  <CardDescription>{link.description}</CardDescription>
                </div>
                <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground" />
              </CardHeader>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
