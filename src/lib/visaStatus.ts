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
export function visaMeta(status: string | null | undefined): { label: string; short: string; badge: string } {
  switch (status) {
    case "required": return { label: "Required — not started", short: "Visa required", badge: "amber" };
    case "initiated": return { label: "Initiated / in progress", short: "Visa initiated", badge: "sky" };
    case "submitted": return { label: "Submitted to embassy", short: "Visa submitted", badge: "violet" };
    case "approved": return { label: "Approved / received", short: "Visa approved", badge: "green" };
    case "rejected": return { label: "Rejected", short: "Visa rejected", badge: "red" };
    case "held": return { label: "Already holds a valid visa", short: "Has visa", badge: "green" };
    default: return { label: "Not required", short: "No visa needed", badge: "gray" };
  }
}

export const visaHandledLabel = (h: string | null | undefined) =>
  h === "us" ? "We arrange it" : h === "self" ? "Customer arranges it" : "";

// Does this booking need active visa work (for at-a-glance counts / attention)?
export const visaNeedsAction = (status: string | null | undefined) =>
  status === "required" || status === "initiated" || status === "submitted" || status === "rejected";
