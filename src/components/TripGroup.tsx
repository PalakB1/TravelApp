"use client";

import { useState, useTransition } from "react";
import { markGroupInviteSent } from "@/app/(app)/data-actions";
import { toWaNumber } from "@/lib/phone";
import SubmitButton from "./SubmitButton";

export type GroupMember = {
  bookingId: string;
  name: string;
  phone: string | null;
  pax: number;
  sentAt: string | null; // pre-formatted, or null
};

// Everything around making a trip's WhatsApp group.
//
// The group itself is made by hand on a phone — see the note in data-actions
// for why that can't be automated and why trying would be a bad idea. What this
// removes is the actual work: hunting for twelve phone numbers across twelve
// bookings, and then chasing each person to join.
export default function TripGroup({
  tripId,
  suggestedName,
  members,
  groupLink,
  defaultCc,
  daysToGo,
  saveAction,
}: {
  tripId: string;
  suggestedName: string;
  members: GroupMember[];
  groupLink: string | null;
  defaultCc: string;
  /** Days until departure; negative once it has left. */
  daysToGo: number | null;
  saveAction: (formData: FormData) => void | Promise<void>;
}) {
  const [copied, setCopied] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const withPhone = members.filter((m) => m.phone);
  const missing = members.filter((m) => !m.phone);
  const unsent = withPhone.filter((m) => !m.sentAt);

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1400);
    } catch { /* clipboard blocked — the number is on screen to read anyway */ }
  };

  const sendInvite = (m: GroupMember) => {
    if (!groupLink) return;
    const msg =
      `Hi ${m.name}, we've set up a WhatsApp group for your ${suggestedName} trip — ` +
      `it's where we'll share the final itinerary, pickup times and any updates. ` +
      `Join here: ${groupLink}`;
    const wa = toWaNumber(m.phone, defaultCc);
    window.open(
      wa ? `https://wa.me/${wa}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`,
      "_blank", "noopener",
    );
    start(() => { void markGroupInviteSent(m.bookingId); });
  };

  const due = daysToGo != null && daysToGo <= 5;

  return (
    <div className="card" style={groupLink ? undefined : due ? { borderColor: "var(--warning)" } : undefined}>
      <div className="card-title">
        WhatsApp group
        <span className="small muted">
          {groupLink
            ? `${withPhone.length - unsent.length} of ${withPhone.length} sent the join link`
            : daysToGo == null
              ? "set it up when the trip is dated"
              : daysToGo <= 5
                ? `departs in ${daysToGo} day${daysToGo === 1 ? "" : "s"} — time to make it`
                : `departs in ${daysToGo} days`}
        </span>
      </div>

      {!groupLink && (
        <>
          <ol className="small" style={{ margin: "0 0 14px", paddingLeft: 20, color: "var(--text-2)", lineHeight: 1.7 }}>
            <li>In WhatsApp, make a new group called <b>{suggestedName}</b> <button type="button" className="sm" onClick={() => copy(suggestedName, "name")} style={{ marginLeft: 6 }}>{copied === "name" ? "copied" : "copy name"}</button></li>
            <li>Add whoever you like from your own contacts — the rest get the link below</li>
            <li>Open the group → <b>Invite via link</b> → copy it → paste it here</li>
          </ol>
          <form action={saveAction} className="row" style={{ alignItems: "end" }}>
            <input type="hidden" name="id" value={tripId} />
            <label className="field">
              <span className="lbl">Group invite link</span>
              <input name="groupLink" placeholder="https://chat.whatsapp.com/..." autoComplete="off" />
            </label>
            <SubmitButton className="primary" pendingLabel="Saving…">Save link</SubmitButton>
          </form>
        </>
      )}

      {groupLink && (
        <div className="flex" style={{ gap: 8, flexWrap: "wrap", marginBottom: 14, alignItems: "center" }}>
          <a className="btn sm" href={groupLink} target="_blank" rel="noopener">Open the group</a>
          <button type="button" className="sm" onClick={() => copy(groupLink, "link")}>{copied === "link" ? "copied" : "Copy link"}</button>
          <form action={saveAction}>
            <input type="hidden" name="id" value={tripId} />
            <input type="hidden" name="groupLink" value="" />
            <button className="sm" type="submit" title="Forget this link">✕ Remove</button>
          </form>
          {unsent.length > 0 && (
            <span className="small muted" style={{ marginLeft: "auto" }}>
              {unsent.length} still to invite
            </span>
          )}
        </div>
      )}

      <table className="t">
        <thead><tr><th style={{ paddingLeft: 0 }}>Traveller</th><th>Phone</th><th className="num">{groupLink ? "Invite" : ""}</th></tr></thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.bookingId}>
              <td style={{ paddingLeft: 0 }}>
                {m.name}
                <span className="small muted"> · {m.pax} pax</span>
              </td>
              <td className="small">
                {m.phone ? (
                  <button type="button" className="sm" onClick={() => copy(m.phone!, m.bookingId)} title="Copy, then paste into WhatsApp's add-participant search">
                    {copied === m.bookingId ? "copied" : m.phone}
                  </button>
                ) : (
                  <span className="muted">no number on file</span>
                )}
              </td>
              <td className="num">
                {groupLink && m.phone && (
                  m.sentAt ? (
                    <span className="flex" style={{ gap: 6, justifyContent: "flex-end", alignItems: "center" }}>
                      <span className="badge emerald" title={`Link sent ${m.sentAt}`}>sent</span>
                      <button type="button" className="sm" disabled={pending} onClick={() => sendInvite(m)}>again</button>
                    </span>
                  ) : (
                    <button type="button" className="btn sm primary" disabled={pending} onClick={() => sendInvite(m)}>💬 Send link</button>
                  )
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {missing.length > 0 && (
        <p className="small muted" style={{ margin: "10px 0 0" }}>
          {missing.length} {missing.length === 1 ? "booking has" : "bookings have"} no phone number, so {missing.length === 1 ? "it" : "they"} can&apos;t be
          invited — add one on the booking.
        </p>
      )}
      <p className="small muted" style={{ margin: "10px 0 0" }}>
        People join through the link rather than being added, because WhatsApp lets everyone choose who may add
        them to groups — an add would silently fail for anyone who hasn&apos;t saved your number.
      </p>
    </div>
  );
}
