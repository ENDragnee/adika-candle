"use client";

import { DatabaseIcon, DownloadSimpleIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { BackupUrl } from "../services/system.service";
import { SettingCard } from "./setting-card";

// Download a full JSON backup (Epic 24). No passwords or session tokens
// are in it, but it holds every customer, sale and price — store it as
// carefully as the system itself.
export function BackupCard() {
  const [includeLogs, setIncludeLogs] = useState(false);

  return (
    <SettingCard
      icon={DatabaseIcon}
      title="Backup"
      description="Download everything — products, stock, sales, customers, loans, users and settings — as one file."
    >
      <label
        htmlFor="backup-logs"
        className="flex items-start gap-3 rounded-lg border border-border p-3 text-sm"
      >
        <Switch
          id="backup-logs"
          checked={includeLogs}
          onCheckedChange={setIncludeLogs}
          aria-label="Include the activity log"
        />
        <span className="flex flex-col gap-0.5">
          <span className="font-medium">Include the activity log</span>
          <span className="text-xs text-muted-foreground">
            Makes the file larger. Do this before purging old entries.
          </span>
        </span>
      </label>
      <p className="text-xs text-muted-foreground">
        Passwords and sign-in sessions are never included. Keep the file
        somewhere safe: it contains all your business data.
      </p>
      <Button asChild size="sm" className="self-start">
        <a href={BackupUrl(includeLogs)} download>
          <DownloadSimpleIcon data-icon="inline-start" />
          Download backup
        </a>
      </Button>
    </SettingCard>
  );
}
