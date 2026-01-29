/**
 * @file Academy Pid Page Tab Item - AI Settings
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
import { useEffect, useState } from "react";
import Button from "components/button/Button";
import Input from "components/input/Input";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";

type Props = {
  academyData: any;
  setAcademyData: React.Dispatch<any>;
};

type TModelInfo = {
  name: string;
  displayName: string;
};

const AISettings = (props: Props) => {
  const { AcademyAPI, AIAPI } = useAPIv2();
  const [apiKey, setApiKey] = useState<string>("");
  const [aiModel, setAiModel] = useState<string>("gemini-2.5-flash");
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [availableModels, setAvailableModels] = useState<TModelInfo[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState<boolean>(false);
  const [useCustomModel, setUseCustomModel] = useState<boolean>(false);

  useEffect(() => {
    // Check if API key exists
    AcademyAPI.RAcademyAiApiKey({
      params: { academyId: props.academyData.academyId },
    })
      .then(({ hasApiKey, aiModel: model }) => {
        setHasApiKey(hasApiKey);
        if (model) setAiModel(model);
      })
      .catch((err) => {
        console.error(err);
      });
  }, [props.academyData.academyId]);

  const onClickToggleAiHandler = async () => {
    const action = props.academyData.aiEnabled ? "비활성화" : "활성화";
    if (!window.confirm(`정말 AI 기능을 ${action}하시겠습니까?`)) return;

    try {
      const { academy } = await AcademyAPI.UAcademyAiEnabled({
        params: {
          academyId: props.academyData.academyId,
        },
        data: {
          aiEnabled: !props.academyData.aiEnabled,
        },
      });
      alert(SUCCESS_MESSAGE);
      props.setAcademyData(academy);
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  const onClickSaveApiKeyHandler = async () => {
    if (!apiKey.trim()) {
      alert("API 키를 입력해주세요.");
      return;
    }

    try {
      await AcademyAPI.UAcademyAiApiKey({
        params: {
          academyId: props.academyData.academyId,
        },
        data: {
          apiKey: apiKey.trim(),
          aiModel,
        },
      });
      alert(SUCCESS_MESSAGE);
      setHasApiKey(true);
      setApiKey("");
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  const onClickTestApiKeyHandler = async () => {
    if (!apiKey.trim()) {
      alert("테스트할 API 키를 입력해주세요.");
      return;
    }

    setIsTesting(true);
    try {
      const { valid, error } = await AIAPI.TestAiApiKey({
        data: { apiKey: apiKey.trim(), aiModel },
      });
      if (valid) {
        alert("API 키가 유효합니다.");
      } else {
        alert(`API 키가 유효하지 않습니다.\n${error || ""}`);
      }
    } catch (err) {
      ALERT_ERROR(err);
    } finally {
      setIsTesting(false);
    }
  };

  const onClickSaveModelHandler = async () => {
    if (!aiModel.trim()) {
      alert("모델명을 입력해주세요.");
      return;
    }

    try {
      await AcademyAPI.UAcademyAiModel({
        params: {
          academyId: props.academyData.academyId,
        },
        data: {
          aiModel: aiModel.trim(),
        },
      });
      alert(SUCCESS_MESSAGE);
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  const onClickLoadModelsHandler = async () => {
    if (!apiKey.trim() && !hasApiKey) {
      alert("먼저 API 키를 입력하고 저장해주세요.");
      return;
    }

    setIsLoadingModels(true);
    try {
      const { models, error } = await AIAPI.ListAiModels({
        data: {
          apiKey: apiKey.trim() || undefined,
          academyId: props.academyData.academyId,
        },
      });
      if (error) {
        alert(error);
        return;
      }
      setAvailableModels(models || []);
      if (models && models.length > 0) {
        const currentExists = models.some((m) => m.name === aiModel);
        if (!currentExists) {
          setAiModel(models[0].name);
        }
      }
    } catch (err) {
      ALERT_ERROR(err);
    } finally {
      setIsLoadingModels(false);
    }
  };

  return (
    <div>
      <div
        style={{
          marginTop: "24px",
          display: "flex",
          gap: "24px",
          flexDirection: "column",
        }}
      >
        <div>
          <h3 style={{ marginBottom: "12px" }}>AI 기능</h3>
          <p style={{ color: "var(--accent-3)", marginBottom: "24px" }}>
            AI 기능을 활성화하면 수업 개설 시 Gemini AI를 사용하여 강의계획서
            내용을 자동으로 생성할 수 있습니다.
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
                  color: props.academyData.aiEnabled
                    ? "var(--color-g4)"
                    : "var(--accent-3)",
                }}
              >
                {props.academyData.aiEnabled ? "활성화됨" : "비활성화됨"}
              </div>
            </div>

            <Button
              type="ghost"
              style={{
                borderRadius: "4px",
                height: "32px",
              }}
              onClick={onClickToggleAiHandler}
            >
              {props.academyData.aiEnabled ? "AI 비활성화" : "AI 활성화"}
            </Button>
          </div>
        </div>

        <div>
          <h3 style={{ marginBottom: "12px" }}>Gemini API 키</h3>
          <p style={{ color: "var(--accent-3)", marginBottom: "24px" }}>
            Google AI Studio에서 발급받은 Gemini API 키를 입력해주세요.
            <br />
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--accent-1)" }}
            >
              API 키 발급받기
            </a>
          </p>

          <div
            style={{
              padding: "16px",
              border: "1px solid var(--border-color)",
              borderRadius: "8px",
            }}
          >
            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontWeight: 500 }}>API 키 상태</div>
              <div
                style={{
                  marginTop: "4px",
                  color: hasApiKey ? "var(--color-g4)" : "var(--accent-3)",
                }}
              >
                {hasApiKey ? "설정됨" : "설정되지 않음"}
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px", alignItems: "end" }}>
              <Input
                appearence="flat"
                label="새 API 키"
                type="password"
                placeholder="API 키를 입력하세요"
                value={apiKey}
                onChange={(e: any) => setApiKey(e.target.value)}
              />
              <Button
                type="ghost"
                onClick={onClickTestApiKeyHandler}
                disabled={isTesting}
              >
                {isTesting ? "테스트 중..." : "테스트"}
              </Button>
              <Button type="ghost" onClick={onClickSaveApiKeyHandler}>
                저장
              </Button>
            </div>
          </div>
        </div>

        <div>
          <h3 style={{ marginBottom: "12px" }}>AI 모델</h3>
          <p style={{ color: "var(--accent-3)", marginBottom: "24px" }}>
            사용할 AI 모델을 선택하거나 직접 입력하세요. API 키를 입력한 후
            "모델 탐색" 버튼을 클릭하면 사용 가능한 모델 목록을 조회할 수
            있습니다.
          </p>

          <div
            style={{
              padding: "16px",
              border: "1px solid var(--border-color)",
              borderRadius: "8px",
            }}
          >
            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontWeight: 500 }}>현재 모델</div>
              <div
                style={{
                  marginTop: "4px",
                  color: "var(--accent-1)",
                }}
              >
                {aiModel}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: "8px",
                marginBottom: "16px",
                alignItems: "center",
              }}
            >
              <Button
                type="ghost"
                onClick={onClickLoadModelsHandler}
                disabled={isLoadingModels || (!apiKey.trim() && !hasApiKey)}
              >
                {isLoadingModels ? "조회 중..." : "모델 탐색"}
              </Button>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                <input
                  type="checkbox"
                  checked={useCustomModel}
                  onChange={(e) => setUseCustomModel(e.target.checked)}
                />
                직접 입력
              </label>
            </div>

            {useCustomModel ? (
              <Input
                appearence="flat"
                label="모델명"
                placeholder="예: gemini-2.5-flash"
                value={aiModel}
                onChange={(e: any) => setAiModel(e.target.value)}
              />
            ) : (
              <select
                value={aiModel}
                onChange={(e) => setAiModel(e.target.value)}
                style={{
                  padding: "8px 12px",
                  borderRadius: "4px",
                  border: "1px solid var(--border-color)",
                  backgroundColor: "var(--background-color)",
                  color: "var(--text-color)",
                  fontSize: "14px",
                  width: "100%",
                  maxWidth: "400px",
                }}
              >
                {availableModels.length > 0 ? (
                  availableModels.map((m) => (
                    <option key={m.name} value={m.name}>
                      {m.displayName} ({m.name})
                    </option>
                  ))
                ) : (
                  <option value={aiModel}>{aiModel}</option>
                )}
              </select>
            )}

            <div style={{ marginTop: "16px" }}>
              <Button type="ghost" onClick={onClickSaveModelHandler}>
                모델 저장
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AISettings;
