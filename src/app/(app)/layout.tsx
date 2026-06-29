import { getSession } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";
import EscToClose from "@/components/EscToClose";
import CollapseOnSave from "@/components/CollapseOnSave";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  return (
    <div className="app">
      <EscToClose />
      <CollapseOnSave />
      <Sidebar name={session?.name ?? "you"} />
      <main className="main">{children}</main>
    </div>
  );
}
