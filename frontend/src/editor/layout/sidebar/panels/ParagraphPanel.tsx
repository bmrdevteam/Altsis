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

const FONT_OPTIONS = [
  // 기본 폰트
  { value: "Pretendard", label: "Pretendard" },
  // 고딕 계열
  { value: "Noto Sans KR", label: "Noto Sans KR" },
  { value: "Gothic A1", label: "Gothic A1" },
  { value: "IBM Plex Sans KR", label: "IBM Plex Sans KR" },
  { value: "Nanum Gothic", label: "나눔고딕" },
  { value: "Nanum Gothic Coding", label: "나눔고딕코딩" },
  { value: "Gowun Dodum", label: "고운돋움" },
  { value: "Black Han Sans", label: "검정한산스" },
  { value: "Do Hyeon", label: "도현" },
  { value: "Jua", label: "주아" },
  { value: "Gugi", label: "궁서" },
  { value: "Sunflower", label: "해바라기" },
  // 명조 계열
  { value: "Noto Serif KR", label: "Noto Serif KR" },
  { value: "Nanum Myeongjo", label: "나눔명조" },
  { value: "Gowun Batang", label: "고운바탕" },
  { value: "Hahmlet", label: "함렛" },
  { value: "Song Myung", label: "송명" },
  // 손글씨 / 캘리그라피
  { value: "Nanum Pen Script", label: "나눔펜" },
  { value: "Nanum Brush Script", label: "나눔브러시" },
  { value: "Gaegu", label: "개구" },
  { value: "Hi Melody", label: "하이멜로디" },
  { value: "Gamja Flower", label: "감자꽃" },
  { value: "Poor Story", label: "푸어스토리" },
  { value: "Yeon Sung", label: "연성" },
  { value: "Stylish", label: "스타일리시" },
  { value: "Single Day", label: "싱글데이" },
  { value: "Cute Font", label: "큐트폰트" },
  // 특수 폰트
  { value: "Dokdo", label: "독도" },
  { value: "East Sea Dokdo", label: "동해독도" },
  { value: "Kirang Haerang", label: "기랑해랑" },
  { value: "Black And White Picture", label: "흑백사진" },
];

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
          <label>폰트</label>
          <select
            value={data?.fontFamily || "Pretendard"}
            onChange={(e) => {
              updateBlockData(blockId, {
                fontFamily: e.target.value,
              } as Partial<ParagraphBlockData>);
            }}
            style={{
              height: "28px",
              fontSize: "12px",
              backgroundColor: "var(--background-color)",
              border: "none",
              borderRadius: "6px",
              padding: "0 8px",
              color: "var(--accent-1)",
            }}
          >
            {FONT_OPTIONS.map((font) => (
              <option key={font.value} value={font.value}>
                {font.label}
              </option>
            ))}
          </select>
        </div>
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
