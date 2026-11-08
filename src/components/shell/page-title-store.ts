import { create } from "zustand";

// Lets a page override the TopBar's default (nav-derived) title with
// something more specific — e.g. a product detail page showing the
// product's own name instead of the generic "Products" nav label. Plain
// Zustand (first use of it in this app) rather than React context: the
// value is read by one consumer (TopBar, mounted once in AppShell) but set
// by many independent page components, which a context provider can't
// do without wrapping every route in its own client boundary.
interface PageTitleState {
  title: string | null;
  setTitle: (title: string | null) => void;
}

export const usePageTitleStore = create<PageTitleState>((set) => ({
  title: null,
  setTitle: (title) => set({ title }),
}));
