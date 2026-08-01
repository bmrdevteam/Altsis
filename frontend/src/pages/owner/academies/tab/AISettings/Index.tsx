/**
 * @file Academy Pid Page Tab Item - AI Settings
 *
 * @version 1.0
 */
import { useEffect, useState } from "react";
import Button from "components/button/Button";
import Input from "components/input/Input";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import style from "./Index.module.scss";

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
    shortLabel: string;
    keyUrl: string;
    keyUrlLabel: string;
    defaultModel: string;
    meta: string;
    note?: string;
    testOnly?: boolean;
  }
> = {
  openai: {
    label: "OpenAI",
    shortLabel: "OpenAI",
    keyUrl: "https://platform.openai.com/api-keys",
    keyUrlLabel: "OpenAI Platform에서 API 키 발급받기",
    // 키 저장 전 임시값. 저장/로드 시 해당 키의 실제 목록으로 교체됨
    defaultModel: "gpt-4o-mini",
    meta: "운영 권장",
  },
  anthropic: {
    label: "Anthropic (Claude)",
    shortLabel: "Anthropic",
    keyUrl: "https://console.anthropic.com/settings/keys",
    keyUrlLabel: "Anthropic Console에서 API 키 발급받기",
    defaultModel: "claude-sonnet-4-5",
    meta: "운영 권장",
  },
  gemini: {
    label: "Google Gemini (테스트용)",
    shortLabel: "Google Gemini",
    keyUrl: "https://aistudio.google.com/app/apikey",
    keyUrlLabel: "Google AI Studio에서 API 키 발급받기",
    defaultModel: "gemini-3.6-flash",
    meta: "개발·테스트 전용",
    testOnly: true,
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
  const [apiKeyHint, setApiKeyHint] = useState<string | null>(null);
  const [savedProvider, setSavedProvider] = useState<TProvider | null>(null);
  const [savedModel, setSavedModel] = useState<string | null>(null);
  const [isEditingApiKey, setIsEditingApiKey] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [availableModels, setAvailableModels] = useState<TModelInfo[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState<boolean>(false);
  const [useCustomModel, setUseCustomModel] = useState<boolean>(false);
  const [showCompliance, setShowCompliance] = useState<boolean>(false);
  const [modelNotice, setModelNotice] = useState<string | null>(null);

  const applyModels = (
    models: TModelInfo[] | undefined,
    model: string | undefined,
    options?: { adjusted?: boolean; previousModel?: string | null }
  ) => {
    const list = models || [];
    setAvailableModels(list);
    if (model) {
      setAiModel(model);
      setSavedModel(model);
    }
    if (options?.adjusted && model) {
      const prev = options.previousModel;
      setModelNotice(
        prev && prev !== model
          ? `이 API 키에서 '${prev}'를 사용할 수 없어 '${model}'로 자동 변경·저장했습니다.`
          : `사용 가능한 모델 목록을 불러와 '${model}'을(를) 적용했습니다.`
      );
    } else if (list.length > 0) {
      setModelNotice(
        `이 API 키로 사용 가능한 모델 ${list.length}개를 불러왔습니다.`
      );
    }
  };

  useEffect(() => {
    setIsLoadingModels(true);
    AcademyAPI.RAcademyAiApiKey({
      params: { academyId: props.academyData.academyId },
    })
      .then(
        ({
          hasApiKey,
          apiKeyHint,
          aiModel: model,
          aiProvider: provider,
          models,
          modelAdjusted,
        }) => {
          setHasApiKey(hasApiKey);
          setApiKeyHint(apiKeyHint || null);
          setIsEditingApiKey(!hasApiKey);
          const resolvedProvider =
            provider && provider in PROVIDER_INFO
              ? (provider as TProvider)
              : "gemini";
          setAiProvider(resolvedProvider);
          if (hasApiKey) {
            setSavedProvider(resolvedProvider);
            applyModels(models, model, { adjusted: modelAdjusted });
          } else {
            setSavedProvider(null);
            setSavedModel(null);
            setAvailableModels([]);
            setModelNotice(null);
            setAiModel(
              model || PROVIDER_INFO[resolvedProvider].defaultModel
            );
          }
        }
      )
      .catch((err) => {
        console.error(err);
      })
      .finally(() => {
        setIsLoadingModels(false);
      });
  }, [props.academyData.academyId]);

  const onChangeProviderHandler = (provider: TProvider) => {
    setAiProvider(provider);
    setAvailableModels([]);
    setModelNotice(null);
    if (hasApiKey && savedProvider === provider) {
      setAiModel(savedModel || PROVIDER_INFO[provider].defaultModel);
      setIsLoadingModels(true);
      AcademyAPI.RAcademyAiApiKey({
        params: { academyId: props.academyData.academyId },
      })
        .then(({ models, aiModel: model, modelAdjusted }) => {
          applyModels(models, model, { adjusted: modelAdjusted });
        })
        .catch((err) => console.error(err))
        .finally(() => setIsLoadingModels(false));
    } else {
      setAiModel(PROVIDER_INFO[provider].defaultModel);
    }
  };

  const providerMismatch =
    hasApiKey && savedProvider !== null && savedProvider !== aiProvider;

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
      const previousModel = aiModel;
      const {
        apiKeyHint: hint,
        aiModel: syncedModel,
        models,
        modelAdjusted,
      } = await AcademyAPI.UAcademyAiApiKey({
        params: {
          academyId: props.academyData.academyId,
        },
        data: {
          apiKey: apiKey.trim(),
          aiModel,
          aiProvider,
        },
      });
      setHasApiKey(true);
      setApiKeyHint(hint || null);
      setSavedProvider(aiProvider);
      setApiKey("");
      setIsEditingApiKey(false);
      applyModels(models, syncedModel || aiModel, {
        adjusted: modelAdjusted,
        previousModel,
      });
      if (modelAdjusted && syncedModel && syncedModel !== previousModel) {
        alert(
          `API 키를 저장했습니다.\n'${previousModel}'는 이 키에서 사용할 수 없어 '${syncedModel}'로 자동 변경했습니다.`
        );
      } else {
        alert(SUCCESS_MESSAGE);
      }
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  const onClickCancelEditApiKey = () => {
    setApiKey("");
    setIsEditingApiKey(false);
    if (savedProvider) {
      setAiProvider(savedProvider);
      setAiModel(savedModel || PROVIDER_INFO[savedProvider].defaultModel);
    }
  };

  const onClickTestApiKeyHandler = async () => {
    if (!apiKey.trim()) {
      alert("테스트할 API 키를 입력해주세요.");
      return;
    }

    setIsTesting(true);
    try {
      const { valid, error, suggestedModel, models } = await AIAPI.TestAiApiKey({
        data: { apiKey: apiKey.trim(), aiModel, provider: aiProvider },
      });
      if (valid) {
        if (models?.length) {
          setAvailableModels(models);
        }
        if (suggestedModel && suggestedModel !== aiModel) {
          setAiModel(suggestedModel);
          setModelNotice(
            `테스트 결과 '${suggestedModel}'을(를) 사용합니다. 저장하면 이 모델이 적용됩니다.`
          );
          alert(
            `API 키가 유효합니다.\n선택한 모델은 사용할 수 없어 ${suggestedModel}로 전환했습니다.\n저장하면 이 모델이 함께 적용됩니다.`
          );
        } else {
          alert(
            error ? `API 키가 유효합니다.\n${error}` : "API 키가 유효합니다."
          );
        }
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
      setSavedModel(aiModel.trim());
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
      // 저장된 키가 있으면 서버에서 목록 조회 + 불가 모델 자동 보정까지 수행
      if (hasApiKey && !apiKey.trim() && savedProvider === aiProvider) {
        const { models, aiModel: model, modelAdjusted } = await AcademyAPI.RAcademyAiApiKey({
          params: { academyId: props.academyData.academyId },
        });
        applyModels(models, model, {
          adjusted: modelAdjusted,
          previousModel: savedModel,
        });
        return;
      }

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
      const list = models || [];
      setAvailableModels(list);
      if (list.length > 0) {
        const currentExists = list.some((m) => m.name === aiModel);
        if (!currentExists) {
          setAiModel(list[0].name);
          setModelNotice(
            `'${aiModel}'는 목록에 없어 '${list[0].name}'을(를) 선택했습니다. 저장하면 적용됩니다.`
          );
        } else {
          setModelNotice(
            `사용 가능한 모델 ${list.length}개를 불러왔습니다.`
          );
        }
      }
    } catch (err) {
      ALERT_ERROR(err);
    } finally {
      setIsLoadingModels(false);
    }
  };

  const showKeyForm = !hasApiKey || isEditingApiKey;

  return (
    <div className={style.root}>
      <section>
        <h3 className={style.sectionTitle}>AI 기능</h3>
        <p className={style.sectionDesc}>
          AI를 켜면 강의계획서 생성과 보드의 Alter 채팅을 사용할 수 있습니다.
          운영 환경에서는 OpenAI 또는 Anthropic을 사용하세요.
        </p>

        <div className={`${style.card} ${style.statusRow}`}>
          <div className={style.statusMeta}>
            <div className={style.statusLabel}>현재 상태</div>
            <div className={style.badges}>
              <span
                className={`${style.badge} ${
                  props.academyData.aiEnabled ? style.badgeOn : style.badgeOff
                }`}
              >
                {props.academyData.aiEnabled ? "AI 활성화" : "AI 비활성화"}
              </span>
              <span
                className={`${style.badge} ${
                  hasApiKey ? style.badgeOn : style.badgeOff
                }`}
              >
                {hasApiKey ? "API 키 설정됨" : "API 키 없음"}
              </span>
              {(savedProvider || aiProvider) === "gemini" && (
                <span className={`${style.badge} ${style.badgeWarn}`}>
                  Gemini 테스트용
                </span>
              )}
              {hasApiKey && savedProvider && (
                <span className={`${style.badge} ${style.badgeOff}`}>
                  {PROVIDER_INFO[savedProvider].shortLabel} ·{" "}
                  {savedModel || aiModel}
                </span>
              )}
            </div>
          </div>

          <Button
            type="ghost"
            style={{ borderRadius: "4px", height: "32px" }}
            onClick={onClickToggleAiHandler}
          >
            {props.academyData.aiEnabled ? "AI 비활성화" : "AI 활성화"}
          </Button>
        </div>
      </section>

      <section>
        <h3 className={style.sectionTitle}>AI 제공자</h3>
        <p className={style.sectionDesc}>
          사용할 AI 제공자를 선택하세요. 학생이 쓰는 서비스이므로 운영에서는
          OpenAI 또는 Anthropic을 권장합니다.
        </p>

        <div className={style.providerGrid}>
          {(Object.keys(PROVIDER_INFO) as TProvider[]).map((provider) => {
            const info = PROVIDER_INFO[provider];
            const selected = aiProvider === provider;
            return (
              <label
                key={provider}
                className={`${style.providerCard} ${
                  selected ? style.providerCardSelected : ""
                }`}
              >
                <input
                  type="radio"
                  name="aiProvider"
                  checked={selected}
                  onChange={() => onChangeProviderHandler(provider)}
                />
                <span className={style.providerName}>{info.shortLabel}</span>
                <span className={style.providerMeta}>{info.meta}</span>
                {info.testOnly && (
                  <span className={style.providerTag}>테스트용</span>
                )}
              </label>
            );
          })}
        </div>

        {PROVIDER_INFO[aiProvider].note && (
          <p className={style.note}>{PROVIDER_INFO[aiProvider].note}</p>
        )}
      </section>

      <section>
        <h3 className={style.sectionTitle}>
          {PROVIDER_INFO[aiProvider].label} API 키
        </h3>
        <p className={style.sectionDesc}>
          {hasApiKey && !isEditingApiKey
            ? "등록된 키의 일부만 표시됩니다. 전체 키는 보안을 위해 다시 조회할 수 없습니다."
            : `${PROVIDER_INFO[aiProvider].label}에서 발급받은 API 키를 입력해주세요.`}{" "}
          <a
            href={PROVIDER_INFO[aiProvider].keyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={style.link}
          >
            {PROVIDER_INFO[aiProvider].keyUrlLabel}
          </a>
        </p>

        <div className={style.card}>
          {providerMismatch && (
            <p className={style.providerMismatch}>
              현재 등록된 키는{" "}
              <strong>
                {PROVIDER_INFO[savedProvider!].shortLabel}
              </strong>
              용입니다. 제공자를 바꾸려면 아래에 새 API 키를 입력해 저장하세요.
            </p>
          )}

          {!showKeyForm ? (
            <div className={style.keyView}>
              <div className={style.keyHintBlock}>
                <div className={style.keyHintLabel}>등록된 API 키</div>
                <div className={style.keyMetaRow}>
                  <span className={style.keyMetaItem}>
                    <span className={style.keyMetaLabel}>제공자</span>
                    <span className={style.keyMetaValue}>
                      {savedProvider
                        ? PROVIDER_INFO[savedProvider].label
                        : PROVIDER_INFO[aiProvider].label}
                    </span>
                  </span>
                  <span className={style.keyMetaItem}>
                    <span className={style.keyMetaLabel}>모델</span>
                    <span className={style.keyMetaValue}>
                      {savedModel || aiModel}
                    </span>
                  </span>
                </div>
                <div className={style.keyHintValue}>
                  {apiKeyHint || "••••••••"}
                </div>
              </div>
              <div className={style.keyActions}>
                <Button
                  type="ghost"
                  onClick={() => {
                    setApiKey("");
                    setIsEditingApiKey(true);
                  }}
                >
                  키 변경
                </Button>
              </div>
            </div>
          ) : (
            <div className={style.keyForm}>
              {hasApiKey && (
                <div className={style.keyHintBlock}>
                  <div className={style.keyHintLabel}>현재 등록된 키</div>
                  <div className={style.keyMetaRow}>
                    <span className={style.keyMetaItem}>
                      <span className={style.keyMetaLabel}>제공자</span>
                      <span className={style.keyMetaValue}>
                        {savedProvider
                          ? PROVIDER_INFO[savedProvider].label
                          : PROVIDER_INFO[aiProvider].label}
                      </span>
                    </span>
                    <span className={style.keyMetaItem}>
                      <span className={style.keyMetaLabel}>모델</span>
                      <span className={style.keyMetaValue}>
                        {savedModel || aiModel}
                      </span>
                    </span>
                  </div>
                  <div className={style.keyHintValue}>
                    {apiKeyHint || "••••••••"}
                  </div>
                </div>
              )}
              <div className={style.keyFormRow}>
                <Input
                  appearence="flat"
                  label={hasApiKey ? "새 API 키" : "API 키"}
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
                {hasApiKey && (
                  <Button type="ghost" onClick={onClickCancelEditApiKey}>
                    취소
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      <section>
        <h3 className={style.sectionTitle}>AI 모델</h3>
        <p className={style.sectionDesc}>
          API 키를 저장하거나 이 화면을 열면, 해당 키로 실제 사용 가능한 모델
          목록을 자동으로 불러옵니다. 필요하면 &quot;모델 다시 불러오기&quot;로
          갱신하세요.
        </p>

        <div className={style.card}>
          {modelNotice && <p className={style.modelNotice}>{modelNotice}</p>}

          <div className={style.modelCurrent}>
            <div className={style.modelCurrentLabel}>현재 모델</div>
            <div className={style.modelCurrentValue}>{aiModel}</div>
          </div>

          <div className={style.modelControls}>
            <Button
              type="ghost"
              onClick={onClickLoadModelsHandler}
              disabled={isLoadingModels || (!apiKey.trim() && !hasApiKey)}
            >
              {isLoadingModels ? "조회 중..." : "모델 다시 불러오기"}
            </Button>
            <label className={style.checkboxLabel}>
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
              className={style.modelSelect}
              value={aiModel}
              onChange={(e) => setAiModel(e.target.value)}
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
      </section>

      <section>
        <div className={style.card}>
          <button
            type="button"
            className={style.complianceSummary}
            onClick={() => setShowCompliance((v) => !v)}
            aria-expanded={showCompliance}
          >
            <div>
              <h3 className={style.sectionTitle} style={{ marginBottom: 4 }}>
                미성년 학생 보호를 위한 아카데미 이행사항
              </h3>
              <p className={style.sectionDesc} style={{ marginBottom: 0 }}>
                API 키 계약 당사자는 아카데미입니다. 법정대리인 동의, ZDR,
                개인정보 처리방침 갱신 등이 필요할 수 있습니다.
              </p>
            </div>
            <span className={style.chevron}>
              {showCompliance ? "접기 ▲" : "펼치기 ▼"}
            </span>
          </button>

          {showCompliance && (
            <div className={style.complianceBody}>
              <ul>
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
                    className={style.link}
                  >
                    OpenAI Under 18 API Guidance
                  </a>
                  {" · "}
                  <a
                    href="https://support.claude.com/en/articles/9307344-responsible-use-of-anthropic-s-models-guidelines-for-organizations-serving-minors"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={style.link}
                  >
                    Anthropic 미성년자 대상 조직 가이드라인
                  </a>
                </li>
              </ul>
              <p className={style.complianceFoot}>
                Altsis는 AI 사용 고지, 안전 시스템 프롬프트, 교사의 학생 AI
                대화 모니터링 기능을 기본 제공하여 위 가이드라인의 안전조치
                요건 이행을 지원합니다.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default AISettings;
