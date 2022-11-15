import React from "react";
import { useParams } from "react-router-dom";

type Props = {};

const ArchiveField = (props: Props) => {
  const { pid } = useParams();
  return <div>{pid}</div>;
};

export default ArchiveField;
