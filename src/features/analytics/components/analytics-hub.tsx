"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BestSellersTab } from "./best-sellers-tab";
import { ProductionTab } from "./production-tab";
import { ProfitabilityTab } from "./profitability-tab";
import { StockHealthTab } from "./stock-health-tab";

const TABS = [
  "production",
  "profitability",
  "stock-health",
  "best-sellers",
] as const;
type AnalyticsTab = (typeof TABS)[number];

// Each TabsContent only mounts (and its tab's query only fires) once that
// tab is actually selected — Radix Tabs doesn't render inactive panels
// into the DOM. The active tab lives in `?tab=` (Epic 21) so the Dashboard
// can link straight to e.g. Stock Health filtered to low stock, and a
// refresh or shared link keeps the tab.
export function AnalyticsHub() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const requested = searchParams.get("tab");
  const tab: AnalyticsTab = TABS.includes(requested as AnalyticsTab)
    ? (requested as AnalyticsTab)
    : "production";

  function HandleChange(value: string) {
    // Native replaceState, not router.replace: a tab switch isn't a
    // navigation, so it shouldn't re-run the route's page crossfade (which
    // also threw "Transition was aborted" on quick clicks). Next keeps
    // useSearchParams in sync with it. Tab-specific params (e.g. ?status=)
    // don't carry across tabs.
    window.history.replaceState(null, "", `${pathname}?tab=${value}`);
  }

  return (
    <Tabs value={tab} onValueChange={HandleChange}>
      <TabsList>
        <TabsTrigger value="production">Production</TabsTrigger>
        <TabsTrigger value="profitability">Profitability</TabsTrigger>
        <TabsTrigger value="stock-health">Stock health</TabsTrigger>
        <TabsTrigger value="best-sellers">Best sellers</TabsTrigger>
      </TabsList>
      <TabsContent value="production">
        <ProductionTab />
      </TabsContent>
      <TabsContent value="profitability">
        <ProfitabilityTab />
      </TabsContent>
      <TabsContent value="stock-health">
        <StockHealthTab />
      </TabsContent>
      <TabsContent value="best-sellers">
        <BestSellersTab />
      </TabsContent>
    </Tabs>
  );
}
