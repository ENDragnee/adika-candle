import { prisma } from "@/lib/prisma";

// Display-name lookups for activity summaries, so a log line reads
// "Counted Lavender Jar Candle" rather than an id. Missing records fall
// back to the id (the record may have been removed since).
export async function ProductName(id: string | undefined): Promise<string> {
  if (!id) return "a product";
  const product = await prisma.product.findUnique({
    where: { id },
    select: { name: true },
  });
  return product?.name ?? id;
}

export async function MaterialName(id: string | undefined): Promise<string> {
  if (!id) return "a raw material";
  const material = await prisma.rawMaterial.findUnique({
    where: { id },
    select: { name: true },
  });
  return material?.name ?? id;
}

export async function CustomerNameForAccount(
  accountId: string | undefined,
): Promise<{ id: string | undefined; name: string }> {
  if (!accountId) return { id: undefined, name: "a customer" };
  const account = await prisma.loanAccount.findUnique({
    where: { id: accountId },
    select: { customer: { select: { id: true, name: true } } },
  });
  return {
    id: account?.customer.id,
    name: account?.customer.name ?? "a customer",
  };
}

export async function UserName(id: string | undefined): Promise<string> {
  if (!id) return "a user";
  const user = await prisma.user.findUnique({
    where: { id },
    select: { name: true },
  });
  return user?.name ?? id;
}

// Field names that were sent in an update body, for "changed name and
// category" summaries.
export function ChangedFields(body: object): string[] {
  return Object.entries(body)
    .filter(([, value]) => value !== undefined)
    .map(([key]) => key);
}
