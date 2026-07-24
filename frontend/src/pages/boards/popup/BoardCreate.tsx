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
import { TBoardContentViewMode, TBoardScope } from "types/board";
import bStyle from "../boards.module.scss";

type Props = {
  setState: (state: boolean) => void;
  onSuccess?: () => void;
};

const BoardCreatePopup = ({ setState, onSuccess }: Props) => {
  const { currentSchool, currentSeason, currentRegistration } = useAuth();
  const { BoardAPI } = useAPIv2();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [coverColor, setCoverColor] = useState("");
  const [scope, setScope] = useState<TBoardScope>("school");
  const [contentViewMode, setContentViewMode] =
    useState<TBoardContentViewMode>("table");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 이미지 파일/URL은 보드 생성 후 업로드
  const coverFileRef = useRef<File | null>(null);
  const coverUrlRef = useRef<string>("");

  const seasonId = currentRegistration?.season || currentSeason?._id;
  const seasonLabel =
    currentSeason?.year && currentSeason?.term
      ? `${currentSeason.year} ${currentSeason.term}`
      : "이번 시즌";

  const handleSubmit = async () => {
    if (!name.trim()) {
      alert("보드 이름을 입력해주세요.");
      return;
    }

    if (!currentSchool) {
      alert("학교 정보가 없습니다.");
      return;
    }

    if (scope === "season" && !seasonId) {
      alert("시즌 정보가 없어 시즌 보드를 생성할 수 없습니다.");
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
          contentViewMode,
          scope,
          ...(scope === "season" ? { season: seasonId } : {}),
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
        <div style={{ marginBottom: "16px" }}>
          <div
            style={{
              display: "block",
              fontSize: "14px",
              fontWeight: 500,
              marginBottom: "6px",
            }}
          >
            보드 범위
          </div>
          <div className={bStyle.segmentGroup}>
            <button
              type="button"
              className={`${bStyle.segmentBtn} ${
                scope === "school" ? bStyle.segmentBtnActive : ""
              }`}
              onClick={() => setScope("school")}
            >
              학교 전체
            </button>
            <button
              type="button"
              className={`${bStyle.segmentBtn} ${
                scope === "season" ? bStyle.segmentBtnActive : ""
              }`}
              onClick={() => setScope("season")}
              disabled={!seasonId}
            >
              이번 시즌만
            </button>
          </div>
          <p
            style={{
              fontSize: "12px",
              color: "var(--text-color-2)",
              marginTop: "6px",
              marginBottom: 0,
            }}
          >
            {scope === "season"
              ? `${seasonLabel}에 등록된 구성원만 사용할 수 있습니다. 생성 후 범위를 바꿀 수 없습니다.`
              : "모든 시즌에서 보이며, 학교 구성원이 계속 사용할 수 있습니다."}
          </p>
        </div>
        <div style={{ marginBottom: "16px" }}>
          <div
            style={{
              display: "block",
              fontSize: "14px",
              fontWeight: 500,
              marginBottom: "6px",
            }}
          >
            문서 목록 보기
          </div>
          <div className={bStyle.segmentGroup}>
            <button
              type="button"
              className={`${bStyle.segmentBtn} ${
                contentViewMode === "table" ? bStyle.segmentBtnActive : ""
              }`}
              onClick={() => setContentViewMode("table")}
            >
              테이블
            </button>
            <button
              type="button"
              className={`${bStyle.segmentBtn} ${
                contentViewMode === "blog" ? bStyle.segmentBtnActive : ""
              }`}
              onClick={() => setContentViewMode("blog")}
            >
              블로그
            </button>
          </div>
          <p
            style={{
              fontSize: "12px",
              color: "var(--text-color-2)",
              marginTop: "6px",
              marginBottom: 0,
            }}
          >
            기본값은 테이블(카드형 목록)입니다.
          </p>
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
