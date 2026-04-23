"use client";

const disabledMessage =
  "Paiement désactivé sur l'espace e-learning. Les accès sont gérés par DJ Network.";

export function SubscriptionCheckoutButton({
  children,
  className = "",
}) {
  return (
    <button type="button" onClick={() => alert(disabledMessage)} className={className}>
      {children}
    </button>
  );
}

export function BillingPortalButton({ children, className = "" }) {
  return (
    <button type="button" onClick={() => alert(disabledMessage)} className={className}>
      {children}
    </button>
  );
}

export function OneTimeCheckoutButton({
  children,
  className = "",
}) {
  return (
    <button type="button" onClick={() => alert(disabledMessage)} className={className}>
      {children}
    </button>
  );
}

export function RedeemCreditButton({
  children,
  className = "",
}) {
  return (
    <button type="button" onClick={() => alert(disabledMessage)} className={className}>
      {children}
    </button>
  );
}
