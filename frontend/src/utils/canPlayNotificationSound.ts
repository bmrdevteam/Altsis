/**
 * Android Chrome은 백그라운드/PWA에서 HTML5 Audio 재생 시
 * manifest 이름(Altsis Next)으로 본문 없는 미디어 알림을 띄운다.
 * 설치 앱·비가시·비포커스에서는 재생하지 않는다.
 */

export type NotificationSoundEnv = {
  soundEnabled: boolean;
  visibilityState?: DocumentVisibilityState;
  hasFocus?: boolean;
  isStandalone?: boolean;
};

export function isStandaloneDisplayMode(
  matchMedia: ((query: string) => MediaQueryList) | undefined = typeof window !== "undefined"
    ? window.matchMedia.bind(window)
    : undefined,
  navigatorLike: { standalone?: boolean } | undefined = typeof navigator !== "undefined"
    ? (navigator as Navigator & { standalone?: boolean })
    : undefined
): boolean {
  if (matchMedia?.("(display-mode: standalone)")?.matches) return true;
  if (matchMedia?.("(display-mode: fullscreen)")?.matches) return true;
  if (matchMedia?.("(display-mode: minimal-ui)")?.matches) return true;
  return Boolean(navigatorLike?.standalone);
}

export function canPlayNotificationSound(env: NotificationSoundEnv): boolean {
  if (!env.soundEnabled) return false;
  if (env.isStandalone) return false;
  if (env.visibilityState !== "visible") return false;
  if (env.hasFocus === false) return false;
  return true;
}

export function getNotificationSoundEnv(
  soundEnabled: boolean
): NotificationSoundEnv {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return { soundEnabled: false };
  }
  return {
    soundEnabled,
    visibilityState: document.visibilityState,
    hasFocus: document.hasFocus(),
    isStandalone: isStandaloneDisplayMode(),
  };
}

/**
 * 조건을 만족할 때만 재생하고, 끝나면 pause/rewind 해 미디어 알림이 남지 않게 한다.
 */
export function playNotificationSound(
  audio: HTMLAudioElement,
  soundEnabled: boolean
): void {
  if (!canPlayNotificationSound(getNotificationSoundEnv(soundEnabled))) {
    return;
  }

  const cleanup = () => {
    try {
      audio.pause();
      audio.currentTime = 0;
    } catch {
      // ignore
    }
  };

  const playResult = audio.play();
  if (playResult && typeof playResult.then === "function") {
    playResult
      .then(() => {
        audio.addEventListener("ended", cleanup, { once: true });
        window.setTimeout(cleanup, 5000);
      })
      .catch(() => {
        // 자동 재생 정책 등으로 차단될 수 있음
      });
  }
}
