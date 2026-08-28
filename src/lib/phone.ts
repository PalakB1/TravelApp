// Turning a stored phone number into something wa.me will dial.
//
// The rule that caused trouble: "ten digits means India, so prepend 91".
// A Singapore number written +65 8150 9493 is ten digits once the punctuation
// is stripped, so it became +91 6581509493 and the reminder went nowhere. The
// customer had already said which country they were in — the leading + — and
// the code ignored it.
//
// So: if the number is written in international form, trust it completely and
// never guess. Only fall back to a default country code for a bare local
// number, and take that default from the agency's own country rather than
// assuming India.

/** A number already written internationally: +971… or the 00971… form. */
function isInternational(raw: string): boolean {
  return raw.trim().startsWith("+") || raw.trim().startsWith("00");
}

/**
 * Digits only, with a country code, ready for a wa.me link.
 * Returns null when there's nothing usable.
 */
export function toWaNumber(phone: string | null | undefined, defaultCc = "91"): string | null {
  if (!phone) return null;
  const raw = phone.trim();
  let d = raw.replace(/\D/g, "");
  if (!d) return null;

  if (isInternational(raw)) {
    // "00" is the international access prefix — wa.me wants it gone.
    if (raw.startsWith("00")) d = d.replace(/^00/, "");
    return d || null;
  }

  // A leading zero is a domestic trunk prefix, never part of the number abroad.
  d = d.replace(/^0+/, "");
  if (!d) return null;

  // Already carries the agency's country code? Leave it be.
  if (d.startsWith(defaultCc) && d.length > 10) return d;

  return defaultCc + d;
}
