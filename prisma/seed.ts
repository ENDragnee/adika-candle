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
  // product:cost — see costs and anything derived from them (margin,
  // profit). The Inventory Manager doesn't get it: they see prices only.
  product: ["product:read", "product:manage", "product:cost"],
  category: ["category:manage"],
  stock: ["stock:read", "stock:accept", "stock:adjust"],
  customer: ["customer:read", "customer:create", "customer:manage"],
  loan: ["loan:record", "loan:manage"],
  sale: ["sale:create", "sale:read", "sale:void", "sale:restore"],
  user: ["user:manage"],
  role: ["role:manage"],
  session: ["session:manage"],
  system: ["system:manage"],
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
  // Add customers from the Record Sale dialog instead of selling to an
  // anonymous walk-in.
  "customer:create",
  "loan:record",
  // Epic 14: record raw materials received (use in production is automatic).
  "raw-material:read",
  "raw-material:record",
];

// Permissions for features that were removed. Deleted on seed so the
// Roles page doesn't list toggles that no longer do anything.
const OBSOLETE_PERMISSIONS = ["unit-conversion:manage"];
const OBSOLETE_MODULES = ["unit-conversion"];

async function seedModulesAndPermissions() {
  await prisma.permission.deleteMany({
    where: { name: { in: OBSOLETE_PERMISSIONS } },
  });
  await prisma.module.deleteMany({ where: { name: { in: OBSOLETE_MODULES } } });

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

// Permissions only the Admin holds (Epic 23). The Manager gets everything
// else; access containment (src/lib/server/access-containment.ts) keeps a
// Manager from granting these to anyone, themselves included.
const ADMIN_ONLY_PERMISSIONS = [
  "session:manage",
  // Epic 24: System page (lockout, maintenance, period lock, retention,
  // backup) and restoring voided sales.
  "system:manage",
  "sale:restore",
];

const ADMIN_DESCRIPTION =
  "Total control: everything the Manager does, plus seeing and ending anyone's sessions.";
const MANAGER_DESCRIPTION =
  "Runs the business: analytics, stock, sales, loans, pricing, users and roles.";

async function seedRoles(allPermissionNames: string[]) {
  const managerPermissions = allPermissionNames.filter(
    (name) => !ADMIN_ONLY_PERMISSIONS.includes(name),
  );

  for (const [name, description, permissions] of [
    [ROLES.ADMIN, ADMIN_DESCRIPTION, allPermissionNames],
    [ROLES.MANAGER, MANAGER_DESCRIPTION, managerPermissions],
  ] as const) {
    await prisma.role.upsert({
      where: { name },
      update: {
        description,
        permissions: { set: permissions.map((name) => ({ name })) },
      },
      create: {
        name,
        description,
        permissions: { connect: permissions.map((name) => ({ name })) },
      },
    });
  }

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
// Catalog reference data. Packing (cartons/packets/pieces) and kg per
// carton are fixed rules in src/lib/packing.ts, not data.
// ---------------------------------------------------------------------------

// Production inputs, tracked in kg. "Kir" is the candle yarn (wick).
const RAW_MATERIALS = ["Wax", "Kir (yarn)"];

const CANDLE_CATEGORY = "Candles";

// The factory's candle lines and their carton size (Plus cartons are
// 8.5 kg, the rest 7 kg). No prices or costs are seeded — those are set
// per product by a Manager (pricing is variable over time).
const CANDLE_PRODUCTS: { name: string; cartonSize: "NORMAL" | "PLUS" }[] = [
  { name: "No. 6", cartonSize: "NORMAL" },
  { name: "Maral No. 7", cartonSize: "NORMAL" },
  { name: "Plus No. 8", cartonSize: "PLUS" },
  { name: "Small", cartonSize: "NORMAL" },
  { name: "Medium", cartonSize: "NORMAL" },
  { name: "Big", cartonSize: "NORMAL" },
  { name: "Color", cartonSize: "NORMAL" },
];

// The factory's standing customers (they can buy on account or pay in
// advance — see Customer/LoanAccount in schema.prisma).
const CUSTOMERS = ["Merkato", "Mekele", "Moges", "Gondor"];

// Every customer gets a LoanAccount at creation, same as
// POST /api/v1/customers (docs/DECISIONS.md, Epic 5). Customer.name isn't
// unique, so match case-insensitively to stay idempotent.
async function seedCustomers() {
  for (const name of CUSTOMERS) {
    const existing = await prisma.customer.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
    });
    if (existing) continue;
    await prisma.customer.create({
      data: { name, loanAccount: { create: {} } },
    });
  }
}

async function seedRawMaterials() {
  for (const name of RAW_MATERIALS) {
    await prisma.rawMaterial.upsert({
      where: { name },
      update: {},
      create: { name },
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

  for (const { name, cartonSize } of CANDLE_PRODUCTS) {
    // Product.name isn't unique (only sku is), so match on name within the
    // category to stay idempotent.
    const existing = await prisma.product.findFirst({
      where: { name, categoryId: category.id },
    });
    if (existing) {
      // Carton size was added after these products existed; their stored
      // kg already came from the matching carton weight, so correcting the
      // size here keeps the carton counts right.
      if (existing.cartonSize !== cartonSize) {
        await prisma.product.update({
          where: { id: existing.id },
          data: { cartonSize },
        });
      }
      continue;
    }

    const sku = GenerateCode();
    if (!sku) throw new Error(`Couldn't generate a SKU for ${name}`);
    await prisma.product.create({
      data: { name, sku, cartonSize, categoryId: category.id },
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
  prefix: "ADMIN" | "MANAGER" | "INVENTORY",
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
  await seedRawMaterials();
  await seedCustomers();
  await seedCandleCatalog();

  // One Admin, one Manager and one Inventory Manager account. The defaults
  // are dev credentials; set SEED_ADMIN_* / SEED_MANAGER_* /
  // SEED_INVENTORY_* to create real accounts. Outside development the
  // passwords must be provided — the seed refuses to create accounts with
  // the well-known dev password.
  await ensureDevUser(
    SeedAccount("ADMIN", {
      email: "admin@adika.local",
      username: "admin",
      name: "Administrator",
      roleName: ROLES.ADMIN,
    }),
  );

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
