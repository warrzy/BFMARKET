import { redirect } from "next/navigation";
import type { Role, ShopMemberRole } from "@prisma/client";
import { db } from "@/server/db";
import { getCurrentUser, type CurrentUser } from "./session";

export class ForbiddenError extends Error {
  constructor(message = "Accès refusé") {
    super(message);
  }
}

const ADMIN_ROLES: Role[] = ["COUNTRY_ADMIN", "ADMIN", "SUPER_ADMIN"];

export function isAdmin(user: Pick<CurrentUser, "role"> | null | undefined): boolean {
  return !!user && ADMIN_ROLES.includes(user.role);
}

export async function requireUser(next?: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/connexion${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  return user;
}

export async function requireAdmin(roles: Role[] = ADMIN_ROLES): Promise<CurrentUser> {
  const user = await requireUser("/admin");
  if (!roles.includes(user.role)) throw new ForbiddenError();
  return user;
}

/** Un COUNTRY_ADMIN ne voit que ses pays ; ADMIN/SUPER_ADMIN voient tout. Retourne un filtre Prisma. */
export function countryScope(user: CurrentUser): { in: string[] } | undefined {
  return user.role === "COUNTRY_ADMIN" ? { in: user.adminCountries } : undefined;
}

export function assertCountryAccess(user: CurrentUser, countryCode: string) {
  if (user.role === "COUNTRY_ADMIN" && !user.adminCountries.includes(countryCode)) throw new ForbiddenError();
}

/**
 * Boutique de l'utilisateur courant. TOUTE ressource vendeur doit être lue/modifiée
 * avec `where: { shopId: ctx.shop.id }` — c'est la frontière d'isolation multi-tenant.
 */
export async function requireShop(minRole: ShopMemberRole = "STAFF") {
  const user = await requireUser("/vendeur");
  const membership = await db.shopMember.findFirst({
    where: { userId: user.id },
    include: { shop: { include: { country: true, city: true } } },
    orderBy: { role: "asc" },
  });
  if (!membership) redirect("/ouvrir-boutique");
  const rank: Record<ShopMemberRole, number> = { OWNER: 3, MANAGER: 2, STAFF: 1 };
  if (rank[membership.role] < rank[minRole]) throw new ForbiddenError("Rôle insuffisant dans la boutique");
  return { user, shop: membership.shop, memberRole: membership.role };
}

export type ShopContext = Awaited<ReturnType<typeof requireShop>>;
