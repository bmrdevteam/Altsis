import React from "react";
import Input from "../../components/input/Input";
import style from "../editor.module.scss";
import { useEditor } from "../functions/editorContext";

type Props = { index: number };

const InputBlock = (props: Props) => {
  const { getBlock } = useEditor();

  const block = getBlock(props.index);

  return (
    <div className={style.block}>
      <Input
        style={{
          fontSize: block.data?.fontSize,
          // textAlign: block.data?.textAlign,
          fontWeight: block.data?.fontWeight,
        }}
        label={block.data.label}
        required={block.data.required}
        placeholder={block.data.placeholder}
      />
    </div>
  );
};

export default InputBlock;
