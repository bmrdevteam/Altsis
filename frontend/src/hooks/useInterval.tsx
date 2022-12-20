import { useEffect, useRef } from "react";

/* useInterval hook sets up a repeating interval that executes a callback function
 * at a specified delay. It can be used to perform tasks on a regular basis in a React
 * application.
 */

const useInterval = (callback: any, delay: number) => {
  // Create a mutable ref to the callback function
  // to preserve the callback between re-renders
  const savedCallback = useRef(callback);

  useEffect(() => {
    // Function to call the callback function
    const executeCallback = () => {
      savedCallback.current();
    };

    // Set up the interval using setInterval
    const timerId = setInterval(executeCallback, delay);

    // Return a cleanup function to clear the interval when the component is unmounted
    return () => clearInterval(timerId);
  }, []);
};

export default useInterval;
