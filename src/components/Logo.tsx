import Image from "next/image";

// The TripZei wordmark. Both colourways ship and CSS picks one, so the swap is
// instant on theme change with no flash and no client-side JS.
//
// `plain` renders the navy version only — for the invoice/receipt/pay documents,
// which are pinned to a light "paper" look regardless of the viewer's theme.
export default function Logo({ height = 26, plain = false }: { height?: number; plain?: boolean }) {
  // Wordmark aspect ratio (640×205) — width follows height so it never distorts.
  const width = Math.round((height * 640) / 205);

  if (plain) {
    return (
      <Image src="/logo.png" alt="TripZei" width={width} height={height} priority style={{ height, width: "auto" }} />
    );
  }

  return (
    <span className="logo-swap" style={{ display: "inline-flex", alignItems: "center", lineHeight: 0 }}>
      <Image className="logo-light" src="/logo.png" alt="TripZei" width={width} height={height} priority style={{ height, width: "auto" }} />
      <Image className="logo-dark" src="/logo-dark.png" alt="TripZei" width={width} height={height} priority style={{ height, width: "auto" }} />
    </span>
  );
}
