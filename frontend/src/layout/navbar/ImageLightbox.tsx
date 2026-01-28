import { useEffect } from "react";
import Svg from "assets/svg/Svg";
import style from "./chat.module.scss";

type Props = {
  imageUrl: string;
  onClose: () => void;
};

const ImageLightbox = ({ imageUrl, onClose }: Props) => {
  // ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className={style.lightbox_overlay} onClick={onClose}>
      <button className={style.lightbox_close} onClick={onClose}>
        <Svg type="x" width="24px" height="24px" />
      </button>
      <img
        src={imageUrl}
        alt="Preview"
        className={style.lightbox_image}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
};

export default ImageLightbox;
