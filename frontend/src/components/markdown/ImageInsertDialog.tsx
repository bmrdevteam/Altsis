import { useRef, useState } from "react";
import Popup from "components/popup/Popup";
import Svg from "assets/svg/Svg";
import style from "./markdown.module.scss";

type Props = {
  onSubmit: (url: string) => void;
  onClose: () => void;
  onImageUpload?: (file: File) => Promise<string | null>;
};

const ImageInsertDialog = ({ onSubmit, onClose, onImageUpload }: Props) => {
  const [tab, setTab] = useState<"upload" | "url">(
    onImageUpload ? "upload" : "url"
  );
  const [imageUrl, setImageUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("이미지 파일만 선택할 수 있습니다.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError("파일 크기는 20MB 이하여야 합니다.");
      return;
    }
    setError("");
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setPreviewUrl(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (tab === "url") {
      if (!imageUrl.trim()) return;
      onSubmit(imageUrl.trim());
      onClose();
    } else {
      if (!selectedFile || !onImageUpload) return;
      setIsUploading(true);
      try {
        const url = await onImageUpload(selectedFile);
        if (url) {
          onSubmit(url);
          onClose();
        }
      } finally {
        setIsUploading(false);
      }
    }
  };

  const isDisabled =
    isUploading || (tab === "url" ? !imageUrl.trim() : !selectedFile);

  return (
    <Popup
      title="이미지 삽입"
      setState={onClose}
      closeBtn
      style={{ maxWidth: "480px", width: "100%" }}
      footer={
        <div className={style.embedDialogFooter}>
          <button
            type="button"
            className={style.embedDialogBtn}
            onClick={handleSubmit}
            disabled={isDisabled}
            style={isDisabled ? { opacity: 0.5, cursor: "default" } : {}}
          >
            {isUploading ? "업로드 중..." : "삽입"}
          </button>
        </div>
      }
    >
      <div className={style.embedDialog}>
        <div className={style.embedTabs}>
          {onImageUpload && (
            <button
              type="button"
              className={tab === "upload" ? style.active : ""}
              onClick={() => setTab("upload")}
            >
              파일 업로드
            </button>
          )}
          <button
            type="button"
            className={tab === "url" ? style.active : ""}
            onClick={() => setTab("url")}
          >
            URL 입력
          </button>
        </div>

        {tab === "url" ? (
          <div className={style.embedContent}>
            <input
              type="url"
              className={style.embedUrlInput}
              value={imageUrl}
              onChange={(e) => {
                setImageUrl(e.target.value);
                if (error) setError("");
              }}
              placeholder="https://example.com/image.png"
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              autoFocus
            />
            {error ? (
              <p className={style.embedErrorMsg}>{error}</p>
            ) : (
              <p className={style.embedHint}>이미지 URL을 입력하세요.</p>
            )}
          </div>
        ) : (
          <div className={style.embedContent}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
              }}
            />
            {previewUrl ? (
              <div className={style.imagePreview}>
                <img src={previewUrl} alt="미리보기" />
                <div className={style.imagePreviewInfo}>
                  <span>{selectedFile?.name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      setPreviewUrl(null);
                      setError("");
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                  >
                    변경
                  </button>
                </div>
              </div>
            ) : (
              <div
                className={`${style.imageDropZone} ${
                  isDragging ? style.imageDropZoneActive : ""
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const file = e.dataTransfer.files[0];
                  if (file) handleFileSelect(file);
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <Svg type="image" width="32px" height="32px" />
                <span>이미지를 드래그하거나 클릭하여 선택</span>
                <span className={style.embedHint}>
                  PNG, JPG, GIF, WebP (최대 20MB)
                </span>
              </div>
            )}
            {error && <p className={style.embedErrorMsg}>{error}</p>}
          </div>
        )}
      </div>
    </Popup>
  );
};

export default ImageInsertDialog;
