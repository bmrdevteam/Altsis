import { TChatMessage } from "types/chat";
import Svg from "assets/svg/Svg";
import style from "./chat.module.scss";

type Props = {
  message: TChatMessage;
  onImageClick?: (url: string) => void;
  onFileDownload?: (message: TChatMessage) => void;
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
};

const TextContent = ({ content }: { content: string }) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = content.split(urlRegex);

  return (
    <span>
      {parts.map((part, i) => {
        if (part.match(urlRegex)) {
          return (
            <a
              key={i}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className={style.message_link}
            >
              {part}
            </a>
          );
        }
        return part;
      })}
    </span>
  );
};

const ChatMessageContent = ({ message, onImageClick, onFileDownload }: Props) => {
  // Text message - detect and render URLs
  if (message.messageType === "text") {
    return <TextContent content={message.content} />;
  }

  // Image message
  if (message.messageType === "image" && message.attachment) {
    return (
      <div className={style.image_message}>
        <img
          src={message.attachment.url}
          alt={message.attachment.fileName}
          onClick={() => onImageClick?.(message.attachment!.url)}
        />
      </div>
    );
  }

  // File message
  if (message.messageType === "file" && message.attachment) {
    return (
      <div
        className={style.file_message}
        onClick={() => onFileDownload?.(message)}
      >
        <div className={style.file_icon}>
          <Svg type="file" width="24px" height="24px" />
        </div>
        <div className={style.file_info}>
          <span className={style.file_name}>{message.attachment.fileName}</span>
          <span className={style.file_size}>
            {formatFileSize(message.attachment.fileSize)}
          </span>
        </div>
        <div className={style.download_icon}>
          <Svg type="download" width="20px" height="20px" />
        </div>
      </div>
    );
  }

  // System message
  if (message.messageType === "system") {
    return <span className={style.system_message}>{message.content}</span>;
  }

  // Default fallback
  return <span>{message.content}</span>;
};

export default ChatMessageContent;
