/* Altsis Web Push Service Worker */

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

async function setBadgeFromPayload(badgeCount) {
  if (typeof badgeCount !== "number" || Number.isNaN(badgeCount)) return;
  try {
    if (badgeCount > 0 && self.registration.setAppBadge) {
      await self.registration.setAppBadge(badgeCount);
    } else if (badgeCount <= 0 && self.registration.clearAppBadge) {
      await self.registration.clearAppBadge();
    }
  } catch {
    // Badging API 미지원 환경은 무시
  }
}

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {
      title: "Altsis",
      body: event.data ? event.data.text() : "",
    };
  }

  const title = data.title || "Altsis";
  const body =
    (data.body && String(data.body).trim()) ||
    "알림을 확인하려면 탭하세요.";
  const options = {
    body,
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    tag: data.tag || "altsis-notification",
    renotify: true,
    data: {
      url: data.url || "/",
    },
  };

  event.waitUntil(
    (async () => {
      await setBadgeFromPayload(data.badgeCount);
      await self.registration.showNotification(title, options);
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const rawUrl = event.notification.data?.url || "/";
  let absoluteUrl;
  try {
    absoluteUrl = new URL(rawUrl, self.location.origin).href;
  } catch {
    absoluteUrl = self.location.origin + "/";
  }

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const client of allClients) {
        if (client.url.startsWith(self.location.origin) && "focus" in client) {
          await client.focus();
          client.postMessage({
            type: "NOTIFICATION_CLICK",
            url: absoluteUrl,
          });
          return;
        }
      }

      if (self.clients.openWindow) {
        await self.clients.openWindow(absoluteUrl);
      }
    })()
  );
});
