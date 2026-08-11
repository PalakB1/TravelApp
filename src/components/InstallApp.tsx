"use client";

import { useEffect, useState } from "react";

// A one-time nudge to put TripZei on the phone's home screen.
//
// Two very different browsers to handle:
//   Android/Chrome — fires `beforeinstallprompt`, which we hold onto and
//     replay when the user taps Install. One tap, done.
//   iOS/Safari — has no such event and never prompts on its own. The only
//     route is Share → Add to Home Screen, so we spell that out.
//
// It shows once. Dismiss it (or install) and it stays gone.

const DISMISSED = "tz-install-dismissed";

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

// iOS's share glyph, drawn rather than typed — the SF Symbols character for it
// renders as an empty box in Safari web content.
function ShareIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden
      style={{ verticalAlign: "-1px", margin: "0 1px" }}>
      <path d="M12 16V3" /><path d="m8 7 4-4 4 4" />
      <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" />
    </svg>
  );
}

export default function InstallApp() {
  const [deferred, setDeferred] = useState<InstallEvent | null>(null);
  const [showIos, setShowIos] = useState(false);
  const [gone, setGone] = useState(true);

  useEffect(() => {
    if (localStorage.getItem(DISMISSED)) return;

    // Already running from the home screen — nothing to suggest.
    const installed =
      window.matchMedia("(display-mode: standalone)").matches ||
      // Safari's own flag, which predates the standard media query.
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (installed) return;

    const onPrompt = (e: Event) => {
      e.preventDefault(); // stop Chrome's own mini-infobar; we ask in our words
      setDeferred(e as InstallEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    // iOS gets the manual instructions, but only on an actual iPhone/iPad —
    // desktop Safari has no home screen.
    const ua = navigator.userAgent;
    const isIosSafari = /iPhone|iPad|iPod/.test(ua) && /Safari/.test(ua) && !/CriOS|FxiOS/.test(ua);

    // Both flags flipped a tick later rather than in the effect body: setting
    // state synchronously there forces a second render before the first paints,
    // and this card has no reason to appear that urgently.
    const reveal = setTimeout(() => {
      setGone(false);
      if (isIosSafari) setShowIos(true);
    }, 0);

    return () => {
      clearTimeout(reveal);
      window.removeEventListener("beforeinstallprompt", onPrompt);
    };
  }, []);

  const close = () => {
    localStorage.setItem(DISMISSED, "1");
    setGone(true);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice; // either way, don't ask again
    close();
  };

  // Nothing to offer unless Chrome handed us a prompt or we're on iOS Safari.
  if (gone || (!deferred && !showIos)) return null;

  return (
    <div className="install-app card">
      <div className="flex" style={{ gap: 11, alignItems: "flex-start" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon-192.png" alt="" width={38} height={38} style={{ borderRadius: 9, flexShrink: 0, border: "1px solid var(--border)" }} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>Keep TripZei on your home screen</div>
          {deferred ? (
            <p className="small muted" style={{ margin: "3px 0 10px" }}>
              Opens full screen, like an app. No download.
            </p>
          ) : (
            <p className="small muted" style={{ margin: "3px 0 10px" }}>
              Tap <b>Share</b> <ShareIcon /> at the bottom, then <b>Add to Home Screen</b>.
            </p>
          )}
          <div className="flex" style={{ gap: 8, flexWrap: "wrap" }}>
            {deferred && (
              <button type="button" className="primary sm" onClick={install}>
                Install
              </button>
            )}
            <button type="button" className="sm" onClick={close}>
              {deferred ? "Not now" : "Got it"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
