import React, { useRef, useState } from "react";
import Svg from "assets/svg/Svg";
import style from "./courseCoverImageEditor.module.scss";

type Props = {
  coverImage?: string;
  coverColor?: string;
  onImageSelected: (file: File) => void;
  onImageUrlSet: (url: string) => void;
  onImageRemoved: () => void;
  onColorChanged: (color: string) => void;
};

const correctForm = /(jpeg|jpg|webp|png)$/;

const presetColors = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f59e0b",
  "#3b82f6",
  "#10b981",
  "#ef4444",
  "#78716c",
  "#0ea5e9",
];

const CourseCoverImageEditor = ({
  coverImage,
  coverColor,
  onImageSelected,
  onImageUrlSet,
  onImageRemoved,
  onColorChanged,
}: Props) => {
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [tab, setTab] = useState<"file" | "url">("file");
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(coverImage);
  const [urlInput, setUrlInput] = useState<string>(
    coverImage &&
      !coverImage.includes("/original/") &&
      !coverImage.includes("/thumb/")
      ? coverImage
      : ""
  );
  const [selectedColor, setSelectedColor] = useState<string>(coverColor || "");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    if (!file.type.match(correctForm)) {
      alert("지원되지 않는 파일 형식입니다.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("크기가 5MB 이하인 사진만 등록할 수 있습니다.");
      return;
    }

    setPreviewUrl(URL.createObjectURL(file));
    setUrlInput("");
    onImageSelected(file);
  };

  const handleUrlApply = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    setPreviewUrl(trimmed);
    onImageUrlSet(trimmed);
    if (fileInput.current) fileInput.current.value = "";
  };

  const handleRemove = () => {
    setPreviewUrl(undefined);
    setUrlInput("");
    onImageRemoved();
    if (fileInput.current) fileInput.current.value = "";
  };

  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
    onColorChanged(color);
  };

  return (
    <div className={style.editor_container}>
      <div className={style.tabs}>
        <button
          className={`${style.tab} ${tab === "file" ? style.active : ""}`}
          onClick={() => setTab("file")}
          type="button"
        >
          파일 업로드
        </button>
        <button
          className={`${style.tab} ${tab === "url" ? style.active : ""}`}
          onClick={() => setTab("url")}
          type="button"
        >
          URL 입력
        </button>
      </div>

      <div className={style.editor_content}>
        {previewUrl ? (
          <div className={style.preview_container}>
            <img
              src={previewUrl}
              alt="cover preview"
              className={style.preview_image}
            />
            <div className={style.remove_btn} onClick={handleRemove}>
              <Svg type="x" width="16px" height="16px" />
            </div>
          </div>
        ) : tab === "file" ? (
          <div
            className={style.upload_area}
            onClick={() => fileInput.current?.click()}
          >
            <Svg type="image" width="24px" height="24px" />
            <span>이미지 업로드</span>
          </div>
        ) : (
          <div className={style.url_input_area}>
            <input
              type="text"
              className={style.url_input}
              placeholder="https://..."
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleUrlApply();
              }}
            />
            <button
              className={style.url_apply_btn}
              onClick={handleUrlApply}
              type="button"
            >
              적용
            </button>
          </div>
        )}
        <input
          type="file"
          ref={fileInput}
          accept="image/png,image/jpeg,image/jpg,image/webp"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
      </div>

      <div className={style.color_section}>
        <div className={style.color_label}>플레이스홀더 색상</div>
        <div className={style.color_picker}>
          {presetColors.map((color) => (
            <div
              key={color}
              className={`${style.color_swatch} ${
                selectedColor === color ? style.selected : ""
              }`}
              style={{ backgroundColor: color }}
              onClick={() => handleColorSelect(color)}
            />
          ))}
          <label className={style.custom_color_wrapper}>
            <input
              type="color"
              className={style.custom_color_input}
              value={selectedColor || "#6366f1"}
              onChange={(e) => handleColorSelect(e.target.value)}
            />
            <div
              className={`${style.color_swatch} ${style.custom_swatch}`}
              style={{
                backgroundColor:
                  selectedColor && !presetColors.includes(selectedColor)
                    ? selectedColor
                    : undefined,
              }}
            >
              <Svg type="plus" width="14px" height="14px" />
            </div>
          </label>
        </div>
      </div>
    </div>
  );
};

export default CourseCoverImageEditor;
