import { useState } from "react";
import Popup from "components/popup/Popup";
import Button from "components/button/Button";
import CourseCoverImageEditor from "./CourseCoverImageEditor";

type CoverImageResult = {
  file: File | null;
  url: string;
  color: string;
  removed: boolean;
};

type Props = {
  setPopupActive: (active: boolean) => void;
  initialCoverImage?: string;
  initialCoverColor?: string;
  onApply: (result: CoverImageResult) => void;
};

const CourseCoverImagePopup = ({
  setPopupActive,
  initialCoverImage,
  initialCoverColor,
  onApply,
}: Props) => {
  const [tempFile, setTempFile] = useState<File | null>(null);
  const [tempUrl, setTempUrl] = useState<string>("");
  const [tempColor, setTempColor] = useState<string>(initialCoverColor || "");
  const [tempRemoved, setTempRemoved] = useState<boolean>(false);

  return (
    <Popup
      setState={setPopupActive}
      title="커버 이미지 설정"
      closeBtn
      style={{ maxWidth: "480px", width: "100%" }}
      footer={
        <Button
          type="ghost"
          onClick={() => {
            onApply({
              file: tempFile,
              url: tempUrl,
              color: tempColor,
              removed: tempRemoved,
            });
            setPopupActive(false);
          }}
        >
          확인
        </Button>
      }
    >
      <CourseCoverImageEditor
        coverImage={!tempRemoved ? initialCoverImage : undefined}
        coverColor={initialCoverColor}
        onImageSelected={(file) => {
          setTempFile(file);
          setTempUrl("");
          setTempRemoved(false);
        }}
        onImageUrlSet={(url) => {
          setTempUrl(url);
          setTempFile(null);
          setTempRemoved(false);
        }}
        onImageRemoved={() => {
          setTempFile(null);
          setTempUrl("");
          setTempRemoved(true);
        }}
        onColorChanged={(color) => setTempColor(color)}
      />
    </Popup>
  );
};

export default CourseCoverImagePopup;
