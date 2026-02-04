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

import { useState } from "react";
import { useAuth } from "contexts/authContext";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";

import Popup from "components/popup/Popup";
import Input from "components/input/Input";
import Button from "components/button/Button";
import Textarea from "components/textarea/Textarea";

type Props = {
  setState: (state: boolean) => void;
  onSuccess?: () => void;
};

const BoardCreatePopup = ({ setState, onSuccess }: Props) => {
  const { currentSchool } = useAuth();
  const { BoardAPI } = useAPIv2();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) {
      alert("게시판 이름을 입력해주세요.");
      return;
    }

    if (!currentSchool) {
      alert("학교 정보가 없습니다.");
      return;
    }

    setIsSubmitting(true);

    try {
      await BoardAPI.CBoard({
        data: {
          school: currentSchool._id,
          name: name.trim(),
          description: description.trim(),
        },
      });
      alert("게시판이 생성되었습니다.");
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
      title="게시판 생성"
      closeBtn
      style={{ maxWidth: "500px", width: "100%" }}
      footer={
        <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
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
            label="게시판 이름"
            placeholder="게시판 이름을 입력하세요"
            onChange={(e: any) => setName(e.target.value)}
            required
          />
        </div>
        <div>
          <Textarea
            label="설명 (선택)"
            placeholder="게시판에 대한 설명을 입력하세요"
            onChange={(e: any) => setDescription(e.target.value)}
          />
        </div>
      </div>
    </Popup>
  );
};

export default BoardCreatePopup;
