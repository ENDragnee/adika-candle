"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { NavGroupId } from "@/lib/nav-routes";

// Which sidebar groups a person has folded away (Epic 25), remembered in
// this browser. A module-level store rather than component state so the
// product tour can open every group before it points at nav links
// (ExpandAllNavGroups) without threading a callback through the shell.

const STORAGE_KEY = "sidebar-collapsed-groups";
const listeners = new Set<() => void>();
let collapsed: ReadonlySet<NavGroupId> | null = null;
const EMPTY: ReadonlySet<NavGroupId> = new Set();

function Read(): ReadonlySet<NavGroupId> {
  if (collapsed) return collapsed;
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    collapsed = new Set(Array.isArray(stored) ? stored : []);
  } catch {
    // Storage unavailable or corrupt: everything starts open.
    collapsed = new Set();
  }
  return collapsed;
}

function Write(next: ReadonlySet<NavGroupId>) {
  collapsed = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
  } catch {
    // Not persisted; the change still applies for this visit.
  }
  for (const listener of listeners) listener();
}

function Subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function ExpandNavGroup(id: NavGroupId) {
  const current = Read();
  if (!current.has(id)) return;
  const next = new Set(current);
  next.delete(id);
  Write(next);
}

export function ExpandAllNavGroups() {
  if (Read().size > 0) Write(new Set());
}

export function useNavGroups() {
  // Server and first client render: everything open (no storage there),
  // so hydration matches; the stored state applies right after.
  const state = useSyncExternalStore(Subscribe, Read, () => EMPTY);

  const toggle = useCallback((id: NavGroupId) => {
    const next = new Set(Read());
    if (next.has(id)) next.delete(id);
    else next.add(id);
    Write(next);
  }, []);

  return { isCollapsed: (id: NavGroupId) => state.has(id), toggle };
}
