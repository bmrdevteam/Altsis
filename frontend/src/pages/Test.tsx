import React from "react";
import Editor from "../components/editorV2/Editor";

type Props = {};

const Test = (props: Props) => {
  return (
    <div style={{height:"100vh",overflowY:"scroll"}}>
      <Editor />;
    </div>
  );
};

export default Test;
