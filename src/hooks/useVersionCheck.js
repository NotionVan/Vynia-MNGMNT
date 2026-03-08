import { useState, useEffect } from "react";

export default function useVersionCheck() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    const check = () => {
      fetch("/version.json?t=" + Date.now()).then(r => r.json()).then(d => {
        if (d.version && d.version !== __APP_VERSION__) setUpdateAvailable(true);
      }).catch(() => { });
    };
    const onVisible = () => { if (!document.hidden) check(); };
    document.addEventListener("visibilitychange", onVisible);
    const interval = setInterval(check, 120000);
    return () => { document.removeEventListener("visibilitychange", onVisible); clearInterval(interval); };
  }, []);

  return { updateAvailable, setUpdateAvailable };
}
