"use client";

import { useRouter } from "next/navigation";

export default function VisaTripFilter({ trips, selected }: { trips: { id: string; name: string }[]; selected: string }) {
  const router = useRouter();
  return (
    <select
      value={selected}
      onChange={(e) => router.push(e.target.value ? `/visas?trip=${e.target.value}` : "/visas")}
      style={{ maxWidth: 320 }}
    >
      <option value="">All upcoming trips</option>
      {trips.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
    </select>
  );
}
