/**
 * @file ReloadWarning component
 *
 * @author seedlessapple <luminousseedlessapple@gmail.com>
 *
 * -------------------------------------------------------
 *
 * IN PRODUCTION
 * - ReloadWarning component
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

import { useEffect } from "react";

/**
 * compoent that throws a warning when the user tries to reload the page
 *
 * @param children
 *
 * @returns ReloadWarning component
 *
 * @example
 * <ReloadWarning>
 *  <div></div>
 * </ReloadWarning>
 * @example <ReloadWarning/>
 *
 * @version 1.0 initial version
 */

const ReloadWarning = ({
  children,
}: {
  children?: JSX.Element | JSX.Element[];
}) => {
  useEffect(() => {
    const unloadCallback = (event: any) => {
      event.preventDefault();
      event.returnValue = "";
      return "";
    };

    /**
     *
     * adding the event listener "beforeuload"
     *
     * {@link https://developer.mozilla.org/ko/docs/Web/API/Window/beforeunload_event}
     */

    window.addEventListener("beforeunload", unloadCallback);
    return () => {
      /**
       * removing eventlistener on clean up
       */
      window.removeEventListener("beforeunload", unloadCallback);
    };
  }, []);

  return <div>{children}</div>;
};

export default ReloadWarning;
