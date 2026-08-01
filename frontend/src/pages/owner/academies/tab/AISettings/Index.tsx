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

type TProvider = "openai" | "anthropic" | "gemini";

const PROVIDER_INFO: Record<
  TProvider,
  {
    label: string;
    keyUrl: string;
    keyUrlLabel: string;
    defaultModel: string;
    note?: string;
  }
> = {
  openai: {
    label: "OpenAI",
    keyUrl: "https://platform.openai.com/api-keys",
    keyUrlLabel: "OpenAI Platform에서 API 키 발급받기",
    defaultModel: "gpt-4o-mini",
  },
  anthropic: {
    label: "Anthropic (Claude)",
    keyUrl: "https://console.anthropic.com/settings/keys",
    keyUrlLabel: "Anthropic Console에서 API 키 발급받기",
    defaultModel: "claude-sonnet-4-5",
  },
  gemini: {
    label: "Google Gemini (테스트용)",
    keyUrl: "https://aistudio.google.com/app/apikey",
    keyUrlLabel: "Google AI Studio에서 API 키 발급받기",
    defaultModel: "gemini-2.5-flash",
    note: "Google 약관상 미성년자가 접근하는 서비스에는 Gemini API를 사용할 수 없습니다. 테스트 용도로만 사용해주세요.",
  },
};

const AISettings = (props: Props) => {
  const { AcademyAPI, AIAPI } = useAPIv2();
  const [aiProvider, setAiProvider] = useState<TProvider>("openai");
  const [apiKey, setApiKey] = useState<string>("");
  const [aiModel, setAiModel] = useState<string>(
    PROVIDER_INFO.openai.defaultModel
  );
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
      .then(({ hasApiKey, aiModel: model, aiProvider: provider }) => {
        setHasApiKey(hasApiKey);
        if (provider && provider in PROVIDER_INFO) {
          setAiProvider(provider as TProvider);
        }
        if (model) setAiModel(model);
      })
      .catch((err) => {
        console.error(err);
      });
  }, [props.academyData.academyId]);

  const onChangeProviderHandler = (provider: TProvider) => {
    setAiProvider(provider);
    setAiModel(PROVIDER_INFO[provider].defaultModel);
    setAvailableModels([]);
  };

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
          aiProvider,
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
        data: { apiKey: apiKey.trim(), aiModel, provider: aiProvider },
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
          provider: aiProvider,
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
            AI 기능을 활성화하면 수업 개설 시 AI를 사용하여 강의계획서 내용을
            자동으로 생성할 수 있습니다.
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
          <h3 style={{ marginBottom: "12px" }}>AI 제공자</h3>
          <p style={{ color: "var(--accent-3)", marginBottom: "24px" }}>
            사용할 AI 제공자를 선택하세요. 학생이 사용하는 서비스이므로 운영
            환경에서는 OpenAI 또는 Anthropic을 사용해야 하며, Google Gemini는
            테스트 용도로만 제공됩니다.
          </p>

          <div
            style={{
              padding: "16px",
              border: "1px solid var(--border-color)",
              borderRadius: "8px",
            }}
          >
            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
              {(Object.keys(PROVIDER_INFO) as TProvider[]).map((provider) => (
                <label
                  key={provider}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    cursor: "pointer",
                    fontSize: "14px",
                  }}
                >
                  <input
                    type="radio"
                    name="aiProvider"
                    checked={aiProvider === provider}
                    onChange={() => onChangeProviderHandler(provider)}
                  />
                  {PROVIDER_INFO[provider].label}
                </label>
              ))}
            </div>

            {PROVIDER_INFO[aiProvider].note && (
              <p
                style={{
                  marginTop: "12px",
                  color: "var(--color-r4, #d9534f)",
                  fontSize: "13px",
                }}
              >
                {PROVIDER_INFO[aiProvider].note}
              </p>
            )}
          </div>
        </div>

        <div>
          <h3 style={{ marginBottom: "12px" }}>
            {PROVIDER_INFO[aiProvider].label} API 키
          </h3>
          <p style={{ color: "var(--accent-3)", marginBottom: "24px" }}>
            {PROVIDER_INFO[aiProvider].label}에서 발급받은 API 키를
            입력해주세요.
            <br />
            <a
              href={PROVIDER_INFO[aiProvider].keyUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--accent-1)" }}
            >
              {PROVIDER_INFO[aiProvider].keyUrlLabel}
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
                placeholder={`예: ${PROVIDER_INFO[aiProvider].defaultModel}`}
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

        <div>
          <h3 style={{ marginBottom: "12px" }}>
            미성년 학생 보호를 위한 아카데미 이행사항
          </h3>
          <p style={{ color: "var(--accent-3)", marginBottom: "24px" }}>
            AI 제공자와의 계약 당사자는 API 키를 발급받은 아카데미입니다.
            미성년 학생이 AI 기능을 사용하는 경우 아래 사항을 아카데미가 직접
            이행해야 합니다.
          </p>

          <div
            style={{
              padding: "16px",
              border: "1px solid var(--border-color)",
              borderRadius: "8px",
              fontSize: "14px",
              lineHeight: "1.7",
            }}
          >
            <ul style={{ margin: 0, paddingLeft: "20px" }}>
              <li>
                만 14세 미만 학생이 AI 기능을 사용하는 경우, 개인정보보호법에
                따라 법정대리인 동의를 받아야 합니다.
              </li>
              <li>
                OpenAI를 사용하고 만 14세 미만 학생이 있는 경우, OpenAI
                계정에서 Zero Data Retention(ZDR)을 신청해야 합니다.
              </li>
              <li>
                아카데미의 개인정보 처리방침에 사용하는 AI 제공자를 처리
                위탁·국외 이전 항목으로 기재해야 합니다.
              </li>
              <li>
                제공자의 미성년자 관련 가이드라인을 확인하세요.{" "}
                <a
                  href="https://developers.openai.com/api/docs/guides/safety-checks/under-18-api-guidance"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--accent-1)" }}
                >
                  OpenAI Under 18 API Guidance
                </a>
                {" · "}
                <a
                  href="https://support.claude.com/en/articles/9307344-responsible-use-of-anthropic-s-models-guidelines-for-organizations-serving-minors"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--accent-1)" }}
                >
                  Anthropic 미성년자 대상 조직 가이드라인
                </a>
              </li>
            </ul>
            <p
              style={{
                marginTop: "12px",
                marginBottom: 0,
                color: "var(--accent-3)",
                fontSize: "13px",
              }}
            >
              Altsis는 AI 사용 고지, 안전 시스템 프롬프트, 교사의 학생 AI 대화
              모니터링 기능을 기본 제공하여 위 가이드라인의 안전조치 요건
              이행을 지원합니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AISettings;
