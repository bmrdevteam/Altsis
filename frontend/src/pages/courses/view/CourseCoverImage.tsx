import { useState } from "react";
import ImageLightbox from "layout/navbar/ImageLightbox";
import style from "./courseCoverImage.module.scss";

type Props = {
  coverImage?: string;
  coverColor?: string;
  classTitle: string;
  syllabusId: string;
};

const fallbackColors = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f59e0b",
  "#3b82f6",
  "#10b981",
  "#ef4444",
];

function getColorFromId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return fallbackColors[Math.abs(hash) % fallbackColors.length];
}

function getInitials(title: string): string {
  return title.trim().substring(0, 2);
}

const CourseCoverImage = ({
  coverImage,
  coverColor,
  classTitle,
  syllabusId,
}: Props) => {
  const [lightboxActive, setLightboxActive] = useState(false);
  const [imgError, setImgError] = useState(false);

  const showPlaceholder = !coverImage || imgError;
  const placeholderBg = coverColor || getColorFromId(syllabusId);

  return (
    <>
      <div
        className={style.cover_container}
        onClick={() => {
          if (!showPlaceholder) setLightboxActive(true);
        }}
        style={showPlaceholder ? { cursor: "default" } : undefined}
      >
        {showPlaceholder ? (
          <div
            className={style.cover_placeholder}
            style={{ backgroundColor: placeholderBg }}
          >
            <span className={style.cover_initials}>
              {getInitials(classTitle)}
            </span>
          </div>
        ) : (
          <img
            src={coverImage}
            alt={classTitle}
            className={style.cover_image}
            onError={(e) => {
              const src = e.currentTarget.src;
              if (src.includes("/thumb/")) {
                e.currentTarget.src = src.replace("/thumb/", "/original/");
              } else {
                setImgError(true);
              }
            }}
          />
        )}
      </div>

      {lightboxActive && coverImage && (
        <ImageLightbox
          imageUrl={coverImage.replace("/thumb/", "/original/")}
          onClose={() => setLightboxActive(false)}
        />
      )}
    </>
  );
};

export default CourseCoverImage;
