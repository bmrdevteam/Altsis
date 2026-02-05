import React from "react";
import Svg from "../../../../assets/svg/Svg";
import style from "../../../editor.module.scss";
import useEditorStore from "../../../store/useEditorStore";
import { ParagraphBlockData, TextAlign } from "../../../types";
import Menu from "../Menu";
import SubSection from "../SubSection";

const NumberSelect = ({
  value,
  onChange,
  options,
  min,
  max,
  step,
}: {
  value: number;
  onChange: (v: number) => void;
  options: number[];
  min?: number;
  max?: number;
  step?: number;
}) => (
  <div className={style.number_select}>
    <input
      type="number"
      min={min}
      max={max}
      step={step}
      value={value}
      onFocus={(e) => e.target.select()}
      onChange={(e) => {
        const v = parseFloat(e.target.value);
        if (!isNaN(v)) onChange(v);
      }}
    />
    <select
      value={options.includes(value) ? value : ""}
      onChange={(e) => {
        const v = parseFloat(e.target.value);
        if (!isNaN(v)) onChange(v);
      }}
    >
      {!options.includes(value) && (
        <option value="" disabled hidden />
      )}
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  </div>
);

const ParagraphPanel = () => {
  const selectedBlock = useEditorStore((s) => {
    if (!s.selectedBlockId) return null;
    return s.blocks.find((b) => b.id === s.selectedBlockId) ?? null;
  });
  const updateBlockData = useEditorStore((s) => s.updateBlockData);

  if (!selectedBlock || selectedBlock.type !== "paragraph") return null;

  const data = selectedBlock.data as ParagraphBlockData;
  const blockId = selectedBlock.id;

  return (
    <Menu name="텍스트">
      <SubSection label="글자">
        <div className={style.grid_item}>
          <label>정렬</label>
          <div className={style.align}>
            <div className={style.align_options}>
              {(["left", "center", "right"] as TextAlign[]).map((a) => (
                <div
                  key={a}
                  className={style.option}
                  onClick={() => {
                    updateBlockData(blockId, {
                      textAlign: a,
                    } as Partial<ParagraphBlockData>);
                  }}
                >
                  <Svg
                    type={
                      a === "left"
                        ? "alignLeft"
                        : a === "center"
                          ? "alignCenter"
                          : "alignRight"
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className={style.grid_item}>
          <label>굵기</label>
          <NumberSelect
            value={data?.fontWeight ?? 400}
            onChange={(v) => {
              updateBlockData(blockId, {
                fontWeight: v,
              } as Partial<ParagraphBlockData>);
            }}
            options={[100, 200, 300, 400, 500, 600, 700, 800, 900]}
            min={100}
            max={900}
            step={100}
          />
        </div>
        <div className={style.grid_item}>
          <label>크기</label>
          <NumberSelect
            value={parseInt(data?.fontSize as string) || 14}
            onChange={(v) => {
              updateBlockData(blockId, {
                fontSize: `${v}px`,
              } as Partial<ParagraphBlockData>);
            }}
            options={[8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64, 72]}
            min={0}
            max={100}
            step={1}
          />
        </div>
      </SubSection>
    </Menu>
  );
};

export default ParagraphPanel;
