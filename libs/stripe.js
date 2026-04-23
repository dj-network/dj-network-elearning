import crypto from "node:crypto";

const STRIPE_API_BASE = "https://api.stripe.com/v1";

function requireStripeSecret() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY manquante.");
  }
  return key;
}

function appendFormValue(params, key, value) {
  if (value === undefined || value === null) return;
  if (Array.isArray(value)) {
    value.forEach((entry, index) => appendFormValue(params, `${key}[${index}]`, entry));
    return;
  }
  if (typeof value === "object") {
    Object.entries(value).forEach(([childKey, childValue]) => {
      appendFormValue(params, `${key}[${childKey}]`, childValue);
    });
    return;
  }
  params.append(key, String(value));
}

async function stripeRequest(path, { method = "POST", data, query } = {}) {
  const secret = requireStripeSecret();
  const url = new URL(`${STRIPE_API_BASE}${path}`);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    });
  }

  const init = {
    method,
    headers: {
      Authorization: `Bearer ${secret}`,
    },
  };

  if (data) {
    const body = new URLSearchParams();
    Object.entries(data).forEach(([key, value]) => appendFormValue(body, key, value));
    init.headers["Content-Type"] = "application/x-www-form-urlencoded";
    init.body = body.toString();
  }

  const res = await fetch(url, init);
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(payload?.error?.message || `Stripe error ${res.status}`);
  }
  return payload;
}

export async function createStripeCheckoutSession(data) {
  return stripeRequest("/checkout/sessions", { method: "POST", data });
}

export async function createStripeBillingPortalSession(data) {
  return stripeRequest("/billing_portal/sessions", { method: "POST", data });
}

export async function findStripeCustomerByEmail(email) {
  if (!email) return null;
  const out = await stripeRequest("/customers", {
    method: "GET",
    query: { email, limit: 1 },
  });
  return out?.data?.[0] || null;
}

export async function retrieveStripeSubscription(subscriptionId) {
  return stripeRequest(`/subscriptions/${subscriptionId}`, { method: "GET" });
}

export function verifyStripeSignature(payload, signatureHeader, secret) {
  if (!signatureHeader || !secret) return false;
  const parts = Object.fromEntries(
    signatureHeader.split(",").map((part) => {
      const [k, v] = part.split("=");
      return [k, v];
    }),
  );
  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(signedPayload, "utf8")
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "utf8"),
      Buffer.from(signature, "utf8"),
    );
  } catch {
    return false;
  }
}

