import { useState } from "react";
import style from "./altBoard.module.scss";

type Props = {
  src?: string | null;
};

const LinkPreviewThumb = ({ src }: Props) => {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <span
        className={`${style.filePreviewThumb} ${style.filePreviewThumbWeb}`}
        aria-hidden
      >
        WEB
      </span>
    );
  }
  return (
    <img
      src={src}
      alt=""
      className={style.linkPreviewImage}
      onError={() => setFailed(true)}
    />
  );
};

export default LinkPreviewThumb;
