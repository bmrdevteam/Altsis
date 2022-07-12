import { useEffect, useState } from "react";

export default function useGoogleLogin() {
  const [loadingScript, setLoadingScript] = useState<boolean>();
  useEffect(() => {
    let script: HTMLScriptElement = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
    setLoadingScript(false)
  }, []);
  return loadingScript;
}
