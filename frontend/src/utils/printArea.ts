/** body에 붙어 인쇄 시 이 영역만 보이도록 격리 */
const PRINT_BODY_CLASS = "altsis-printing";

/** 인쇄에서 항상 제외 (전역 클래스 — CSS modules 해시와 무관) */
export const NO_PRINT_CLASS = "altsis-no-print";

type PrintAreaOptions = {
  /** 인쇄 종료(또는 정리) 후 호출. 일괄 인쇄 DOM 언마운트 등에 사용 */
  onComplete?: () => void;
};

/**
 * 지정한 루트만 인쇄한다. 나머지는 body.altsis-printing 규칙으로 숨긴다.
 * overflow 조상에 가두면 body height:0 인쇄에서 빈 장이 되므로, 같은 노드를
 * 잠시 body로 옮겼다가 정리 때 되돌린다.
 */
export function printArea(
  root: HTMLElement | null | undefined,
  options?: PrintAreaOptions
): void {
  if (!root) {
    window.alert("인쇄할 내용이 없습니다.");
    options?.onComplete?.();
    return;
  }

  let cleaned = false;
  const homeParent = root.parentNode;
  const homeNext = root.nextSibling;
  const shouldHoist = homeParent != null && homeParent !== document.body;

  root.setAttribute("data-print-root", "true");
  document.body.classList.add(PRINT_BODY_CLASS);
  if (shouldHoist) {
    document.body.appendChild(root);
  }

  const restoreHome = () => {
    if (!shouldHoist || !homeParent?.isConnected) return;
    if (homeNext && homeNext.parentNode === homeParent) {
      homeParent.insertBefore(root, homeNext);
      return;
    }
    homeParent.appendChild(root);
  };

  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    restoreHome();
    document.body.classList.remove(PRINT_BODY_CLASS);
    root.removeAttribute("data-print-root");
    window.removeEventListener("afterprint", cleanup);
    options?.onComplete?.();
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
