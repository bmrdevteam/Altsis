import React from "react";
import ToggleSwitch from "../../../../components/toggleSwitch/ToggleSwitch";
import style from "../../../editor.module.scss";
import useEditorStore from "../../../store/useEditorStore";
import { InputBlockData } from "../../../types";
import Menu from "../Menu";

const InputPanel = () => {
  const selectedBlock = useEditorStore((s) => {
    if (!s.selectedBlockId) return null;
    return s.blocks.find((b) => b.id === s.selectedBlockId) ?? null;
  });
  const updateBlockData = useEditorStore((s) => s.updateBlockData);

  if (!selectedBlock || selectedBlock.type !== "input") return null;

  const data = selectedBlock.data as InputBlockData;
  const blockId = selectedBlock.id;

  return (
    <Menu name="입력">
      <div className={style.item}>
        <label>이름</label>
        <input
          type="text"
          value={data?.name ?? ""}
          onChange={(e) => {
            updateBlockData(blockId, {
              name: e.target.value,
            } as Partial<InputBlockData>);
          }}
        />
      </div>
      <div className={style.item}>
        <label>라벨</label>
        <input
          type="text"
          value={data?.label ?? ""}
          onChange={(e) => {
            updateBlockData(blockId, {
              label: e.target.value,
            } as Partial<InputBlockData>);
          }}
        />
      </div>
      <div className={style.item}>
        <label>응답 예시</label>
        <input
          type="text"
          value={data?.placeholder ?? ""}
          onChange={(e) => {
            updateBlockData(blockId, {
              placeholder: e.target.value,
            } as Partial<InputBlockData>);
          }}
        />
      </div>
      <div className={style.item}>
        <label>텍스트 크기</label>
        <input
          type="number"
          placeholder=""
          value={parseInt(data?.fontSize as string) || ""}
          onChange={(e) => {
            updateBlockData(blockId, {
              fontSize: `${e.target.value}px`,
            } as Partial<InputBlockData>);
          }}
        />
      </div>
      <div className={style.item}>
        <label>필수</label>
        <ToggleSwitch
          defaultChecked={data?.required}
          onChange={(b: boolean) => {
            updateBlockData(blockId, {
              required: b,
            } as Partial<InputBlockData>);
          }}
        />
      </div>
    </Menu>
  );
};

export default InputPanel;
