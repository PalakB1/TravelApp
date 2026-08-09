// Per-booking visa tracking — shared labels + badge styling so the booking page,
// the trip's booking list and the bookings list all read the same.

export const VISA_STATUSES: { value: string; label: string }[] = [
  { value: "not_required", label: "Not required" },
  { value: "required", label: "Required — not started" },
  { value: "initiated", label: "Initiated / in progress" },
  { value: "submitted", label: "Submitted to embassy" },
  { value: "approved", label: "Approved / received" },
  { value: "rejected", label: "Rejected" },
  { value: "held", label: "Already holds a valid visa" },
];

// badge maps to a CSS class in globals.css (green | amber | red | gray | sky | violet).
//
// `tiny` is for places where the visa state has to ride along beside something
// else — a customer's name in the money list — and a full label would cost a
// column. Two words at most, and still readable without a tooltip.
export function visaMeta(status: string | null | undefined): { label: string; short: string; tiny: string; badge: string } {
  switch (status) {
    case "required": return { label: "Required — not started", short: "Visa required", tiny: "visa to do", badge: "amber" };
    case "initiated": return { label: "Initiated / in progress", short: "Visa initiated", tiny: "visa started", badge: "sky" };
    case "submitted": return { label: "Submitted to embassy", short: "Visa submitted", tiny: "visa sent", badge: "violet" };
    case "approved": return { label: "Approved / received", short: "Visa approved", tiny: "visa ok", badge: "green" };
    case "rejected": return { label: "Rejected", short: "Visa rejected", tiny: "visa refused", badge: "red" };
    case "held": return { label: "Already holds a valid visa", short: "Has visa", tiny: "has visa", badge: "green" };
    default: return { label: "Not required", short: "No visa needed", tiny: "", badge: "gray" };
  }
}

export const visaHandledLabel = (h: string | null | undefined) =>
  h === "us" ? "We arrange it" : h === "self" ? "Customer arranges it" : "";

// Does this booking need active visa work (for at-a-glance counts / attention)?
export const visaNeedsAction = (status: string | null | undefined) =>
  status === "required" || status === "initiated" || status === "submitted" || status === "rejected";
