"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import db from "@/libs/db";
import {
  creditTransactions,
  masterclasses,
  products,
  subscriptions,
  userAccess,
} from "@/libs/schema";
import { and, eq, gte, isNull, or } from "drizzle-orm";
import {
  getAccessState,
  hasCreditAccess,
  normalizePlan,
} from "@/libs/access/getAccessState";

function makeId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }
}

async function getActiveSubscriptionForUser(userId) {
  if (!userId) return null;
  const now = new Date();
  const rows = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.status, "active"),
        or(isNull(subscriptions.endDate), gte(subscriptions.endDate, now)),
      ),
    )
    .limit(1);
  return rows[0] || null;
}

export async function redeemSubscriptionCredit({ itemType, itemId }) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Connexion requise." };

  const activeSubscription = await getActiveSubscriptionForUser(session.user.id);
  if (!activeSubscription) return { error: "Aucun abonnement actif." };

  const plan = normalizePlan(activeSubscription.planCode || activeSubscription.plan);
  const creditsBalance = Number(activeSubscription.creditsBalance || 0);
  if (creditsBalance <= 0) return { error: "Vous n'avez plus de crédits ce mois-ci." };

  const map = {
    product: {
      table: products,
      idField: products.id,
      slugField: products.slug,
      accessField: userAccess.productId,
      accessValues: { productId: itemId },
      path: "product",
    },
    masterclass: {
      table: masterclasses,
      idField: masterclasses.id,
      slugField: masterclasses.slug,
      accessField: userAccess.masterclassId,
      accessValues: { masterclassId: itemId },
      path: "masterclasses",
    },
  };

  const config = map[itemType];
  if (!config) return { error: "Type de contenu invalide." };

  const [item] = await db
    .select()
    .from(config.table)
    .where(eq(config.idField, itemId))
    .limit(1);

  if (!item) return { error: "Contenu introuvable." };

  const creditCost = Math.max(
    0,
    Number(item.creditCost ?? item.credit_cost ?? 0) || 0,
  );
  if (creditCost <= 0) {
    return { error: "Ce contenu n'est pas disponible via crédits." };
  }
  if (!hasCreditAccess(plan, item.accessTier || item.access_tier)) {
    return { error: "Votre formule ne permet pas de débloquer ce contenu." };
  }
  if (creditsBalance < creditCost) {
    return { error: "Vous n'avez pas assez de crédits pour ce contenu." };
  }

  const state = getAccessState({
    item,
    itemType,
    isOwned: false,
    isAdmin: false,
    subscriptionPlan: plan,
    creditsBalance,
  });
  if (!state.canUnlockWithCredit) {
    return {
      error: `Ce contenu ne peut pas être débloqué avec ${creditCost} crédit${creditCost > 1 ? "s" : ""}.`,
    };
  }

  const existingAccess = await db
    .select({ id: userAccess.id })
    .from(userAccess)
    .where(
      and(eq(userAccess.userId, session.user.id), eq(config.accessField, itemId)),
    )
    .limit(1);
  if (existingAccess[0]) {
    return { success: true };
  }

  await db.transaction(async (tx) => {
    await tx
      .update(subscriptions)
      .set({ creditsBalance: creditsBalance - creditCost })
      .where(eq(subscriptions.id, activeSubscription.id));

    await tx.insert(userAccess).values({
      id: makeId(),
      userId: session.user.id,
      ...config.accessValues,
      source: "subscription",
      grantedAt: new Date(),
    });

    await tx.insert(creditTransactions).values({
      id: makeId(),
      userId: session.user.id,
      subscriptionId: activeSubscription.id,
      amount: -creditCost,
      reason: "content_unlock",
      itemType,
      itemId,
      createdAt: new Date(),
    });
  });

  revalidatePath("/bibliotheque");
  revalidatePath(`/${config.path}/${item.slug}`);
  revalidatePath("/settings");

  return { success: true };
}
