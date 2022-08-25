import { useEffect } from "react";

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

    window.addEventListener("beforeunload", unloadCallback);
    return () => {
      window.removeEventListener("beforeunload", unloadCallback);
    };
  }, []);

  return <div>{children}</div>;
};

export default ReloadWarning;
