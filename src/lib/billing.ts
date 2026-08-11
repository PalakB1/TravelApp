// Plans and trial helpers.
//
// TripZei is FREE while it's finding its first agencies. That's a deliberate
// commercial call, not an oversight: two paid tiers at ₹1,999 and ₹4,999 were
// too cheap to justify a sales conversation and too specific to be right before
// anyone has told us what they'd pay. Charging comes later, from evidence.
//
// The plan column still exists and still gates features — "business" unlocks
// Custom trips — so switching pricing back on later is a matter of setting
// PAID_LAUNCHED and filling in the prices, not rebuilding anything.

export type PlanId = "trial" | "pro" | "business";

/** Flip to true when there is a real price to charge. */
export const PAID_LAUNCHED = false;

export const PLANS = [
  {
    id: "pro" as const,
    name: "Pro",
    price: 0,
    yearly: 0,
    tagline: "Everything a busy agency needs.",
    features: [
      "Unlimited trips & bookings",
      "Tax invoicing with gap-free serials",
      "Visa desk",
      "Payments, plans & collections",
      "Up to 5 team members",
      "Email support",
    ],
  },
  {
    id: "business" as const,
    name: "Business",
    price: 0,
    yearly: 0,
    tagline: "For agencies that also sell bespoke.",
    features: [
      "Everything in Pro",
      "Custom trips (à-la-carte) module",
      "Up to 15 team members",
      "Priority support",
    ],
  },
];

export const PLAN_LABEL: Record<string, string> = { trial: "Free", pro: "Pro", business: "Business" };

// While it's free, a trial that "expires" would lock people out of a product
// nobody is paying for. Long enough to be effectively open-ended, and the
// expiry check below is disabled anyway until PAID_LAUNCHED.
const TRIAL_DAYS = 365;
export function trialEndDate(from: Date = new Date()): Date {
  return new Date(from.getTime() + TRIAL_DAYS * 864e5);
}

type OrgPlan = { plan: string; trialEndsAt: Date | null };

export function isTrialExpired(org: OrgPlan): boolean {
  if (!PAID_LAUNCHED) return false; // nothing to upgrade to yet
  return org.plan === "trial" && !!org.trialEndsAt && org.trialEndsAt.getTime() < Date.now();
}

export function trialDaysLeft(org: OrgPlan): number | null {
  if (!PAID_LAUNCHED) return null; // hides the countdown banner while it's free
  if (org.plan !== "trial" || !org.trialEndsAt) return null;
  return Math.max(0, Math.ceil((org.trialEndsAt.getTime() - Date.now()) / 864e5));
}

export function isPaid(org: OrgPlan): boolean {
  return org.plan === "pro" || org.plan === "business";
}
