// Pricing plans + trial helpers. Prices are whole rupees / month.

export type PlanId = "trial" | "pro" | "business";

export const PLANS = [
  {
    id: "pro" as const,
    name: "Pro",
    price: 1999,
    yearly: 19999,
    tagline: "Everything a busy agency needs.",
    features: ["Unlimited trips & bookings", "GST tax invoicing", "Visa desk", "Payments & collections", "Up to 5 team members", "Email support"],
  },
  {
    id: "business" as const,
    name: "Business",
    price: 4999,
    yearly: 49999,
    tagline: "For agencies that also sell bespoke.",
    features: ["Everything in Pro", "Custom trips (à-la-carte) module", "Up to 15 team members", "Your own subdomain", "Priority support"],
  },
];

export const PLAN_LABEL: Record<string, string> = { trial: "Free trial", pro: "Pro", business: "Business" };

const TRIAL_DAYS = 30;
export function trialEndDate(from: Date = new Date()): Date {
  return new Date(from.getTime() + TRIAL_DAYS * 864e5);
}

type OrgPlan = { plan: string; trialEndsAt: Date | null };
export function isTrialExpired(org: OrgPlan): boolean {
  return org.plan === "trial" && !!org.trialEndsAt && org.trialEndsAt.getTime() < Date.now();
}
export function trialDaysLeft(org: OrgPlan): number | null {
  if (org.plan !== "trial" || !org.trialEndsAt) return null;
  return Math.max(0, Math.ceil((org.trialEndsAt.getTime() - Date.now()) / 864e5));
}
export function isPaid(org: OrgPlan): boolean {
  return org.plan === "pro" || org.plan === "business";
}
