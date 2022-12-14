import { useEffect, useRef } from "react";

const useInterval = (callback: any, delay: number) => {
  const savedCallback = useRef(callback);

  useEffect(() => {
    const executeCallback = () => {
      savedCallback.current();
    };

    const timerId = setInterval(executeCallback, delay);

    return () => clearInterval(timerId);
  }, []);
};

export default useInterval;
