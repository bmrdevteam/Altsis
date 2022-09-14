/**
 * @file QuickSearch Component
 *
 * @author seedlessapple <luminousseedlessapple@gmail.com>
 *
 * -------------------------------------------------------
 *
 * IN PRODUCTION
 *
 * -------------------------------------------------------
 *
 * IN MAINTENANCE
 *
 * -------------------------------------------------------
 *
 * IN DEVELOPMENT
 * - QuickSearch Component design
 * - QuickSearch Component function
 *
 * -------------------------------------------------------
 *
 * DEPRECATED
 *
 * -------------------------------------------------------
 *
 * NOTES
 * control K and command K
 * on mobiles
 * - auto focus
 *
 */
import React, { useEffect, useState } from "react";

type Props = {};
/**
 * QuickSearch Component
 *
 * @param props
 *
 * @returns QuickSearch Component
 *
 * @example <QuickSearch/>
 *
 * @version 1.0 initial version
 */
const QuickSearch = (props: Props) => {
  /**
   * the active state for the component
   */
  const [quickSearchActive, setQuickSearchActive] = useState<boolean>(false);

  /**
   * 
   * @param e KeyboardEvent
   * 
   * @version 1.0 initial version
   * 
   * 
   */

  function handleKeyDown(e: any) {
    /**
     * on shortcut
     * 
     * ctrlKey : windows & linux
     * metaKey : mac
     */
    if ((e.ctrlKey || e.metaKey) && e.key === "k") {
      /**
       * set the active state
       */
      setQuickSearchActive(prev=>!prev)
    }
  }

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  /**
   * [ ...검색             ]
   * ------------------
   * 페이지
   * - Login/로그인
   * - 수강신청
   * - 시간표
   * - 설정
   * ------------------
   * 시간표
   * - 이름(시간표)
   * ------------------
   * 수업(내가 듣고 있는 수업 먼저 다른거 after)
   * - 수강중
   *  - 뭐뭐뭐
   *  - another
   * - 수업
   *  - 뭐뭐뭐
   * ------------------
   * slash commands
   * when input gets "/" change the look
   * - /help
   * - /logout
   * - /darkmode
   * -
   * - /timetable {name}
   * - /available {name name name} - available time
   * - /수강 & /enroll {code}
   * - /keep {code}
   * - /drop {code}
   * - /drop -a
   * - /reset (settings)
   * ------------------
   * 기타
   */

  return (
    <>
      {quickSearchActive && (
        <div>
          <div>the qasdfasdfa</div>
        </div>
      )}
    </>
  );
};

export default QuickSearch;
