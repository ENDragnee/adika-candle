import { create } from "zustand";

export interface PageHeaderParent {
  label: string;
  href: string;
}

// Lets a page override TopBar's default (nav-derived) title, give it a
// description subtitle, and (Epic 21) name a parent page shown as a
// breadcrumb link above the title — every detail page uses it, so there's
// always a way back to the list. Plain Zustand rather than React context:
// one consumer (TopBar) but many independent page components setting it.
interface PageHeaderState {
  title: string | null;
  description: string | null;
  parent: PageHeaderParent | null;
  setHeader: (header: {
    title?: string | null;
    description?: string | null;
    parent?: PageHeaderParent | null;
  }) => void;
}

export const usePageHeaderStore = create<PageHeaderState>((set) => ({
  title: null,
  description: null,
  parent: null,
  setHeader: ({ title = null, description = null, parent = null }) =>
    set({ title, description, parent }),
}));
