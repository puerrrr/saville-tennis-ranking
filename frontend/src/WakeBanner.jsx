import { useEffect, useState } from "react";
import { api } from "./api";

export default function WakeBanner() {
  const [waking, setWaking] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled && !ready) setWaking(true);
    }, 2500);

    api
      .health()
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch(() => {
        if (!cancelled) setWaking(true);
      })
      .finally(() => {
        clearTimeout(timer);
      });

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [ready]);

  if (!waking || ready) return null;

  return (
    <div className="wake-banner">
      Waking up the server — free hosting can take up to a minute after idle time. Thanks for
      waiting!
    </div>
  );
}
