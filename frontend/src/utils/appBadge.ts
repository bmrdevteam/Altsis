/**
 * PWA 홈 화면 아이콘 뱃지 (Badging API)
 * 알림 미확인 수 + 채팅 미읽음 수를 합산해 표시한다.
 */

let notificationUnread = 0;
let chatUnread = 0;

function applyBadge() {
  if (typeof navigator === "undefined") return;
  const total = Math.max(0, notificationUnread + chatUnread);
  try {
    if (total > 0 && "setAppBadge" in navigator) {
      void (navigator as Navigator & { setAppBadge: (n?: number) => Promise<void> }).setAppBadge(
        total
      );
    } else if ("clearAppBadge" in navigator) {
      void (
        navigator as Navigator & { clearAppBadge: () => Promise<void> }
      ).clearAppBadge();
    }
  } catch {
    // Badging API 미지원·권한 없음은 무시
  }
}

export function updateNotificationAppBadge(count: number) {
  notificationUnread = Math.max(0, Number(count) || 0);
  applyBadge();
}

export function updateChatAppBadge(count: number) {
  chatUnread = Math.max(0, Number(count) || 0);
  applyBadge();
}
