import React, { useRef, useState } from "react";
import style from "../editor.module.scss";
import useEditorStore from "../store/useEditorStore";
import { ImageBlockData } from "../types";
import Svg from "../../assets/svg/Svg";

type Props = { blockId: string; index: number };

const ImageBlock = (props: Props) => {
  const block = useEditorStore((s) => s.blocks[props.index]);
  const mode = useEditorStore((s) => s.mode);
  const updateBlockData = useEditorStore((s) => s.updateBlockData);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [inputMode, setInputMode] = useState<"file" | "url">("file");
  const [urlInput, setUrlInput] = useState("");

  if (!block) return null;

  const data = block.data as ImageBlockData;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      updateBlockData(props.blockId, {
        src: reader.result as string,
      } as Partial<ImageBlockData>);
    };
    reader.readAsDataURL(file);
  };

  const handleUrlSubmit = () => {
    if (urlInput.trim()) {
      updateBlockData(props.blockId, {
        src: urlInput.trim(),
      } as Partial<ImageBlockData>);
    }
  };

  if (!data?.src) {
    return (
      <div
        className={style.block}
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "120px",
          border: "2px dashed var(--accent-5)",
          borderRadius: "8px",
          padding: "16px",
          gap: "12px",
        }}
      >
        {mode === "edit" && (
          <>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => setInputMode("file")}
                style={{
                  padding: "6px 16px",
                  borderRadius: "4px",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: 600,
                  backgroundColor: inputMode === "file" ? "var(--accent-1)" : "var(--component-color)",
                  color: inputMode === "file" ? "var(--background-color)" : "var(--accent-3)",
                }}
              >
                파일
              </button>
              <button
                onClick={() => setInputMode("url")}
                style={{
                  padding: "6px 16px",
                  borderRadius: "4px",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: 600,
                  backgroundColor: inputMode === "url" ? "var(--accent-1)" : "var(--component-color)",
                  color: inputMode === "url" ? "var(--background-color)" : "var(--accent-3)",
                }}
              >
                URL
              </button>
            </div>
            {inputMode === "file" ? (
              <>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    cursor: "pointer",
                    color: "var(--accent-3)",
                    fontSize: "14px",
                  }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Svg type="upload" width="20px" height="20px" />
                  <span>클릭하여 이미지 업로드</span>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleFileChange}
                />
              </>
            ) : (
              <div style={{ display: "flex", gap: "8px", width: "100%", maxWidth: "400px" }}>
                <input
                  type="text"
                  placeholder="https://..."
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    borderRadius: "4px",
                    border: "1px solid var(--accent-5)",
                    fontSize: "14px",
                    outline: "none",
                  }}
                />
                <button
                  onClick={handleUrlSubmit}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "4px",
                    border: "none",
                    backgroundColor: "var(--accent-1)",
                    color: "var(--background-color)",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: 600,
                  }}
                >
                  확인
                </button>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <div className={style.block}>
      <img
        src={data.src}
        alt={data.alt || ""}
        style={{
          display: "block",
          width: "100%",
          height: "auto",
          borderRadius: "4px",
        }}
      />
      {data.caption && (
        <div
          style={{
            fontSize: "12px",
            color: "var(--accent-3)",
            marginTop: "4px",
            textAlign: "center",
          }}
        >
          {data.caption}
        </div>
      )}
    </div>
  );
};

export default React.memo(ImageBlock);
