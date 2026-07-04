import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import LandingClient from "./LandingClient";

export const dynamic = "force-dynamic";

export default async function Landing() {
  const session = await getSession();
  if (session) redirect("/dashboard");
  return <LandingClient />;
}
