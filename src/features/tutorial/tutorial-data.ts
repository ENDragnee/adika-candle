export interface StepInstruction {
  step: number;
  title: string;
  instruction: string;
}

export interface PracticalScenario {
  title: string;
  scenario: string;
  steps: string[];
  result: string;
}

export interface TutorialSection {
  id: string;
  title: string;
  category:
    | "Loans & Credit"
    | "Sales"
    | "Finished Goods"
    | "Raw Materials"
    | "Pricing & Costing"
    | "Analytics"
    | "Activities"
    | "Roles & Access"
    | "Administration";
  badge: string;
  requiredPermissions: string[];
  summary: string;
  overview: string;
  keyRules: string[];
  stepByStep: StepInstruction[];
  practicalExample: PracticalScenario;
  highlight?: {
    title: string;
    description: string;
    flow: {
      label: string;
      detail: string;
      tone: "good" | "warning" | "info" | "neutral";
    }[];
  };
}

export const TUTORIAL_CATEGORIES = [
  "All",
  "Loans & Credit",
  "Sales",
  "Finished Goods",
  "Raw Materials",
  "Pricing & Costing",
  "Analytics",
  "Activities",
  "Roles & Access",
  "Administration",
] as const;

export type TutorialCategory = (typeof TUTORIAL_CATEGORIES)[number];

export const TUTORIAL_SECTIONS: TutorialSection[] = [
  {
    id: "two-way-loans",
    title: "Two-Way Customer Loans, Deposits & Advances",
    category: "Loans & Credit",
    badge: "Both-Way Loans",
    requiredPermissions: [
      "loan:record",
      "loan:manage",
      "customer:read",
      "customer:manage",
    ],
    summary:
      "Customer accounts work both ways: customers can carry a debt (owes factory) or maintain an advance deposit (factory owes customer). Overpayments automatically become deposits.",
    overview:
      "Adika Candle does not treat customer debt as one-directional. Each customer has an append-only LoanAccount where positive balances mean the customer owes the factory ('Owes you') and negative balances mean the customer paid in advance ('Credit with you'). When a customer pays more than their current debt, or explicitly deposits funds upfront, the surplus is preserved as store credit. When they later purchase candles on account, the system automatically draws from their credit balance first before adding any new debt.",
    keyRules: [
      "Balance Sign Convention: Positive (+) = Customer owes business; Negative (-) = Business owes customer (credit deposit); Zero (0) = Account settled.",
      "Upfront Advance: Record 'Advance from customer' (ADVANCE_FROM_CUSTOMER) to store pre-payments that customers can buy against.",
      "Automatic Overpayment Conversion: If a customer owes 200 ETB and pays 500 ETB via 'Payment received', balance becomes -300 ETB (customer credit).",
      "Automatic Credit Drawdown: On-account sales check the customer's balance. If credit exists, it creates an ADVANCE_REDEEMED entry up to the available credit, posting only the remainder as SALE_ON_CREDIT.",
      "Void Reversal Safety: If a sale that redeemed credit is voided, a reversing SALE_VOID ledger entry restores the spent credit back to the customer's deposit.",
      "Manager Corrections: Managers can record a 'Manual correction' (MANUAL_ADJUSTMENT) with an explicit increase or decrease direction to fix historical errors.",
    ],
    stepByStep: [
      {
        step: 1,
        title: "Record a customer deposit or payment",
        instruction:
          "Open Customers (/customers), pick a customer, and click 'Record payment'. Choose 'Advance received' if they are depositing money upfront, or 'Payment received' if paying toward a debt. Enter the amount in ETB.",
      },
      {
        step: 2,
        title: "Verify the customer balance",
        instruction:
          "Observe the before-and-after preview. If the payment exceeds what they owe, the preview shows their account transitioning into 'Credit with you'.",
      },
      {
        step: 3,
        title: "Sell against deposit credit",
        instruction:
          "Open Record Sale. Select the customer and choose 'On account' payment. The form displays 'Paid from customer's credit' and shows how much credit will be spent and how much (if any) remainder will become new debt.",
      },
      {
        step: 4,
        title: "Inspect the customer ledger",
        instruction:
          "On the customer detail page, open the 'Account history' tab. Notice the distinct entries: ADVANCE_FROM_CUSTOMER, ADVANCE_REDEEMED, SALE_ON_CREDIT, or SALE_VOID with full audit timestamps.",
      },
    ],
    practicalExample: {
      title: "Wholesaler Merkato overpays and buys candles later",
      scenario:
        "Wholesaler Merkato has an existing debt of ETB 1,200.00. Merkato visits the factory and deposits ETB 5,000.00 cash.",
      steps: [
        "Inventory clerk opens Merkato's profile and records a payment of ETB 5,000.00.",
        "The system applies a -5,000.00 ETB delta. Merkato's balance changes from +ETB 1,200.00 to -ETB 3,800.00 ('Credit with you').",
        "Two days later, Merkato orders 30 cartons of candles totaling ETB 4,500.00 on account.",
        "The system draws the full ETB 3,800.00 credit (ADVANCE_REDEEMED) and posts only the remaining ETB 700.00 as new debt (SALE_ON_CREDIT).",
      ],
      result:
        "Merkato's new balance is +ETB 700.00 ('Owes you'). Both transactions are timestamped and auditable in the ledger.",
    },
    highlight: {
      title: "Lifecycle of a Two-Way Transaction",
      description: "How money moves between customer credit and debt",
      flow: [
        {
          label: "1. Deposit / Overpayment",
          detail: "Customer pays money -> Balance goes negative (Credit)",
          tone: "good",
        },
        {
          label: "2. Purchase on Account",
          detail: "Sale recorded -> Draws credit first (ADVANCE_REDEEMED)",
          tone: "info",
        },
        {
          label: "3. Excess Amount",
          detail: "Amount exceeding credit becomes debt (SALE_ON_CREDIT)",
          tone: "warning",
        },
        {
          label: "4. Void Reversal",
          detail: "If sale voided -> Credit returned to customer (SALE_VOID)",
          tone: "neutral",
        },
      ],
    },
  },
  {
    id: "sales-operations",
    title: "Sales Operations, Overselling & Voiding",
    category: "Sales",
    badge: "Core Workflow",
    requiredPermissions: ["sale:read", "sale:create", "sale:void"],
    summary:
      "Record cash or on-account candle sales with automatic packaging conversions to KG, live price/cost snapshots, oversell confirmations, and append-only voids.",
    overview:
      "All sales are recorded through a single unified flow. Each sale snapshots the packaging unit conversion ratio, active price per kg, and active production cost per kg at the exact moment of sale. Sales are single-product transactions that update finished goods stock atomically. When stock is low, the system prompts for explicit oversell confirmation. Mistakes are never deleted; sales are voided, reversing both stock and loan balances through audit entries.",
    keyRules: [
      "Payment Types: CASH (walk-ins or standing customers) or LOAN ('On account' - requires a registered customer).",
      "Immutable Snapshots: Price per kg, cost per kg, and packaging unit ratios are snapshotted on the sale record, never recalculated retrospectively.",
      "Oversell Guard: Selling more than on-hand stock triggers a 409 INSUFFICIENT_STOCK warning requiring explicit operator confirmation.",
      "Void, Never Delete: Voiding a sale writes SALE_VOID stock and loan ledger entries, keeping the audit trail intact.",
      "Closed Period Lock: Sales created on or before a closed financial lock date cannot be voided or restored.",
    ],
    stepByStep: [
      {
        step: 1,
        title: "Start a sale",
        instruction:
          "Click 'Record sale' on the Sales page or dashboard. Select the candle product and packaging unit (e.g. Carton, Packet, Box).",
      },
      {
        step: 2,
        title: "Choose customer and payment",
        instruction:
          "Select 'Walk-in' for immediate cash, or pick a standing customer to sell on account or utilize their existing advance credit.",
      },
      {
        step: 3,
        title: "Review breakdown and submit",
        instruction:
          "Check the calculated weight in KG, unit price, credit redeemed, and total price. If stock is negative or insufficient, confirm oversell prompt.",
      },
      {
        step: 4,
        title: "Void if mistaken",
        instruction:
          "If a sale was recorded in error, find it in the Sales list, click the row menu, select 'Void sale', and provide an explanatory reason.",
      },
    ],
    practicalExample: {
      title: "Recording a 50-carton sale with oversell confirmation",
      scenario:
        "Customer Gondor buys 50 cartons of Spiral Candles. Stock on hand is currently only 40 cartons.",
      steps: [
        "Clerk enters 50 Cartons under Gondor's account.",
        "System alerts that requested 50 cartons exceeds the 40 cartons on hand.",
        "Clerk confirms physical candles are loaded on Gondor's truck and confirms oversell.",
        "Sale completes, stock drops to -10 cartons (flagged as 'Negative' stock until production accepts new stock).",
      ],
      result:
        "Sale reference code generated, stock balance updated atomically, and Gondor's account updated.",
    },
  },
  {
    id: "finished-stock",
    title: "Finished Goods Stock & Factory Receiving",
    category: "Finished Goods",
    badge: "Inventory",
    requiredPermissions: ["stock:read", "stock:accept", "stock:adjust"],
    summary:
      "Accept finished candles from production, monitor real-time stock levels across units, and perform verified physical inventory adjustments.",
    overview:
      "Finished goods inventory uses a cached balance (StockBalance) paired with an append-only ledger (StockLedgerEntry). When factory workers finish candle batches, the inventory manager accepts them into stock. Stock entries record the input unit and convert to KG. Physical stock counts write signed ADJUSTMENT entries rather than overriding tables, ensuring full traceability.",
    keyRules: [
      "Atomic Updates: Balance updates compile to atomic SQL increments to prevent race conditions during concurrent sales and acceptances.",
      "Statuses: IN_STOCK (> alert level), LOW_STOCK (<= alert level), OUT_OF_STOCK (= 0), NEGATIVE (< 0), and NOT_TRACKED.",
      "Physical Audits: Physical counts record signed differences (e.g., -5 kg or +2 kg) with operator notes.",
      "Conversion Truth: All products store balances internally in KG. Packaging units (Cartons, Packets) convert via UnitConversion ratios.",
    ],
    stepByStep: [
      {
        step: 1,
        title: "Accept production batch",
        instruction:
          "Go to Stock (/inventory/stock or /manager/stock). Click 'Accept stock'. Select the candle product, enter quantity, and choose packaging unit.",
      },
      {
        step: 2,
        title: "View balance and history",
        instruction:
          "Click on any product row to see its complete stock ledger: accepts, sales, voids, and count adjustments.",
      },
      {
        step: 3,
        title: "Adjust stock after inventory count",
        instruction:
          "Managers can click 'Adjust stock' from the product menu to enter physical inventory counts, writing an audited ADJUSTMENT entry.",
      },
    ],
    practicalExample: {
      title: "Accepting morning production and adjusting damaged stock",
      scenario:
        "Factory floor delivers 200 cartons of Fluted Candles. 2 cartons were damaged in transit.",
      steps: [
        "Inventory clerk accepts 200 cartons, immediately raising on-hand inventory by 2,000 kg.",
        "Manager audits floor, spots 2 crushed cartons, and performs an adjustment of -2 cartons (-20 kg) with note 'Crushed cartons discarded'.",
      ],
      result:
        "Stock balance accurately shows 198 cartons (1,980 kg). Both the receipt and adjustment are permanently recorded in the ledger.",
    },
  },
  {
    id: "raw-materials-recipes",
    title: "Raw Materials, Factory Consumption & Recipes",
    category: "Raw Materials",
    badge: "Manufacturing",
    requiredPermissions: [
      "raw-material:read",
      "raw-material:record",
      "raw-material:manage",
    ],
    summary:
      "Track bulk raw materials (Paraffin Wax, Kir/Wick, Color Dyes), record factory consumption, and configure Bill of Materials (BOM) product recipes.",
    overview:
      "Production starts with raw materials. The raw materials module mirrors finished goods: cached balances (RawMaterialBalance) backed by an append-only ledger (RawMaterialLedgerEntry). Operators record received shipments (RECEIVED) and factory floor usage (CONSUMED). Each finished candle product can define a Bill of Materials recipe (ProductMaterialRequirement) specifying how many kilograms of wax and meters of wick make up each unit.",
    keyRules: [
      "Activity Types: RECEIVED (raw material shipment arrived) and CONSUMED (materials melted/used on the factory floor).",
      "Per-Product Recipes: Configured on the product detail page under the 'Recipe' tab.",
      "Stock Balance Independence: Recording sales does not automatically deplete raw materials; factory workers record actual consumption runs to reflect shop-floor reality.",
      "Material Units: Raw materials are tracked in their native measurement units (typically KG for wax/dyes, meters or kg for wicks).",
    ],
    stepByStep: [
      {
        step: 1,
        title: "Receive bulk raw materials",
        instruction:
          "In Raw Materials (/materials), click 'Record activity'. Choose 'Received', select the material (e.g. Semi-Refined Paraffin Wax), and enter quantity.",
      },
      {
        step: 2,
        title: "Log daily floor consumption",
        instruction:
          "At end of shift, record 'Consumed' for wax melted and wicks used during the production batch.",
      },
      {
        step: 3,
        title: "Configure product recipe",
        instruction:
          "Open Products (/manager/products), click a product, select 'Recipe' tab, and click 'Add material requirement'. Define required material and ratio per unit.",
      },
    ],
    practicalExample: {
      title: "Melting 500 kg paraffin wax for Spiral Candles",
      scenario:
        "Morning shift melts 500 kg of paraffin wax and uses 15 kg of wick spool.",
      steps: [
        "Floor supervisor opens /inventory/materials.",
        "Records 'Consumed' of 500 kg for Paraffin Wax #1 with note 'Shift A Spiral batch'.",
        "Records 'Consumed' of 15 kg for Cotton Wick Spool.",
      ],
      result:
        "Raw material balances decrease accordingly. The production report reconciles consumed materials against candles accepted.",
    },
  },
  {
    id: "pricing-and-costing",
    title: "Product Pricing, Unit Costing & Profit Margins",
    category: "Pricing & Costing",
    badge: "Profitability",
    requiredPermissions: ["product:read", "product:manage"],
    summary:
      "Set time-versioned selling prices and unit production costs to track exact profit margins across all candle products.",
    overview:
      "Profit tracking requires knowing both revenue and cost of goods. Adika Candle supports effective-dated Price and Cost models. When you set a new price or cost, the system closes out the prior record with an effectiveTo timestamp and creates a new active record with effectiveTo: null. Sales automatically snapshot the active cost per kg, allowing the Analytics Hub to calculate real gross margins without distorting historical sales.",
    keyRules: [
      "Time-Versioned: Setting a new price or cost never alters old sales; past sales retain the snapshot active when they occurred.",
      "Nullable Cost: If a product has no cost set, sales can still occur. Margin reports simply exclude uncosted sales rather than reporting an artificial 100% margin.",
      "Formula: Profit = (unitPriceAtSale - costPerKgAtSale) * quantityKg. Gross Margin % = (Profit / totalAmount) * 100.",
      "Manager-Only: Pricing and costing are restricted to managerial permissions.",
    ],
    stepByStep: [
      {
        step: 1,
        title: "Set product selling price",
        instruction:
          "Open product detail page. Under 'Price history', click 'Set new price'. Enter the new selling price per KG and effective date.",
      },
      {
        step: 2,
        title: "Set unit production cost",
        instruction:
          "Under the 'Cost history' tab, click 'Set new cost'. Input production cost per KG (materials + direct labor).",
      },
      {
        step: 3,
        title: "Monitor margin performance",
        instruction:
          "Visit /manager/analytics and open the 'Profitability' tab to see gross profit and margin percentages by product and timeframe.",
      },
    ],
    practicalExample: {
      title: "Raw material price increase leads to cost adjustment",
      scenario:
        "Wax import prices rise. Cost per kg of Standard White Candles rises from 70 ETB to 85 ETB. Selling price rises from 110 ETB to 130 ETB.",
      steps: [
        "Manager opens Standard White Candles detail page.",
        "Sets new price to 130 ETB/kg and new cost to 85 ETB/kg.",
        "Prior sales remain recorded at 110 ETB price and 70 ETB cost.",
        "New sales record margin of 45 ETB/kg (34.6% margin).",
      ],
      result:
        "Historical profit reports remain 100% accurate; future sales reflect updated margins.",
    },
  },
  {
    id: "analytics-reports",
    title: "Analytics Hub & Daily Factory Reports",
    category: "Analytics",
    badge: "Reports",
    requiredPermissions: ["analytics:read"],
    summary:
      "Access factory production reports modeled after the paper Daily Stock Report, profitability metrics, stock health alerts, and best sellers.",
    overview:
      "The Analytics Hub (/manager/analytics) replaces old paper logsheets with automated, real-time reporting. All reporting calculations run in tested, pure math functions aligned to the business timezone (Africa/Addis_Ababa). Four tabs give complete operational visibility: Production (mirroring the paper report), Profitability (costed revenue and margins), Stock Health (low stock and negative inventory), and Best Sellers (top performers).",
    keyRules: [
      "Factory Paper Alignment: The Production tab reproduces the paper Daily Stock Report: Opening + Received - Sold - Consumed = Closing.",
      "Timezone Standard: All calendar day, week, and month buckets calculate in Africa/Addis_Ababa (EAT) so 01:30 AM sales fall on the proper factory day.",
      "Void Exclusion: Voided sales (voidedAt != null) are strictly excluded from all revenue, volume, and margin calculations.",
      "Date Range Filter: Quick presets (Today, Yesterday, Last 7 Days, This Month) or custom calendar ranges.",
    ],
    stepByStep: [
      {
        step: 1,
        title: "Review daily production balance",
        instruction:
          "Open /manager/analytics and view the 'Production' tab. Check Opening stock, production Received, factory Sold, and Closing stock.",
      },
      {
        step: 2,
        title: "Analyze profit & margins",
        instruction:
          "Switch to 'Profitability' tab. Review gross revenue, cost of goods sold (COGS), net gross profit, and overall margin percentage.",
      },
      {
        step: 3,
        title: "Audit stock health",
        instruction:
          "Open 'Stock Health' tab to find items running below safety thresholds or products requiring replenishment.",
      },
    ],
    practicalExample: {
      title: "Generating the weekly factory stock report",
      scenario:
        "Factory manager needs to present weekly inventory movements and sales margins to the managing director.",
      steps: [
        "Selects 'This Month' or 'Last 7 Days' on the date-range filter.",
        "Production tab confirms 12,000 kg produced, 10,500 kg sold, closing balance matches warehouse floor.",
        "Profitability tab confirms gross margin averaged 32.4% over costed products.",
      ],
      result: "Data exportable or printable for factory management meetings.",
    },
  },
  {
    id: "activity-audit-log",
    title: "Activity Log & Comprehensive Audit Trail",
    category: "Activities",
    badge: "Auditability",
    requiredPermissions: ["activity:read"],
    summary:
      "Full transparency: every change across sales, loans, stock, and user accounts is logged with actor names, timestamps, and severity levels.",
    overview:
      "Every mutation across the API writes an append-only row to the Log table. Better-auth lifecycle hooks also record user sign-ins and sign-outs. The Activities page (/manager/activities) offers cursor-paginated browsing with filters by action, entity type, and severity. Changes capture old and new values so administrators can trace exactly who modified what.",
    keyRules: [
      "Automatic Logging: API handler wrapper CreateApiRoute writes activity rows automatically after successful mutations.",
      "Severities: INFO (routine sales, receipts), WARN (manual adjustments, voided sales, role modifications), ERROR (failed security actions).",
      "Actor Attribution: Records createdById and maps it to live display user names.",
      "Cursor Pagination: High-performance pagination using (createdAt, id) cursors.",
    ],
    stepByStep: [
      {
        step: 1,
        title: "Open Activities feed",
        instruction:
          "Go to /manager/activities to view the timeline of all system events, newest first.",
      },
      {
        step: 2,
        title: "Filter by severity or entity",
        instruction:
          "Filter by 'WARN' to quickly audit manual loan corrections, voided sales, or permission updates.",
      },
      {
        step: 3,
        title: "Inspect event details",
        instruction:
          "Click on any activity row to view the full payload of changes, notes, and the user who performed it.",
      },
    ],
    practicalExample: {
      title: "Auditing a loan balance manual adjustment",
      scenario:
        "A customer balance shows a sudden drop of 1,500 ETB. The accountant verifies why.",
      steps: [
        "Accountant visits Activities, filters by entity 'Customer'.",
        "Spots a WARN entry: 'Manager corrected the balance by -1,500 ETB for Gondor'.",
        "Clicks entry to view attached note: 'Transferred bank wire #98421 confirmed by CBE'.",
      ],
      result: "Full accountability without guesswork.",
    },
  },
  {
    id: "roles-and-access",
    title: "Users, Custom Roles & Access Containment",
    category: "Roles & Access",
    badge: "Security",
    requiredPermissions: ["user:manage", "role:manage"],
    summary:
      "Manage staff accounts, assign granular permissions, create custom roles, and enforce strict access containment.",
    overview:
      "Access control is permission-based rather than hardcoded to role titles. Built-in roles include ADMIN, MANAGER, and INVENTORY_MANAGER. You can also create custom roles (e.g., 'Senior Sales Clerk', 'Auditor') with bespoke permissions. Navigation sidebars and API routes strictly respect held permissions. Crucially, access containment guarantees that a user cannot grant or alter any permission they do not hold themselves.",
    keyRules: [
      "Access Containment: No user can grant a permission they do not have, nor can they edit a role containing permissions higher than their own.",
      "Dynamic Navigation: The sidebar dynamically adapts to whatever permissions the user holds (BuildNavItems).",
      "Self-Lockout Prevention: The system prohibits removing role:manage or user:manage from your own role.",
      "Password Reset Policy: Manager resets trigger a forced password change (mustChangePassword) on next login.",
    ],
    stepByStep: [
      {
        step: 1,
        title: "Create a user account",
        instruction:
          "Go to /manager/users and click 'New user'. Enter their name, unique username, and assign a role.",
      },
      {
        step: 2,
        title: "Create or tweak a custom role",
        instruction:
          "Go to /manager/roles, click 'Create role', and toggle specific permissions on or off (e.g. allow sales and stock read, disable voids).",
      },
      {
        step: 3,
        title: "Unlock locked accounts",
        instruction:
          "If an employee fails too many password attempts, their card flags 'Locked'. A manager can click 'Unlock account'.",
      },
    ],
    practicalExample: {
      title: "Setting up a Junior Sales Clerk role",
      scenario:
        "Factory hires a temporary clerk who should record sales and accept stock, but cannot void sales or adjust loan balances.",
      steps: [
        "Manager creates role 'Sales Clerk'.",
        "Checks permissions: sale:create, sale:read, stock:read, customer:read.",
        "Leaves unchecked: sale:void, loan:manage, stock:adjust.",
        "Assigns new employee to 'Sales Clerk'.",
      ],
      result:
        "The employee sees only Sales, Stock, and Customers. 'Void' buttons and 'Manual adjustment' dialogs are hidden and API-gated.",
    },
  },
  {
    id: "system-administration",
    title: "System Administration, Sessions & Closed Periods",
    category: "Administration",
    badge: "Admin Only",
    requiredPermissions: ["system:manage", "session:manage"],
    summary:
      "Admin controls: manage active device sessions, configure brute-force lockout thresholds, lock closed accounting periods, and download full backups.",
    overview:
      "The System module (/manager/system) is reserved for top administrators. It houses safeguards critical for enterprise accounting integrity: Closed Accounting Periods ensure past financial reports cannot be tampered with by back-dated voids; Maintenance Mode safely locks out non-admin staff during database maintenance; and the Backup utility provides instantaneous JSON data exports.",
    keyRules: [
      "Closed Period Lock: Any sale recorded on or prior to the closed period date cannot be voided or restored under any circumstances.",
      "Session Control: Active logins across phones, tablets, and desktop browsers are listed on /manager/sessions with remote kill options.",
      "Account Lockout: Configurable threshold (e.g. 5 failed attempts locks account for 30 minutes).",
      "Maintenance Mode: Shuts out non-exempt roles with a maintenance screen while admin performs upgrades.",
      "Data Backup: One-click export of complete factory database into JSON format.",
    ],
    stepByStep: [
      {
        step: 1,
        title: "Close a financial period",
        instruction:
          "Navigate to /manager/system. Under 'Closed periods', set the lock date to the end of last month. Sales prior to this date become permanent.",
      },
      {
        step: 2,
        title: "Audit and revoke active sessions",
        instruction:
          "Go to /manager/sessions. View all active user devices, IP addresses, and browsers. Click 'Revoke' to disconnect any unrecognized session.",
      },
      {
        step: 3,
        title: "Export backup",
        instruction:
          "Under /manager/system, click 'Download JSON backup' to create an off-site archive of customers, sales, stock, and ledger history.",
      },
    ],
    practicalExample: {
      title: "Month-end accounting closure",
      scenario:
        "Accountants complete month-end reconciliation for October. All figures are audited and tax reports submitted.",
      steps: [
        "Administrator visits /manager/system.",
        "Sets closed period lock date to 'October 31'.",
        "Attempts to void an October sale are immediately blocked by the system with 400 PERIOD_CLOSED.",
      ],
      result:
        "Guarantees books match tax filings and protects historical accounting records.",
    },
  },
];
