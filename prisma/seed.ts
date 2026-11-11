import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROLES } from "@/lib/redirector";

// Module -> permission names, matching docs/epics/*.md's permission tables.
// This is the full set of permissions the whole domain will eventually use
// — later epics reference these same names rather than inventing new ones.
const MODULE_PERMISSIONS: Record<string, string[]> = {
  analytics: ["analytics:read"],
  product: ["product:read", "product:manage"],
  category: ["category:manage"],
  stock: ["stock:read", "stock:accept"],
  customer: ["customer:read", "customer:manage"],
  loan: ["loan:record", "loan:manage"],
  sale: ["sale:create", "sale:read"],
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

async function main() {
  const allPermissionNames = await seedModulesAndPermissions();
  await seedRoles(allPermissionNames);

  // Dev-only seed users — never run this against a production database.
  await ensureDevUser({
    email: "manager@adika.local",
    username: "manager",
    password: "ChangeMe123!",
    name: "Dev Manager",
    roleName: ROLES.MANAGER,
  });

  await ensureDevUser({
    email: "inventory@adika.local",
    username: "inventory",
    password: "ChangeMe123!",
    name: "Dev Inventory Manager",
    roleName: ROLES.INVENTORY_MANAGER,
  });

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
