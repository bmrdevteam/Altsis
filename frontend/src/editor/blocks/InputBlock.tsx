import React from "react";
import Input from "../../components/input/Input";
import style from "../editor.module.scss";
import useEditorStore from "../store/useEditorStore";
import { InputBlockData } from "../types";

type Props = { blockId: string; index: number };

const InputBlock = (props: Props) => {
  const block = useEditorStore((s) => s.blocks[props.index]);

  if (!block) return null;

  const data = block.data as InputBlockData;

  return (
    <div className={style.block}>
      <Input
        style={{
          fontSize: data?.fontSize,
          fontWeight: data?.fontWeight,
        }}
        label={data?.label}
        required={data?.required}
        placeholder={data?.placeholder}
      />
    </div>
  );
};

export default React.memo(InputBlock);
