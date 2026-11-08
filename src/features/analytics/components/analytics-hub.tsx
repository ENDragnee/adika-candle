"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BestSellersTab } from "./best-sellers-tab";
import { ProductionTab } from "./production-tab";
import { ProfitabilityTab } from "./profitability-tab";
import { StockHealthTab } from "./stock-health-tab";

// Each TabsContent only mounts (and its tab's query only fires) once that
// tab is actually selected — Radix Tabs doesn't render inactive panels into
// the DOM by default, which is what gives every tab's GraphQL query its
// "fetched lazily when first opened" behavior for free, no manual
// `enabled` wiring needed at this layer. See docs/epics/17-analytics-hub.md.
export function AnalyticsHub() {
  return (
    <Tabs defaultValue="production">
      <TabsList>
        <TabsTrigger value="production">Production</TabsTrigger>
        <TabsTrigger value="profitability">Profitability</TabsTrigger>
        <TabsTrigger value="stock-health">Stock Health</TabsTrigger>
        <TabsTrigger value="best-sellers">Best Sellers</TabsTrigger>
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
