/**
 * @file Board Create Popup
 *
 * @author
 *
 * -------------------------------------------------------
 *
 * IN PRODUCTION
 *
 * -------------------------------------------------------
 */

import { useRef, useState } from "react";
import { useAuth } from "contexts/authContext";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";

import Popup from "components/popup/Popup";
import Input from "components/input/Input";
import Button from "components/button/Button";
import Textarea from "components/textarea/Textarea";
import CourseCoverImageEditor from "pages/courses/view/CourseCoverImageEditor";

type Props = {
  setState: (state: boolean) => void;
  onSuccess?: () => void;
};

const BoardCreatePopup = ({ setState, onSuccess }: Props) => {
  const { currentSchool } = useAuth();
  const { BoardAPI } = useAPIv2();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [coverColor, setCoverColor] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 이미지 파일/URL은 보드 생성 후 업로드
  const coverFileRef = useRef<File | null>(null);
  const coverUrlRef = useRef<string>("");

  const handleSubmit = async () => {
    if (!name.trim()) {
      alert("보드 이름을 입력해주세요.");
      return;
    }

    if (!currentSchool) {
      alert("학교 정보가 없습니다.");
      return;
    }

    setIsSubmitting(true);

    try {
      const { board } = await BoardAPI.CBoard({
        data: {
          school: currentSchool._id,
          name: name.trim(),
          description: description.trim(),
          coverColor: coverColor || undefined,
        },
      });

      // 이미지 파일이 있으면 업로드
      if (coverFileRef.current) {
        const formData = new FormData();
        formData.append("img", coverFileRef.current);
        await BoardAPI.UBoardCoverImage({
          params: { _id: board._id },
          data: formData,
        });
      } else if (coverUrlRef.current) {
        // URL 이미지인 경우 coverImage로 직접 저장
        await BoardAPI.UBoard({
          params: { _id: board._id },
          data: { coverColor: coverUrlRef.current },
        });
      }

      alert("보드가 생성되었습니다.");
      setState(false);
      onSuccess?.();
    } catch (err) {
      ALERT_ERROR(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Popup
      setState={setState}
      title="보드 생성"
      closeBtn
      style={{ maxWidth: "500px", width: "100%" }}
      footer={
        <div
          style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}
        >
          <Button type="ghost" onClick={() => setState(false)}>
            취소
          </Button>
          <Button type="ghost" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "생성 중..." : "생성"}
          </Button>
        </div>
      }
    >
      <div>
        <div style={{ marginBottom: "16px" }}>
          <Input
            label="보드 이름"
            placeholder="보드 이름을 입력하세요"
            onChange={(e: any) => setName(e.target.value)}
            required
          />
        </div>
        <div style={{ marginBottom: "16px" }}>
          <Textarea
            label="설명 (선택)"
            placeholder="보드에 대한 설명을 입력하세요"
            onChange={(e: any) => setDescription(e.target.value)}
          />
        </div>
        <div>
          <label
            style={{
              display: "block",
              fontSize: "14px",
              fontWeight: 500,
              marginBottom: "6px",
            }}
          >
            커버 (선택)
          </label>
          <CourseCoverImageEditor
            coverColor={coverColor}
            onImageSelected={(file) => {
              coverFileRef.current = file;
              coverUrlRef.current = "";
            }}
            onImageUrlSet={(url) => {
              coverUrlRef.current = url;
              coverFileRef.current = null;
            }}
            onImageRemoved={() => {
              coverFileRef.current = null;
              coverUrlRef.current = "";
            }}
            onColorChanged={(color) => setCoverColor(color)}
          />
        </div>
      </div>
    </Popup>
  );
};

export default BoardCreatePopup;
