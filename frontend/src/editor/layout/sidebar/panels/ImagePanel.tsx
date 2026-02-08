import React, { useRef, useState } from "react";
import Svg from "../../../../assets/svg/Svg";
import style from "../../../editor.module.scss";
import useEditorStore from "../../../store/useEditorStore";
import { ImageBlockData, TextAlign } from "../../../types";
import SubSection from "../SubSection";

const WIDTH_OPTIONS = [10, 20, 25, 30, 40, 50, 60, 70, 75, 80, 90, 100];

const ImagePanel = () => {
  const selectedBlock = useEditorStore((s) => {
    if (!s.selectedBlockId) return null;
    return s.blocks.find((b) => b.id === s.selectedBlockId) ?? null;
  });
  const updateBlockData = useEditorStore((s) => s.updateBlockData);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [inputMode, setInputMode] = useState<"file" | "url">("file");

  if (!selectedBlock || selectedBlock.type !== "image") return null;

  const data = selectedBlock.data as ImageBlockData;
  const blockId = selectedBlock.id;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      updateBlockData(blockId, {
        src: reader.result as string,
      } as Partial<ImageBlockData>);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className={style.menu}>
      <div className={style.content}>
        <SubSection label="이미지">
          <div className={style.tab_bar} style={{ marginBottom: "8px" }}>
            <button
              className={`${style.tab_item} ${inputMode === "file" ? style.active : ""}`}
              onClick={() => setInputMode("file")}
            >
              파일
            </button>
            <button
              className={`${style.tab_item} ${inputMode === "url" ? style.active : ""}`}
              onClick={() => setInputMode("url")}
            >
              URL
            </button>
          </div>
          {inputMode === "file" ? (
            <div className={style.grid_item}>
              <label>파일</label>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "28px",
                  borderRadius: "6px",
                  backgroundColor: "var(--background-color)",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "var(--accent-3)",
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                {data?.src ? "이미지 변경" : "파일 선택"}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: "none" }}
              />
            </div>
          ) : (
            <div className={style.grid_item}>
              <label>URL</label>
              <input
                type="text"
                placeholder="https://..."
                value={data?.src?.startsWith("data:") ? "" : (data?.src ?? "")}
                onChange={(e) => {
                  updateBlockData(blockId, {
                    src: e.target.value,
                  } as Partial<ImageBlockData>);
                }}
              />
            </div>
          )}
          <div className={style.grid_item}>
            <label>너비</label>
            <select
              value={data?.width ?? 100}
              onChange={(e) => {
                updateBlockData(blockId, {
                  width: parseInt(e.target.value),
                } as Partial<ImageBlockData>);
              }}
              style={{
                height: "28px",
                fontSize: "12px",
                fontWeight: 500,
                color: "var(--accent-1)",
                backgroundColor: "var(--background-color)",
                border: "none",
                borderRadius: "6px",
                padding: "0 8px",
                cursor: "pointer",
              }}
            >
              {WIDTH_OPTIONS.map((w) => (
                <option key={w} value={w}>
                  {w}%
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
                        alignment: a,
                      } as Partial<ImageBlockData>);
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
        </SubSection>
        <SubSection label="텍스트">
          <div className={style.grid_item}>
            <label>대체</label>
            <input
              type="text"
              value={data?.alt ?? ""}
              onChange={(e) => {
                updateBlockData(blockId, {
                  alt: e.target.value,
                } as Partial<ImageBlockData>);
              }}
            />
          </div>
          <div className={style.grid_item}>
            <label>캡션</label>
            <input
              type="text"
              value={data?.caption ?? ""}
              onChange={(e) => {
                updateBlockData(blockId, {
                  caption: e.target.value,
                } as Partial<ImageBlockData>);
              }}
            />
          </div>
        </SubSection>
      </div>
    </div>
  );
};

export default ImagePanel;
