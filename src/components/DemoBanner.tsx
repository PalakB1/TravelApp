import Link from "next/link";

// Shown on every page of the demo workspace. Two jobs: stop anyone thinking
// this is their own data, and keep a route to signup one tap away — a prospect
// who is enjoying the demo is the likeliest person to convert all week.
export default function DemoBanner() {
  return (
    <div className="demo-banner">
      <span className="demo-dot" aria-hidden />
      <span>
        <b>Demo workspace.</b>{" "}
        <span className="demo-hide-sm">
          Everything here is invented — three trips at different stages. Change whatever you like; it resets.
        </span>
      </span>
      <Link className="btn primary sm" href="/signup">
        Start free
      </Link>
    </div>
  );
}
