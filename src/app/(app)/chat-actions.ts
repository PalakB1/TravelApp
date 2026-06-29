"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { parseCommand } from "@/lib/chat";
import { matchCustomer } from "./data-actions";
import { bookingBalance, bookingTotal } from "@/lib/calc";
import { formatINR } from "@/lib/money";

export type ChatResult = { ok: boolean; message: string };

export async function interpretCommand(text: string): Promise<ChatResult> {
  const session = await getSession();
  if (!session) return { ok: false, message: "Please sign in again." };

  const cmd = parseCommand(text);

  try {
    if (cmd.kind === "unknown") {
      return { ok: false, message: cmd.reason };
    }

    // ---- Create a trip ----
    if (cmd.kind === "trip") {
      const trip = await prisma.trip.create({
        data: {
          name: cmd.name,
          destination: cmd.destination ?? "",
          nights: cmd.nights ?? 0,
          days: cmd.days ?? 0,
          capacity: cmd.capacity ?? 0,
        },
      });
      revalidatePath("/", "layout");
      return {
        ok: true,
        message: `Created trip “${trip.name}”${trip.destination ? " to " + trip.destination : ""}. Open it to add variants and inclusions.`,
      };
    }

    // ---- Log a payment ----
    if (cmd.kind === "payment") {
      const booking = await prisma.booking.findFirst({
        where: { customerName: { contains: cmd.customer }, status: { not: "cancelled" } },
        orderBy: { createdAt: "desc" },
        include: { variant: true, payments: true, trip: true },
      });
      if (!booking) {
        return { ok: false, message: `No booking found for “${cmd.customer}”. Add the booking first.` };
      }
      await prisma.payment.create({
        data: { bookingId: booking.id, amount: cmd.amount, mode: cmd.mode },
      });
      const updated = await prisma.booking.findUnique({
        where: { id: booking.id },
        include: { variant: true, payments: true },
      });
      const bal = updated ? bookingBalance(updated) : 0;
      revalidatePath("/", "layout");
      return {
        ok: true,
        message: `Logged ${formatINR(cmd.amount)} (${cmd.mode}) for ${booking.customerName} · ${booking.trip.name}. Balance now ${formatINR(bal)}.`,
      };
    }

    // ---- Add a booking ----
    if (cmd.kind === "booking") {
      let trip = null;
      if (cmd.tripQuery) {
        trip = await prisma.trip.findFirst({
          where: {
            OR: [
              { name: { contains: cmd.tripQuery } },
              { destination: { contains: cmd.tripQuery } },
            ],
          },
          include: { variants: true },
        });
      } else {
        const all = await prisma.trip.findMany({ include: { variants: true }, take: 2 });
        if (all.length === 1) trip = all[0];
      }
      if (!trip) {
        return {
          ok: false,
          message: cmd.tripQuery
            ? `Couldn’t find a trip matching “${cmd.tripQuery}”. Create it first.`
            : `Which trip? Try “add ${cmd.customer} to Bali deluxe, ${cmd.pax} pax”.`,
        };
      }
      let variant = null;
      if (cmd.variantQuery) {
        variant =
          trip.variants.find((v) => v.name.toLowerCase().includes(cmd.variantQuery!.toLowerCase())) ?? null;
      }
      if (!variant && trip.variants.length === 1) variant = trip.variants[0];

      const existingCust = await matchCustomer(cmd.customer);
      const customer = existingCust ?? (await prisma.customer.create({ data: { name: cmd.customer.trim(), phone: cmd.phone ?? undefined } }));

      const booking = await prisma.booking.create({
        data: {
          tripId: trip.id,
          variantId: variant?.id ?? null,
          customerId: customer.id,
          customerName: customer.name,
          customerPhone: cmd.phone ?? customer.phone,
          pax: cmd.pax,
          discount: cmd.discount,
          discountReason: cmd.discountReason ?? null,
          status: "confirmed",
        },
        include: { variant: true, payments: true },
      });
      const total = bookingTotal(booking);
      revalidatePath("/", "layout");
      const variantNote = variant ? ` (${variant.name})` : trip.variants.length ? " — pick a variant on the booking" : "";
      return {
        ok: true,
        message: `Added ${booking.customerName}${variantNote} to ${trip.name}, ${cmd.pax} pax. ${
          total > 0 ? "Total " + formatINR(total) + " due." : "Set a price/variant to compute the total."
        }`,
      };
    }

    return { ok: false, message: "Didn’t catch that." };
  } catch (e) {
    console.error("chat error", e);
    return { ok: false, message: "Something went wrong saving that. Try the form instead." };
  }
}
