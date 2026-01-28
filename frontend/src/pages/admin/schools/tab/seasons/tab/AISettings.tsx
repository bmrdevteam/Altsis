/**
 * @file School Page Tab Item - Season AI Settings
 *
 * @author
 *
 * -------------------------------------------------------
 *
 * IN PRODUCTION
 *
 * -------------------------------------------------------
 *
 * IN MAINTENANCE
 *
 * -------------------------------------------------------
 *
 * IN DEVELOPMENT
 *
 * -------------------------------------------------------
 *
 * DEPRECATED
 *
 * -------------------------------------------------------
 *
 * NOTES
 *
 * @version 1.0
 *
 */
import { useEffect, useState, useRef } from "react";
import Button from "components/button/Button";
import Table from "components/tableV2/Table";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import { TAiSettings, TAiReference } from "types/seasons";

type Props = {
  _id: string;
};

const defaultAiSettings: TAiSettings = {
  enabled: false,
  permission: { teacher: false, student: false },
  guidelines: "",
  references: [],
};

const AISettings = (props: Props) => {
  const { SeasonAPI } = useAPIv2();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [aiSettings, setAiSettings] = useState<TAiSettings>(defaultAiSettings);
  const guidelinesRef = useRef<HTMLTextAreaElement>(null);

  const [newRefTitle, setNewRefTitle] = useState<string>("");
  const [newRefContent, setNewRefContent] = useState<string>("");

  useEffect(() => {
    if (isLoading) {
      SeasonAPI.RSeason({ params: { _id: props._id } })
        .then(({ season }) => {
          if (season?.aiSettings) {
            setAiSettings(season.aiSettings);
          }
        })
        .then(() => {
          setIsLoading(false);
        });
    }
  }, [isLoading]);

  const updateAiSettings = async (data: Partial<TAiSettings>) => {
    try {
      const { season } = await SeasonAPI.USeasonAiSettings({
        params: { _id: props._id },
        data,
      });
      if (season?.aiSettings) {
        setAiSettings(season.aiSettings);
      }
      alert(SUCCESS_MESSAGE);
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  const handleToggleEnabled = async () => {
    await updateAiSettings({ enabled: !aiSettings.enabled });
  };

  const handleTogglePermission = async (role: "teacher" | "student") => {
    await updateAiSettings({
      permission: {
        ...aiSettings.permission,
        [role]: !aiSettings.permission[role],
      },
    });
  };

  const handleSaveGuidelines = async () => {
    const guidelines = guidelinesRef.current?.value || "";
    await updateAiSettings({ guidelines });
  };

  const handleAddReference = async () => {
    if (!newRefTitle.trim() || !newRefContent.trim()) {
      alert("제목과 내용을 모두 입력해주세요.");
      return;
    }

    const newRef: TAiReference = {
      title: newRefTitle.trim(),
      content: newRefContent.trim(),
    };

    await updateAiSettings({
      references: [...aiSettings.references, newRef],
    });

    setNewRefTitle("");
    setNewRefContent("");
  };

  const handleRemoveReference = async (index: number) => {
    if (!window.confirm("정말 삭제하시겠습니까?")) return;

    const newRefs = aiSettings.references.filter((_, i) => i !== index);
    await updateAiSettings({ references: newRefs });
  };

  return (
    <div style={{ marginTop: "24px" }}>
      <div style={{ marginBottom: "24px" }}>
        <h4 style={{ marginBottom: "12px" }}>AI 기능 활성화</h4>
        <p style={{ color: "var(--accent-3)", marginBottom: "12px" }}>
          이 학기에서 AI 기능을 사용할 수 있도록 활성화합니다.
        </p>
        <div
          style={{
            padding: "16px",
            border: "1px solid var(--border-color)",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontWeight: 500 }}>현재 상태</div>
            <div
              style={{
                marginTop: "4px",
                color: aiSettings.enabled
                  ? "var(--color-g4)"
                  : "var(--accent-3)",
              }}
            >
              {aiSettings.enabled ? "활성화됨" : "비활성화됨"}
            </div>
          </div>
          <Button
            type="ghost"
            style={{ borderRadius: "4px", height: "32px" }}
            onClick={handleToggleEnabled}
          >
            {aiSettings.enabled ? "비활성화" : "활성화"}
          </Button>
        </div>
      </div>

      <div style={{ marginBottom: "24px" }}>
        <h4 style={{ marginBottom: "12px" }}>권한 설정</h4>
        <p style={{ color: "var(--accent-3)", marginBottom: "12px" }}>
          AI 기능을 사용할 수 있는 역할을 설정합니다.
        </p>
        <Table
          type="object-array"
          data={[
            { role: "teacher", label: "선생님", enabled: aiSettings.permission.teacher },
            { role: "student", label: "학생", enabled: aiSettings.permission.student },
          ]}
          header={[
            {
              text: "역할",
              key: "label",
              width: "120px",
              textAlign: "center",
              type: "text",
            },
            {
              text: "AI 사용 권한",
              key: "enabled",
              width: "120px",
              textAlign: "center",
              type: "status",
              status: {
                false: {
                  text: "N",
                  color: "red",
                  onClick: (e: any) => handleTogglePermission(e.role),
                },
                true: {
                  text: "Y",
                  color: "green",
                  onClick: (e: any) => handleTogglePermission(e.role),
                },
              },
            },
          ]}
        />
      </div>

      <div style={{ marginBottom: "24px" }}>
        <h4 style={{ marginBottom: "12px" }}>기본 지침</h4>
        <p style={{ color: "var(--accent-3)", marginBottom: "12px" }}>
          AI가 강의계획서를 생성할 때 참고할 지침을 입력합니다.
        </p>
        <textarea
          ref={guidelinesRef}
          defaultValue={aiSettings.guidelines}
          placeholder="예: 강의계획서는 학교의 교육 철학에 맞게 작성해주세요. 학생들의 창의성과 협력을 강조해주세요."
          style={{
            width: "100%",
            minHeight: "120px",
            padding: "12px",
            border: "1px solid var(--border-color)",
            borderRadius: "8px",
            resize: "vertical",
            fontFamily: "inherit",
            fontSize: "14px",
          }}
        />
        <div style={{ marginTop: "12px", textAlign: "right" }}>
          <Button type="ghost" onClick={handleSaveGuidelines}>
            저장
          </Button>
        </div>
      </div>

      <div>
        <h4 style={{ marginBottom: "12px" }}>참고 자료</h4>
        <p style={{ color: "var(--accent-3)", marginBottom: "12px" }}>
          AI가 강의계획서를 생성할 때 참고할 자료를 추가합니다.
        </p>

        {aiSettings.references.length > 0 && (
          <div style={{ marginBottom: "16px" }}>
            <Table
              type="object-array"
              data={aiSettings.references.map((ref, index) => ({
                ...ref,
                index,
              }))}
              header={[
                {
                  text: "제목",
                  key: "title",
                  type: "text",
                },
                {
                  text: "내용",
                  key: "content",
                  type: "text",
                },
                {
                  text: "삭제",
                  key: "delete",
                  type: "button",
                  onClick: (e: any) => handleRemoveReference(e.index),
                  width: "80px",
                  textAlign: "center",
                  btnStyle: {
                    border: true,
                    color: "red",
                    padding: "4px",
                    round: true,
                  },
                },
              ]}
            />
          </div>
        )}

        <div
          style={{
            padding: "16px",
            border: "1px solid var(--border-color)",
            borderRadius: "8px",
          }}
        >
          <div style={{ marginBottom: "12px" }}>
            <label style={{ display: "block", marginBottom: "4px", fontWeight: 500 }}>
              제목
            </label>
            <input
              type="text"
              value={newRefTitle}
              onChange={(e) => setNewRefTitle(e.target.value)}
              placeholder="참고 자료 제목"
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid var(--border-color)",
                borderRadius: "4px",
              }}
            />
          </div>
          <div style={{ marginBottom: "12px" }}>
            <label style={{ display: "block", marginBottom: "4px", fontWeight: 500 }}>
              내용
            </label>
            <textarea
              value={newRefContent}
              onChange={(e) => setNewRefContent(e.target.value)}
              placeholder="참고 자료 내용"
              style={{
                width: "100%",
                minHeight: "80px",
                padding: "8px 12px",
                border: "1px solid var(--border-color)",
                borderRadius: "4px",
                resize: "vertical",
                fontFamily: "inherit",
              }}
            />
          </div>
          <div style={{ textAlign: "right" }}>
            <Button type="ghost" onClick={handleAddReference}>
              추가
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AISettings;
