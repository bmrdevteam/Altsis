import { useState, useEffect } from "react";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import { TChatFile } from "types/chat";
import Popup from "components/popup/Popup";
import Svg from "assets/svg/Svg";
import style from "./chat.module.scss";

type Props = {
  onClose: () => void;
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const ChatFileStorage = ({ onClose }: Props) => {
  const { ChatAPI } = useAPIv2();
  const [files, setFiles] = useState<TChatFile[]>([]);
  const [fileType, setFileType] = useState<"all" | "image" | "file">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const loadFiles = async () => {
    setIsLoading(true);
    try {
      const query: { fileType?: string; limit?: number } = { limit: 50 };
      if (fileType !== "all") {
        query.fileType = fileType;
      }
      const { files } = await ChatAPI.RChatFiles({ query });
      setFiles(files);
    } catch (err) {
      ALERT_ERROR(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
  }, [fileType]);

  const handleDownload = async (file: TChatFile) => {
    try {
      const { preSignedUrl } = await ChatAPI.RChatFileSignedUrl({
        params: { fileId: file._id },
      });
      window.open(preSignedUrl, "_blank");
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  const handleDelete = async (fileId: string) => {
    if (!window.confirm("이 파일을 삭제하시겠습니까?")) return;

    try {
      await ChatAPI.DChatFile({ params: { fileId } });
      setFiles((prev) => prev.filter((f) => f._id !== fileId));
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  return (
    <>
    <Popup
      setState={onClose}
      closeBtn
      title="내 파일"
      style={{ maxWidth: "600px", width: "100%", height: "500px" }}
    >
      <div className={style.storage_container}>
        <div className={style.storage_tabs}>
          <button
            className={`${style.storage_tab} ${fileType === "all" ? style.active : ""}`}
            onClick={() => setFileType("all")}
          >
            전체
          </button>
          <button
            className={`${style.storage_tab} ${fileType === "image" ? style.active : ""}`}
            onClick={() => setFileType("image")}
          >
            이미지
          </button>
          <button
            className={`${style.storage_tab} ${fileType === "file" ? style.active : ""}`}
            onClick={() => setFileType("file")}
          >
            파일
          </button>
        </div>

        <div className={style.storage_content}>
          {isLoading ? (
            <div className={style.storage_loading}>파일을 불러오는 중...</div>
          ) : files.length === 0 ? (
            <div className={style.storage_empty}>
              {fileType === "all"
                ? "공유한 파일이 없습니다"
                : fileType === "image"
                ? "공유한 이미지가 없습니다"
                : "공유한 파일이 없습니다"}
            </div>
          ) : (
            <div className={style.storage_grid}>
              {files.map((file) => (
                <div key={file._id} className={style.storage_item}>
                  {file.fileType === "image" ? (
                    <div
                      className={style.storage_image}
                      onClick={() => setPreviewImage(file.url)}
                    >
                      <img src={file.url} alt={file.fileName} />
                    </div>
                  ) : (
                    <div className={style.storage_file_icon}>
                      <Svg type="file" width="32px" height="32px" />
                    </div>
                  )}
                  <div className={style.storage_item_info}>
                    <span className={style.storage_item_name} title={file.fileName}>
                      {file.fileName}
                    </span>
                    <span className={style.storage_item_meta}>
                      {formatFileSize(file.fileSize)} &middot; {formatDate(file.createdAt)}
                    </span>
                  </div>
                  <div className={style.storage_item_actions}>
                    <button
                      className={style.storage_action_btn}
                      onClick={() => handleDownload(file)}
                      title="다운로드"
                    >
                      <Svg type="download" width="16px" height="16px" />
                    </button>
                    <button
                      className={`${style.storage_action_btn} ${style.danger}`}
                      onClick={() => handleDelete(file._id)}
                      title="삭제"
                    >
                      <Svg type="trash" width="16px" height="16px" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Popup>

    {/* Image Preview */}
    {previewImage && (
      <div
        className={style.lightbox_overlay}
        onClick={() => setPreviewImage(null)}
      >
        <button
          className={style.lightbox_close}
          onClick={() => setPreviewImage(null)}
        >
          <Svg type="x" width="24px" height="24px" />
        </button>
        <img
          src={previewImage}
          alt="Preview"
          className={style.lightbox_image}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    )}
    </>
  );
};

export default ChatFileStorage;
