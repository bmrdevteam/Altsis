import React from "react";
import { useParams } from "react-router-dom";

type Props = {};

function Pid(props: Props) {
  const { pid } = useParams();
  console.log(pid);

  return <div>Pid</div>;
}

export default Pid;
