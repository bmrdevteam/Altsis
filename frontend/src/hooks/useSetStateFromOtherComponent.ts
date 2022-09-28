import React from "react";

export default function useSetStateFromOtherComponent() {
  let returnState: any;
  let CSetState: any = () => {};

  function setComponentSetState(setState: any) {
    CSetState = setState;
  }
  function setState(to: any) {
    CSetState(to);
    console.log("newstate set", to);
    return returnState;
  }

  return { returnState, setState, setComponentSetState };
}
