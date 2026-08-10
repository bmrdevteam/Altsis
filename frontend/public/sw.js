/* Altsis Web Push Service Worker */

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

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

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const client of allClients) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client && targetUrl) {
            try {
              await client.navigate(targetUrl);
              return;
            } catch {
              // navigate may fail on some browsers; open new window below
            }
          }
          return;
        }
      }

      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl);
      }
    })()
  );
});
