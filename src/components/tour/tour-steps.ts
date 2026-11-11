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
  // Shown only to users holding at least one of these (Epic 21: the nav is
  // permission-filtered, so a step pointing at a hidden nav item or a page
  // the user can't open would otherwise hang waiting for its element).
  // Omitted = always shown.
  permission?: string[];
}

export function VisibleTourSteps(
  steps: TourStepDef[],
  permissions: string[],
): TourStepDef[] {
  return steps.filter(
    (step) =>
      !step.permission ||
      step.permission.length === 0 ||
      step.permission.some((name) => permissions.includes(name)),
  );
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
  return {
    id: NavTourId(href),
    title: item.label,
    description,
    permission: item.permission,
  };
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
    "Your landing page: today's sales, what needs your attention, stock status, and who owes you money.",
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
    permission: ["product:manage"],
  },
  NavStep(
    MANAGER_NAV_ITEMS,
    "/manager/stock",
    "What's on hand for every product. Open one to see its history or record a stock count.",
  ),
  NavStep(
    MANAGER_NAV_ITEMS,
    "/manager/materials",
    "Raw-material balances and history. Open one to record a stock count.",
  ),
  NavStep(
    MANAGER_NAV_ITEMS,
    "/manager/sales",
    "Every sale with filters and totals. Void a mistaken sale from its row menu.",
  ),
  NavStep(
    MANAGER_NAV_ITEMS,
    "/manager/customers",
    "Standing customers who can lend or borrow against future purchases.",
  ),
  NavStep(
    MANAGER_NAV_ITEMS,
    "/manager/loans",
    "Who owes you, who has credit, and when each customer last paid.",
  ),
  NavStep(
    MANAGER_NAV_ITEMS,
    "/manager/users",
    "Manager-only: create accounts and assign roles.",
  ),
  NavStep(
    MANAGER_NAV_ITEMS,
    "/manager/roles",
    "Turn features on or off for each role. The sidebar follows these settings.",
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
    permission: ["stock:accept"],
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
    permission: ["sale:create"],
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
