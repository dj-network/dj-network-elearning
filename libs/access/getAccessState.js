export function normalizePlan(plan) {
  const value = String(plan || "").trim().toLowerCase();
  if (!value) return "free";
  if (["studio_plus", "studio-plus", "studioplus", "pro", "premium"].includes(value)) {
    return "studio_plus";
  }
  if (value === "studio") return "studio";
  return "free";
}

function hasTierAccess(plan, tier) {
  const normalizedPlan = normalizePlan(plan);
  const normalizedTier = String(tier || "none").trim().toLowerCase();

  if (!normalizedTier || normalizedTier === "none") return false;
  if (normalizedTier === "free") return true;
  if (normalizedTier === "studio") {
    return normalizedPlan === "studio" || normalizedPlan === "studio_plus";
  }
  if (normalizedTier === "studio_plus") {
    return normalizedPlan === "studio_plus";
  }
  return false;
}

export function hasCreditAccess(plan, tier) {
  const normalizedPlan = normalizePlan(plan);
  const normalizedTier = String(tier || "none").trim().toLowerCase();

  if (normalizedPlan === "free") return false;
  if (!normalizedTier || normalizedTier === "none") {
    return normalizedPlan === "studio" || normalizedPlan === "studio_plus";
  }
  if (normalizedTier === "studio") {
    return normalizedPlan === "studio" || normalizedPlan === "studio_plus";
  }
  if (normalizedTier === "studio_plus") {
    return normalizedPlan === "studio_plus";
  }
  return false;
}

function formatPriceLabel(price, currency = "EUR") {
  if (price == null || price === "") return "Gratuit";
  const num = typeof price === "number" ? price : Number(price);
  if (!Number.isFinite(num)) return "";
  const formatted = num.toFixed(2).replace(".", ",");
  return currency === "EUR" ? `${formatted}€` : `${formatted} ${currency}`;
}

export function getAccessState({
  item,
  itemType = "product",
  isAdmin = false,
  isOwned = false,
  subscriptionPlan = null,
  creditsBalance = 0,
}) {
  const accessModel = String(item?.accessModel || item?.access_model || "").trim().toLowerCase();
  const accessTier = String(item?.accessTier || item?.access_tier || "none")
    .trim()
    .toLowerCase();
  const creditCost = Math.max(
    0,
    Number(item?.creditCost ?? item?.credit_cost ?? 0) || 0,
  );
  const price = item?.price ?? null;
  const isFree = accessModel === "free" || price == null || price === 0;
  const isPublished = item?.isPublished !== false && item?.is_published !== false;
  const hasSubscriptionAccess =
    accessModel === "subscription" && hasTierAccess(subscriptionPlan, accessTier);
  const creditEnabled =
    itemType !== "elearning" &&
    creditCost > 0 &&
    !isFree &&
    hasCreditAccess(subscriptionPlan, accessTier);
  const canUnlockWithCredit =
    creditEnabled && Number(creditsBalance || 0) >= creditCost;
  const hasNoCredits =
    creditEnabled && Number(creditsBalance || 0) < creditCost;

  const studioDiscount = Number(item?.memberDiscountStudio ?? item?.member_discount_studio);
  const studioPlusDiscount = Number(
    item?.memberDiscountStudioPlus ?? item?.member_discount_studio_plus,
  );
  const normalizedPlan = normalizePlan(subscriptionPlan);
  const activeDiscount =
    normalizedPlan === "studio_plus"
      ? studioPlusDiscount
      : normalizedPlan === "studio"
        ? studioDiscount
        : 0;
  const purchasePriceLabel =
    activeDiscount > 0
      ? `Membre ${formatPriceLabel(
          Number(price) * (1 - activeDiscount / 100),
          item?.currency || "EUR",
        )}`
      : formatPriceLabel(price, item?.currency || "EUR");
  const creditPriceLabel = creditEnabled
    ? `${creditCost} crédit${creditCost > 1 ? "s" : ""}`
    : null;

  const status = isAdmin
    ? "owned"
    : isOwned
      ? "owned"
      : isFree
        ? "free"
        : hasSubscriptionAccess
          ? "included_subscription"
          : canUnlockWithCredit
            ? "unlock_with_credit"
            : hasNoCredits
              ? "subscription_locked"
              : activeDiscount > 0
                ? "member_discount"
                : "purchase_required";

  const fileUrl = item?.fileUrl || item?.file_url || null;
  const missingFile =
    itemType === "product" &&
    (
      status === "owned" ||
      status === "free" ||
      status === "included_subscription"
    ) &&
    !fileUrl;

  const visible = isPublished || isAdmin;

  let ctaLabel = "Voir";
  if (itemType === "product") {
    if (missingFile) ctaLabel = "Fichier manquant";
    else if (status === "owned" || status === "free" || status === "included_subscription") {
      ctaLabel = "Télécharger";
    } else if (status === "unlock_with_credit") {
      ctaLabel = `Débloquer (${creditCost} crédit${creditCost > 1 ? "s" : ""})`;
    } else if (status === "subscription_locked") {
      ctaLabel = "Plus de crédits";
    } else {
      ctaLabel = "Acheter";
    }
  } else {
    if (status === "owned" || status === "free" || status === "included_subscription") {
      ctaLabel = "Regarder";
    } else if (status === "unlock_with_credit") {
      ctaLabel = `Débloquer (${creditCost} crédit${creditCost > 1 ? "s" : ""})`;
    } else if (status === "subscription_locked") {
      ctaLabel = "Plus de crédits";
    } else {
      ctaLabel = "Acheter";
    }
  }

  let badge = null;
  if (!isPublished && isAdmin) badge = "Brouillon";
  else if (status === "owned") badge = "Possédé";
  else if (status === "included_subscription") badge = "Inclus abonnement";
  else if (status === "unlock_with_credit") {
    badge = `${creditCost} crédit${creditCost > 1 ? "s" : ""}`;
  }
  else if (status === "subscription_locked") badge = "Abonnement";
  else if (status === "member_discount") badge = "Tarif membre";
  else if (status === "free") badge = "Gratuit";

  return {
    visible,
    status,
    badge,
    isFree,
    isPublished,
    missingFile,
    canDownload:
      itemType === "product" &&
      !missingFile &&
      (status === "owned" || status === "free" || status === "included_subscription"),
    canWatch:
      itemType !== "product" &&
      (status === "owned" || status === "free" || status === "included_subscription"),
    canUnlockWithCredit: status === "unlock_with_credit",
    canPurchase: status === "purchase_required" || status === "member_discount",
    creditCost,
    ctaLabel,
    purchasePriceLabel,
    creditPriceLabel,
    hasDualPurchaseOptions:
      !isAdmin &&
      !isOwned &&
      !isFree &&
      itemType !== "elearning" &&
      creditEnabled,
    priceLabel:
      status === "owned" || status === "included_subscription"
        ? "Disponible"
        : status === "unlock_with_credit" || status === "subscription_locked"
          ? `${creditCost} crédit${creditCost > 1 ? "s" : ""}`
        : status === "member_discount" && activeDiscount > 0
          ? `Membre ${formatPriceLabel(
              Number(price) * (1 - activeDiscount / 100),
              item?.currency || "EUR",
            )}`
          : formatPriceLabel(price, item?.currency || "EUR"),
  };
}
