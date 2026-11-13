// Opaque cursor for the activity log: base64url of "<ISO createdAt>|<id>".
export interface ActivityCursor {
  createdAt: Date;
  id: string;
}

export function EncodeCursor(cursor: ActivityCursor): string {
  return Buffer.from(
    `${cursor.createdAt.toISOString()}|${cursor.id}`,
    "utf8",
  ).toString("base64url");
}

// null for anything malformed — the API then answers 400 rather than
// silently restarting from the top.
export function DecodeCursor(value: string): ActivityCursor | null {
  try {
    const [iso, id] = Buffer.from(value, "base64url")
      .toString("utf8")
      .split("|");
    const createdAt = new Date(iso);
    if (!id || Number.isNaN(createdAt.getTime())) return null;
    return { createdAt, id };
  } catch {
    return null;
  }
}
