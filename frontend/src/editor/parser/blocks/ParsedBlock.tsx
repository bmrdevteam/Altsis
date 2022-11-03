import React from "react";
import style from "../../editor.module.scss";
import ParsedDataTableBlock from "./ParsedDataTableBlock";
import ParsedTableBlock from "./ParsedTableBlock";
type Props = {
  blockData: any;
  onChange?: (data: any) => void;
};

const ParsedBlock = (props: Props) => {
  console.log(props.blockData);

  switch (props.blockData.type) {
    case "paragraph":
      return (
        <div className={style.parsed_block}>{props.blockData.data.text}</div>
      );
    case "table":
      return <ParsedTableBlock blockData={props.blockData} />;
    case "dataTable":
      return <ParsedDataTableBlock blockData={props.blockData} />;
    default:
      return (
        <div className={style.parsed_block}>{props.blockData.data.text}</div>
      );
  }
};

export default ParsedBlock;
