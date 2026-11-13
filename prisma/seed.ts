import { auth } from "@/lib/auth";
import { GenerateCode } from "@/lib/generate-code";
import { prisma } from "@/lib/prisma";
import { ROLES } from "@/lib/redirector";

// Module -> permission names, matching docs/epics/*.md's permission tables.
// This is the full set of permissions the whole domain will eventually use
// — later epics reference these same names rather than inventing new ones.
const MODULE_PERMISSIONS: Record<string, string[]> = {
  analytics: ["analytics:read"],
  activity: ["activity:read"],
  product: ["product:read", "product:manage"],
  category: ["category:manage"],
  stock: ["stock:read", "stock:accept", "stock:adjust"],
  customer: ["customer:read", "customer:manage"],
  loan: ["loan:record", "loan:manage"],
  sale: ["sale:create", "sale:read", "sale:void"],
  user: ["user:manage"],
  role: ["role:manage"],
  "unit-conversion": ["unit-conversion:manage"],
  "raw-material": [
    "raw-material:read",
    "raw-material:record",
    "raw-material:manage",
  ],
};

const INVENTORY_MANAGER_PERMISSIONS = [
  "stock:read",
  "stock:accept",
  // Needed to populate the product picker on "Accept Stock" (Epic 4) and,
  // inevitably, "Record Sale" (Epic 6) — Inventory Manager was never given
  // read access to the product catalog despite needing it for both flows.
  "product:read",
  "sale:create",
  "sale:read",
  "customer:read",
  "loan:record",
  // Epic 14: record Received/Consumed activity against raw materials.
  "raw-material:read",
  "raw-material:record",
];

async function seedModulesAndPermissions() {
  const allPermissionNames: string[] = [];

  for (const [moduleName, permissionNames] of Object.entries(
    MODULE_PERMISSIONS,
  )) {
    const module = await prisma.module.upsert({
      where: { name: moduleName },
      update: {},
      create: { name: moduleName },
    });

    for (const permissionName of permissionNames) {
      await prisma.permission.upsert({
        where: { name: permissionName },
        update: { moduleId: module.id },
        create: { name: permissionName, moduleId: module.id },
      });
      allPermissionNames.push(permissionName);
    }
  }

  return allPermissionNames;
}

async function seedRoles(allPermissionNames: string[]) {
  await prisma.role.upsert({
    where: { name: ROLES.MANAGER },
    update: {
      permissions: { set: allPermissionNames.map((name) => ({ name })) },
    },
    create: {
      name: ROLES.MANAGER,
      description: "Full access: analytics, stock, users, pricing, etc.",
      permissions: { connect: allPermissionNames.map((name) => ({ name })) },
    },
  });

  await prisma.role.upsert({
    where: { name: ROLES.INVENTORY_MANAGER },
    update: {
      permissions: {
        set: INVENTORY_MANAGER_PERMISSIONS.map((name) => ({ name })),
      },
    },
    create: {
      name: ROLES.INVENTORY_MANAGER,
      description: "Accepts and sells stock, records loan activity.",
      permissions: {
        connect: INVENTORY_MANAGER_PERMISSIONS.map((name) => ({ name })),
      },
    },
  });
}

// ---------------------------------------------------------------------------
// Catalog reference data. KG is the base (SI) unit for every quantity;
// each selling unit converts to kg by its ratio.
// ---------------------------------------------------------------------------

// Carton = 30 kg is confirmed. Packet, Kir and Cola are known selling units
// whose kg ratio isn't confirmed yet: they're seeded *inactive* with a
// placeholder ratio of 1 so they never appear in Record Sale / Accept Stock
// until a Manager sets the real ratio and activates them under Settings →
// Unit conversions.
const UNIT_CONVERSIONS: {
  unitName: string;
  ratioToKg: number;
  isActive: boolean;
}[] = [
  { unitName: "CARTON", ratioToKg: 30, isActive: true },
  { unitName: "PACKET", ratioToKg: 1, isActive: false },
  { unitName: "KIR", ratioToKg: 1, isActive: false },
  { unitName: "COLA", ratioToKg: 1, isActive: false },
];

const CANDLE_CATEGORY = "Candles";

// The factory's candle lines. No prices or costs are seeded — those are
// set per product by a Manager (pricing is variable over time).
const CANDLE_PRODUCTS = [
  "No. 6",
  "Maral No. 7",
  "Plus No. 8",
  "Small",
  "Medium",
  "Big",
  "Color",
];

// Idempotent: creates missing units only. An existing unit is left as is,
// so re-seeding never overwrites a ratio or status a Manager has changed.
async function seedUnitConversions() {
  for (const unit of UNIT_CONVERSIONS) {
    await prisma.unitConversion.upsert({
      where: { unitName: unit.unitName },
      update: {},
      create: unit,
    });
  }
}

async function seedCandleCatalog() {
  const category = await prisma.category.upsert({
    where: { name: CANDLE_CATEGORY },
    update: {},
    create: {
      name: CANDLE_CATEGORY,
      description: "Finished candles sold by the factory.",
    },
  });

  for (const name of CANDLE_PRODUCTS) {
    // Product.name isn't unique (only sku is), so match on name within the
    // category to stay idempotent.
    const existing = await prisma.product.findFirst({
      where: { name, categoryId: category.id },
    });
    if (existing) continue;

    const sku = GenerateCode();
    if (!sku) throw new Error(`Couldn't generate a SKU for ${name}`);
    await prisma.product.create({
      data: { name, sku, categoryId: category.id },
    });
  }
}

async function ensureDevUser({
  email,
  username,
  password,
  name,
  roleName,
}: {
  email: string;
  username: string;
  password: string;
  name: string;
  roleName: string;
}) {
  let user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    const result = await auth.api.signUpEmail({
      body: { email, password, name, username },
    });
    user = await prisma.user.findUniqueOrThrow({
      where: { id: result.user.id },
    });
  }

  const role = await prisma.role.findUniqueOrThrow({
    where: { name: roleName },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { roleId: role.id },
  });
}

const DEV_PASSWORD = "ChangeMe123!";

function SeedAccount(
  prefix: "MANAGER" | "INVENTORY",
  defaults: { email: string; username: string; name: string; roleName: string },
) {
  const env = (key: string) => process.env[`SEED_${prefix}_${key}`];
  const password = env("PASSWORD");
  if (!password && process.env.NODE_ENV === "production") {
    throw new Error(
      `SEED_${prefix}_PASSWORD must be set when seeding outside development`,
    );
  }
  return {
    email: env("EMAIL") ?? defaults.email,
    username: env("USERNAME") ?? defaults.username,
    name: env("NAME") ?? defaults.name,
    password: password ?? DEV_PASSWORD,
    roleName: defaults.roleName,
  };
}

async function main() {
  const allPermissionNames = await seedModulesAndPermissions();
  await seedRoles(allPermissionNames);
  await seedUnitConversions();
  await seedCandleCatalog();

  // One Manager and one Inventory Manager account. The defaults are dev
  // credentials; set SEED_MANAGER_* / SEED_INVENTORY_* to create real
  // accounts. Outside development the passwords must be provided — the
  // seed refuses to create accounts with the well-known dev password.
  await ensureDevUser(
    SeedAccount("MANAGER", {
      email: "manager@adika.local",
      username: "manager",
      name: "Manager",
      roleName: ROLES.MANAGER,
    }),
  );

  await ensureDevUser(
    SeedAccount("INVENTORY", {
      email: "inventory@adika.local",
      username: "inventory",
      name: "Inventory Manager",
      roleName: ROLES.INVENTORY_MANAGER,
    }),
  );

  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
