import { useEffect, useLayoutEffect, useRef, useState } from "react";

export type PopupCoords = { top: number; left: number };

type Options = {
  onClose: () => void;
  /** 메뉴 측정 전 사용할 기본 너비(px) */
  fallbackWidth?: number;
};

/**
 * 툴바 팝업을 document.body 포탈 + fixed로 띄우고,
 * 앵커(래퍼) 기준으로 뷰포트 안에 맞춘다.
 */
export const useToolbarFixedPopup = ({
  onClose,
  fallbackWidth = 180,
}: Options) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLSpanElement>(null);
  const [coords, setCoords] = useState<PopupCoords | null>(null);

  useLayoutEffect(() => {
    const wrapper = anchorRef.current?.parentElement;
    if (!wrapper) return;

    const update = () => {
      const rect = wrapper.getBoundingClientRect();
      const menuEl = menuRef.current;
      const menuWidth = menuEl?.offsetWidth || fallbackWidth;
      const menuHeight = menuEl?.offsetHeight || 0;
      const pad = 8;

      let left = rect.left;
      if (left + menuWidth > window.innerWidth - pad) {
        left = Math.max(pad, rect.right - menuWidth);
      }
      left = Math.max(pad, left);

      let top = rect.bottom + 4;
      if (
        top + menuHeight > window.innerHeight - pad &&
        rect.top > menuHeight + pad
      ) {
        top = rect.top - menuHeight - 4;
      }

      setCoords({ top, left });
    };

    update();
    const raf = requestAnimationFrame(update);
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [fallbackWidth]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuRef.current?.contains(target)) return;
      // 트리거 버튼은 부모 툴바 토글이 처리
      if (anchorRef.current?.parentElement?.contains(target)) return;
      onClose();
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return { menuRef, anchorRef, coords };
};
