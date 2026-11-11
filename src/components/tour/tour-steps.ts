import {
  INVENTORY_NAV_ITEMS,
  MANAGER_NAV_ITEMS,
  type NavItem,
} from "@/components/shell/nav-config";
import { ACCOUNT_TRIGGER_TOUR_ID, NavTourId } from "./tour-elements";

export interface TourStepDef {
  id: string;
  title: string;
  description: string;
  // Set only for a step whose element lives on one specific page (the
  // per-role action buttons) — every nav/topbar/account-menu step is
  // shell-level chrome, rendered on every route, so needs no route. See
  // use-product-tour.ts for how a route step triggers client-side
  // navigation before driver.js waits for its element to mount.
  route?: string;
}

function NavStep(
  items: NavItem[],
  href: string,
  description: string,
): TourStepDef {
  const item = items.find((navItem) => navItem.href === href);
  if (!item) {
    throw new Error(`Tour step references unknown nav href: ${href}`);
  }
  return { id: NavTourId(href), title: item.label, description };
}

const TOPBAR_STEP: TourStepDef = {
  id: "topbar",
  title: "Top bar",
  description:
    "Always shows the current page and a welcome greeting — stays pinned above everything else.",
};

const ACCOUNT_MENU_STEP: TourStepDef = {
  id: ACCOUNT_TRIGGER_TOUR_ID,
  title: "That's the tour",
  description:
    "Open this menu any time to restart the tour, switch theme, or sign out.",
};

export const MANAGER_TOUR_STEPS: TourStepDef[] = [
  TOPBAR_STEP,
  NavStep(
    MANAGER_NAV_ITEMS,
    "/manager/dashboard",
    "Your landing page after signing in — a snapshot of stock, loans, and recent activity.",
  ),
  NavStep(
    MANAGER_NAV_ITEMS,
    "/manager/analytics",
    "Manager-only: production, profitability, stock health, and best-seller reports.",
  ),
  NavStep(
    MANAGER_NAV_ITEMS,
    "/manager/categories",
    "Organize products into categories.",
  ),
  NavStep(
    MANAGER_NAV_ITEMS,
    "/manager/products",
    "The product catalog — pricing, cost history, and recipes all live on a product's own detail page.",
  ),
  {
    id: "create-product-trigger",
    title: "New product",
    description: "Add a new product to the catalog from here.",
    route: "/manager/products",
  },
  NavStep(
    MANAGER_NAV_ITEMS,
    "/manager/stock",
    "Read-only view of current stock balances and the full accept/sell ledger.",
  ),
  NavStep(
    MANAGER_NAV_ITEMS,
    "/manager/materials",
    "Read-only raw-material balances and ledger — mirrors Stock.",
  ),
  NavStep(
    MANAGER_NAV_ITEMS,
    "/manager/sales",
    "Every recorded sale, across both roles.",
  ),
  NavStep(
    MANAGER_NAV_ITEMS,
    "/manager/customers",
    "Standing customers who can lend or borrow against future purchases.",
  ),
  NavStep(
    MANAGER_NAV_ITEMS,
    "/manager/loans",
    "Oversight of every customer's loan balance.",
  ),
  NavStep(
    MANAGER_NAV_ITEMS,
    "/manager/users",
    "Manager-only: create accounts and assign roles.",
  ),
  NavStep(
    MANAGER_NAV_ITEMS,
    "/manager/roles",
    "Manager-only: see exactly what each role can and can't do.",
  ),
  NavStep(
    MANAGER_NAV_ITEMS,
    "/manager/settings",
    "Manager-only: manage unit conversions and the raw-material catalog.",
  ),
  NavStep(
    MANAGER_NAV_ITEMS,
    "/legend",
    "A glossary of terms used across the app.",
  ),
  ACCOUNT_MENU_STEP,
];

export const INVENTORY_TOUR_STEPS: TourStepDef[] = [
  TOPBAR_STEP,
  NavStep(
    INVENTORY_NAV_ITEMS,
    "/inventory/dashboard",
    "Your landing page after signing in — a snapshot of stock and recent activity.",
  ),
  NavStep(
    INVENTORY_NAV_ITEMS,
    "/inventory/stock",
    "Current stock balances for every product you can sell.",
  ),
  {
    id: "accept-stock-trigger",
    title: "Accept stock",
    description: "Record newly received stock here.",
    route: "/inventory/stock",
  },
  NavStep(
    INVENTORY_NAV_ITEMS,
    "/inventory/materials",
    "Raw-material balances — record received or consumed activity here.",
  ),
  NavStep(
    INVENTORY_NAV_ITEMS,
    "/inventory/sales",
    "Every sale you've recorded.",
  ),
  {
    id: "record-sale-trigger",
    title: "Record sale",
    description: "Log a new sale against a customer here.",
    route: "/inventory/sales",
  },
  NavStep(
    INVENTORY_NAV_ITEMS,
    "/inventory/customers",
    "Standing customers who can lend or borrow against future purchases.",
  ),
  NavStep(
    INVENTORY_NAV_ITEMS,
    "/legend",
    "A glossary of terms used across the app.",
  ),
  ACCOUNT_MENU_STEP,
];
