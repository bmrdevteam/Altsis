import React, { useRef } from "react";
import style from "../editor.module.scss";
import useEditorStore from "../store/useEditorStore";
import { ImageBlockData } from "../types";

type Props = { blockId: string; index: number };

const ImageBlock = (props: Props) => {
  const block = useEditorStore((s) => s.blocks[props.index]);
  const mode = useEditorStore((s) => s.mode);
  const updateBlockData = useEditorStore((s) => s.updateBlockData);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  if (!data?.src) {
    return (
      <div
        className={style.block}
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "120px",
          border: "2px dashed var(--accent-5)",
          borderRadius: "8px",
          cursor: mode === "edit" ? "pointer" : "default",
        }}
        onClick={() => mode === "edit" && fileInputRef.current?.click()}
      >
        {mode === "edit" && (
          <>
            <span style={{ color: "var(--accent-3)", fontSize: "14px" }}>
              클릭하여 이미지 업로드
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleFileChange}
            />
          </>
        )}
      </div>
    );
  }

  return (
    <div
      className={style.block}
      style={{
        textAlign: data.alignment || "center",
      }}
    >
      <img
        src={data.src}
        alt={data.alt || ""}
        style={{
          maxWidth: `${data.width || 100}%`,
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
