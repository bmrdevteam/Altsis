import { useEffect, useRef } from "react";
import { useAlter } from "contexts/alterContext";
import { buildCalendarEventsChatSnapshot } from "utils/alterChatSnapshot";

type Params = {
  enabled?: boolean;
  label?: string;
  getEvents: () => any[];
  getRangeLabel?: () => string;
};

/**
 * 캘린더 화면에서 Navbar Alter chat에 로드된 일정을 등록한다.
 */
const useRegisterAlterCalendar = (params: Params) => {
  const { registerPageContext } = useAlter();
  const getEventsRef = useRef(params.getEvents);
  const getRangeLabelRef = useRef(params.getRangeLabel);
  getEventsRef.current = params.getEvents;
  getRangeLabelRef.current = params.getRangeLabel;

  useEffect(() => {
    if (params.enabled === false) return;

    return registerPageContext({
      pageType: "calendar",
      label: params.label || "캘린더",
      getChatSnapshot: () =>
        buildCalendarEventsChatSnapshot(getEventsRef.current() || [], {
          label: params.label || "캘린더",
          rangeLabel: getRangeLabelRef.current?.() || "",
        }),
      suggestedSkills: ["chat"],
    });
  }, [params.enabled, params.label, registerPageContext]);
};

export default useRegisterAlterCalendar;
