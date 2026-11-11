import { create } from "zustand";

// Lets a page override TopBar's default (nav-derived) title, and/or give it
// a description subtitle it has no nav-derived equivalent for at all. Plain
// Zustand (first use of it in this app) rather than React context: the
// value is read by one consumer (TopBar, mounted once in AppShell) but set
// by many independent page components, which a context provider can't
// do without wrapping every route in its own client boundary.
interface PageHeaderState {
  title: string | null;
  description: string | null;
  setHeader: (header: {
    title?: string | null;
    description?: string | null;
  }) => void;
}

export const usePageHeaderStore = create<PageHeaderState>((set) => ({
  title: null,
  description: null,
  setHeader: ({ title = null, description = null }) =>
    set({ title, description }),
}));
