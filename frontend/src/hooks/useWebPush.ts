import { useCallback } from "react";
import useAPIv2 from "hooks/useAPIv2";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isWebPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function useWebPush() {
  const { NotificationAPI } = useAPIv2();

  const ensureServiceWorker = useCallback(async () => {
    if (!("serviceWorker" in navigator)) {
      throw new Error("SERVICE_WORKER_UNSUPPORTED");
    }
    const registration = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    return registration;
  }, []);

  const enableWebPush = useCallback(async () => {
    if (!isWebPushSupported()) {
      throw new Error("WEB_PUSH_UNSUPPORTED");
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      throw new Error("PERMISSION_DENIED");
    }

    const { publicKey } = await NotificationAPI.RVapidPublicKey();
    const registration = await ensureServiceWorker();

    // VAPID 키가 바뀌었거나 이전 구독이 깨진 경우를 위해 항상 재구독
    const existing = await registration.pushManager.getSubscription();
    if (existing) {
      await NotificationAPI.DPushSubscription({
        query: { endpoint: existing.endpoint },
      }).catch(() => {
        // best-effort: server row may already be gone
      });
      await existing.unsubscribe().catch(() => {
        // best-effort: local subscription may already be gone
      });
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
    });

    const json = subscription.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
      throw new Error("INVALID_SUBSCRIPTION");
    }

    await NotificationAPI.CPushSubscription({
      data: {
        endpoint: json.endpoint,
        keys: {
          p256dh: json.keys.p256dh,
          auth: json.keys.auth,
        },
        expirationTime: json.expirationTime ?? null,
      },
    });

    await NotificationAPI.UNotificationSettings({
      data: { webPushEnabled: true },
    });

    return true;
  }, [NotificationAPI, ensureServiceWorker]);

  const disableWebPush = useCallback(async () => {
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.ready.catch(() => null);
      const subscription = await registration?.pushManager
        .getSubscription()
        .catch(() => null);
      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe().catch(() => {
          // best-effort
        });
        await NotificationAPI.DPushSubscription({
          query: { endpoint },
        }).catch(() => {
          // best-effort
        });
      } else {
        await NotificationAPI.DPushSubscription({}).catch(() => {
          // best-effort
        });
      }
    }

    await NotificationAPI.UNotificationSettings({
      data: { webPushEnabled: false },
    });

    return true;
  }, [NotificationAPI]);

  const sendTestPush = useCallback(async () => {
    return NotificationAPI.CTestPush();
  }, [NotificationAPI]);

  return {
    isWebPushSupported: isWebPushSupported(),
    enableWebPush,
    disableWebPush,
    ensureServiceWorker,
    sendTestPush,
  };
}
