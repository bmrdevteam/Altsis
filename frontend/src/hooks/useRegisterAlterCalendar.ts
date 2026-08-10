import { useEffect, useRef } from "react";
import { useAlter } from "contexts/alterContext";
import { buildCalendarEventsChatSnapshot } from "utils/alterChatSnapshot";

type Params = {
  enabled?: boolean;
  label?: string;
  getEvents: () => any[];
  getRangeLabel?: () => string;
  /** 현재 뷰에 보이는 기간 (fetch 버퍼와 분리) */
  getVisibleRange?: () => { start?: string; end?: string };
};

/**
 * 캘린더 화면에서 Navbar Alter chat에 로드된 일정을 등록한다.
 */
const useRegisterAlterCalendar = (params: Params) => {
  const { registerPageContext } = useAlter();
  const getEventsRef = useRef(params.getEvents);
  const getRangeLabelRef = useRef(params.getRangeLabel);
  const getVisibleRangeRef = useRef(params.getVisibleRange);
  getEventsRef.current = params.getEvents;
  getRangeLabelRef.current = params.getRangeLabel;
  getVisibleRangeRef.current = params.getVisibleRange;

  useEffect(() => {
    if (params.enabled === false) return;

    return registerPageContext({
      pageType: "calendar",
      label: params.label || "캘린더",
      getChatSnapshot: (opts) => {
        const visible = getVisibleRangeRef.current?.() || {};
        const rangeLabel =
          visible.start && visible.end
            ? `${String(visible.start).slice(0, 10)} ~ ${String(visible.end).slice(0, 10)}`
            : getRangeLabelRef.current?.() || "";
        return buildCalendarEventsChatSnapshot(getEventsRef.current() || [], {
          label: params.label || "캘린더",
          rangeLabel,
          visibleStart: visible.start,
          visibleEnd: visible.end,
          dataExpand: opts?.dataExpand,
        });
      },
      suggestedSkills: ["chat"],
    });
  }, [params.enabled, params.label, registerPageContext]);
};

export default useRegisterAlterCalendar;
