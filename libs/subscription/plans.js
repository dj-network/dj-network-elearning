export const SUBSCRIPTION_PLANS = [
  {
    code: "free",
    name: "Free",
    monthlyPriceCents: 0,
    monthlyCredits: 0,
    description: "Accès aux contenus gratuits et achat à l'unité.",
    perks: [
      "Contenus gratuits",
      "Achat à l'unité",
      "Bibliothèque personnelle",
    ],
  },
  {
    code: "studio",
    name: "Studio",
    monthlyPriceCents: 1900,
    monthlyCredits: 3,
    description: "Sélection de contenus + 3 crédits premium / mois.",
    perks: [
      "3 crédits premium / mois",
      "Contenus inclus Studio",
      "Tarif membre sur les formations",
    ],
  },
  {
    code: "studio_plus",
    name: "Studio+",
    monthlyPriceCents: 2900,
    monthlyCredits: 8,
    description: "Accès élargi + 8 crédits premium / mois + bonus exclusifs.",
    perks: [
      "8 crédits premium / mois",
      "Contenus inclus Studio+",
      "Remise membre renforcée",
      "Bonus exclusifs",
    ],
  },
];

const STRIPE_SUBSCRIPTION_PRICE_IDS = {
  studio: process.env.STRIPE_PRICE_STUDIO_MONTHLY || "",
  studio_plus: process.env.STRIPE_PRICE_STUDIO_PLUS_MONTHLY || "",
};

export function getSubscriptionPlan(planCode) {
  const code = String(planCode || "").trim().toLowerCase();
  return SUBSCRIPTION_PLANS.find((plan) => plan.code === code) || SUBSCRIPTION_PLANS[0];
}

export function getStripeSubscriptionPriceId(planCode) {
  const code = getSubscriptionPlan(planCode).code;
  return STRIPE_SUBSCRIPTION_PRICE_IDS[code] || "";
}

export function getPlanCodeFromStripePriceId(priceId) {
  const target = String(priceId || "").trim();
  if (!target) return "free";
  const match = Object.entries(STRIPE_SUBSCRIPTION_PRICE_IDS).find(
    ([, configuredPriceId]) => configuredPriceId && configuredPriceId === target,
  );
  return match?.[0] || "free";
}
