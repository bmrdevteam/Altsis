/**
 * @file useOutsideClick
 *
 * @author seedlessapple <luminousseedlessapple@gmail.com>
 *
 * -------------------------------------------------------
 *
 * IN PRODUCTION
 *  - useOutsideClick hook
 *
 * -------------------------------------------------------
 *
 * IN MAINTENANCE
 *
 * -------------------------------------------------------
 *
 * IN DEVELOPMENT
 *
 * -------------------------------------------------------
 *
 * DEPRECATED
 *
 * -------------------------------------------------------
 *
 * NOTES
 *
 */

import { useEffect, useRef, useState } from "react";

/**
 *
 * React hook to detect whether the click event has occurred outside the element
 *
 *
 * @params
 *
 * @returns {} {active , setActive ,RefObject ,handleOnClick}
 *
 * @version 1.0 - inital version
 *
 * @example
 * const outsideClick = useOutsideClick();
 * return
 * <div>
 *  {outsideClick.active && (
 *    <div
 *       ref = {outsideClick.RefObject}
 *       onClick={outsideClick.handleOnClick}>
 *       foo
 *    </div>
 *  )}
 * </div>
 *
 *
 */
export default function useOutsideClick() {
  /** @constant - used for managing states of the OutsideClick */
  const [active, setActive] = useState<boolean>(false);

  /** @constant RefObject used for checking if click event contains self */
  const RefObject = useRef<any>(null);

  /**
   * function to set the state to false
   *
   */
  function handleOnClick() {
    setActive(true);
  }

  /**
   * function to check whether the click event occurred outside the RefObject
   */

  function handleMousedown(e: MouseEvent) {
    if (RefObject.current && !RefObject.current.contains(e.target as Node)) {
      setActive(false);
    }
  }

  /**
   * adding eventlistener on componentDidMount, and removing the eventlistener on component­Will­Unmount
   */
  useEffect(() => {
    document.addEventListener("mousedown", handleMousedown);
    return () => {
      document.removeEventListener("mousedown", handleMousedown);
    };
  }, []);

  /**
   * return
   */
  return { active, setActive, RefObject, handleOnClick };
}
