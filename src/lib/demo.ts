// The public demo workspace.
//
// One shared login, advertised on the landing and sign-in pages, holding
// invented data across three trips at different stages. It exists so a prospect
// can see a full desk in ten seconds instead of imagining one from screenshots.
//
// The credentials are deliberately in source: they're printed on the sign-in
// page. There is nothing to protect — the workspace holds no real data and is
// wiped and rebuilt by `npm run db:demo`.

export const DEMO_EMAIL = "demo@tripzei.com";
export const DEMO_PASSWORD = "seetripzei";
export const DEMO_ORG_NAME = "Northlight Journeys (Demo)";

// A second seat so the Team page shows something real.
export const DEMO_STAFF_EMAIL = "priya@tripzei.com";

const DEMO_EMAILS = new Set([DEMO_EMAIL, DEMO_STAFF_EMAIL]);

// Guards the handful of actions that would break the demo for everyone else —
// chiefly changing the password nobody could then recover. Visitors can add,
// edit and delete data all they like; that's the point, and the reset undoes it.
export function isDemoUser(email?: string | null): boolean {
  return !!email && DEMO_EMAILS.has(email.trim().toLowerCase());
}
