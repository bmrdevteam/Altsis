/** body에 붙어 인쇄 시 이 영역만 보이도록 격리 */
const PRINT_BODY_CLASS = "altsis-printing";

/** 인쇄에서 항상 제외 (전역 클래스 — CSS modules 해시와 무관) */
export const NO_PRINT_CLASS = "altsis-no-print";

/**
 * 지정한 루트만 인쇄한다. 나머지는 body.altsis-printing 규칙으로 숨긴다.
 */
export function printArea(root: HTMLElement | null | undefined): void {
  if (!root) {
    window.alert("인쇄할 내용이 없습니다.");
    return;
  }

  let cleaned = false;

  root.setAttribute("data-print-root", "true");
  document.body.classList.add(PRINT_BODY_CLASS);

  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    document.body.classList.remove(PRINT_BODY_CLASS);
    root.removeAttribute("data-print-root");
    window.removeEventListener("afterprint", cleanup);
  };

  window.addEventListener("afterprint", cleanup);

  // 레이아웃 반영 후 인쇄. afterprint 미지원 브라우저 대비 타임아웃 정리
  requestAnimationFrame(() => {
    try {
      window.print();
    } finally {
      window.setTimeout(cleanup, 2000);
    }
  });
}
