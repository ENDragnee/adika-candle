"use client";

import { PlusIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

// Split out from the (Server Component) products page so the
// @phosphor-icons/react import stays inside a Client Component — see
// docs/DECISIONS.md, "Epic 9 decisions" ("Phosphor icon components
// required 'use client'...").
export function NewProductLink() {
  return (
    <Button asChild>
      <Link href="/manager/products/new">
        <PlusIcon data-icon="inline-start" />
        New product
      </Link>
    </Button>
  );
}
