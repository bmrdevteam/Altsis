/**
 * @file School Page Tab Item - Season AI Settings
 *
 * @version 1.1
 */
import { useEffect, useState, useRef } from "react";
import Button from "components/button/Button";
import Table from "components/tableV2/Table";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import { TAiSettings, TAiReference } from "types/seasons";
import { TSyllabus } from "types/syllabuses";
import style from "./AISettings.module.scss";

const SUCCESS_MESSAGE = "저장되었습니다.";
const MAX_EXAMPLE_SYLLABI = 2;

type Props = {
  _id: string;
};

const defaultAiSettings: TAiSettings = {
  enabled: false,
  permission: { teacher: false, student: false },
  guidelines: "",
  references: [],
  examples: {},
  exampleSyllabusIds: [],
};

const AISettings = (props: Props) => {
  const { SeasonAPI, AIAPI, SyllabusAPI } = useAPIv2();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [aiSettings, setAiSettings] = useState<TAiSettings>(defaultAiSettings);
  const [isGeneratingTemplate, setIsGeneratingTemplate] = useState(false);
  const guidelinesRef = useRef<HTMLTextAreaElement>(null);

  const [seasonSyllabi, setSeasonSyllabi] = useState<TSyllabus[]>([]);
  const [selectedExampleIds, setSelectedExampleIds] = useState<string[]>([]);
  const [syllabiLoading, setSyllabiLoading] = useState(false);

  const [newRefTitle, setNewRefTitle] = useState<string>("");
  const [newRefContent, setNewRefContent] = useState<string>("");
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isLoading) return;
    let cancelled = false;

    (async () => {
      try {
        const { season } = await SeasonAPI.RSeason({
          params: { _id: props._id },
        });
        if (cancelled) return;
        if (season?.aiSettings) {
          const next = {
            ...defaultAiSettings,
            ...season.aiSettings,
            examples: season.aiSettings.examples || {},
            exampleSyllabusIds: season.aiSettings.exampleSyllabusIds || [],
          };
          setAiSettings(next);
          setSelectedExampleIds(next.exampleSyllabusIds || []);
        }
      } catch (err) {
        if (!cancelled) ALERT_ERROR(err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, props._id]);

  useEffect(() => {
    let cancelled = false;
    setSyllabiLoading(true);
    SyllabusAPI.RSyllabuses({ query: { season: props._id } })
      .then(({ syllabuses }) => {
        if (cancelled) return;
        setSeasonSyllabi(syllabuses || []);
      })
      .catch((err) => {
        if (!cancelled) ALERT_ERROR(err);
      })
      .finally(() => {
        if (!cancelled) setSyllabiLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props._id]);

  const updateAiSettings = async (data: Partial<TAiSettings>) => {
    try {
      const { season } = await SeasonAPI.USeasonAiSettings({
        params: { _id: props._id },
        data,
      });
      if (season?.aiSettings) {
        setAiSettings({
          ...defaultAiSettings,
          ...season.aiSettings,
          exampleSyllabusIds: season.aiSettings.exampleSyllabusIds || [],
        });
        if ("exampleSyllabusIds" in data) {
          setSelectedExampleIds(season.aiSettings.exampleSyllabusIds || []);
        }
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

  const handleLoadGuidelinesTemplate = async () => {
    if (
      guidelinesRef.current?.value?.trim() &&
      !window.confirm("현재 작성 중인 지침을 AI 추천 템플릿으로 바꿀까요?")
    ) {
      return;
    }
    setIsGeneratingTemplate(true);
    try {
      const { guidelines } = await AIAPI.GenerateGuidelinesTemplate({
        data: { season: props._id },
      });
      if (guidelinesRef.current) {
        guidelinesRef.current.value = guidelines || "";
      }
    } catch (err) {
      ALERT_ERROR(err);
    } finally {
      setIsGeneratingTemplate(false);
    }
  };

  const toggleExampleSyllabus = (id: string) => {
    setSelectedExampleIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_EXAMPLE_SYLLABI) {
        alert(`모범 계획서는 최대 ${MAX_EXAMPLE_SYLLABI}개까지 선택할 수 있습니다.`);
        return prev;
      }
      return [...prev, id];
    });
  };

  const handleSaveExampleSyllabi = async () => {
    await updateAiSettings({ exampleSyllabusIds: selectedExampleIds });
  };

  const selectedSyllabusMeta = selectedExampleIds
    .map((id) => seasonSyllabi.find((s) => s._id === id))
    .filter(Boolean) as TSyllabus[];

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
    if (!window.confirm("이 참고 자료를 삭제하시겠습니까?")) return;
    try {
      const { season } = await SeasonAPI.DSeasonAiReference({
        params: { _id: props._id, index },
      });
      if (season?.aiSettings) {
        setAiSettings({
          ...defaultAiSettings,
          ...season.aiSettings,
          exampleSyllabusIds: season.aiSettings.exampleSyllabusIds || [],
        });
      }
      alert(SUCCESS_MESSAGE);
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", newRefTitle.trim() || file.name);
      const { season } = await SeasonAPI.CSeasonAiReferenceUpload({
        params: { _id: props._id },
        data: formData,
      });
      if (season?.aiSettings) {
        setAiSettings({
          ...defaultAiSettings,
          ...season.aiSettings,
          exampleSyllabusIds: season.aiSettings.exampleSyllabusIds || [],
        });
      }
      setNewRefTitle("");
      alert(SUCCESS_MESSAGE);
    } catch (err) {
      ALERT_ERROR(err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDownloadReference = async (index: number) => {
    try {
      const { url } = await SeasonAPI.RSeasonAiReferenceDownload({
        params: { _id: props._id, index },
      });
      window.open(url, "_blank");
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  if (isLoading) {
    return <div className={style.loading}>불러오는 중...</div>;
  }

  return (
    <div className={style.root}>
      <section className={style.section}>
        <h4 className={style.sectionTitle}>AI 기능 활성화</h4>
        <p className={style.sectionHint}>
          이 학기에서 AI 기능을 사용할 수 있도록 활성화합니다.
        </p>
        <div className={style.statusCard}>
          <div className={style.statusMeta}>
            <span className={style.statusLabel}>현재 상태</span>
            <span
              className={`${style.statusValue} ${
                aiSettings.enabled ? style.statusOn : style.statusOff
              }`}
            >
              <span className={style.statusDot} />
              {aiSettings.enabled ? "활성화됨" : "비활성화됨"}
            </span>
          </div>
          <Button type="ghost" onClick={handleToggleEnabled}>
            {aiSettings.enabled ? "비활성화" : "활성화"}
          </Button>
        </div>
      </section>

      <section className={style.section}>
        <h4 className={style.sectionTitle}>권한 설정</h4>
        <p className={style.sectionHint}>
          AI 기능을 사용할 수 있는 역할을 설정합니다.
        </p>
        <Table
          type="object-array"
          data={[
            {
              role: "teacher",
              label: "선생님",
              enabled: aiSettings.permission.teacher,
            },
            {
              role: "student",
              label: "학생",
              enabled: aiSettings.permission.student,
            },
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
      </section>

      <section className={style.section}>
        <h4 className={style.sectionTitle}>기본 지침</h4>
        <p className={style.sectionHint}>
          AI가 강의계획서를 작성·점검할 때 참고할 지침입니다. 「추천 템플릿」은
          학교·학기·양식 항목을 바탕으로 AI가 초안을 만듭니다. 3~8개 bullet,
          약 600자 이내를 권장합니다.
        </p>
        <textarea
          ref={guidelinesRef}
          className={style.textarea}
          defaultValue={aiSettings.guidelines}
          placeholder="예: 강의계획서는 학교의 교육 철학에 맞게 작성해주세요."
          disabled={isGeneratingTemplate}
        />
        <div className={style.actions}>
          <Button
            type="ghost"
            onClick={handleLoadGuidelinesTemplate}
            disabled={isGeneratingTemplate}
            loading={isGeneratingTemplate}
          >
            {isGeneratingTemplate ? "AI 생성 중..." : "추천 템플릿"}
          </Button>
          <Button
            type="ghost"
            onClick={handleSaveGuidelines}
            disabled={isGeneratingTemplate}
          >
            저장
          </Button>
        </div>
      </section>

      <section className={style.section}>
        <h4 className={style.sectionTitle}>모범 답안</h4>
        <p className={style.sectionHint}>
          이 학기 강의계획서를 모범으로 선택합니다. AI는 주제·활동명을 베끼지
          않고 분량·문체·구체성만 참고합니다. (최대 {MAX_EXAMPLE_SYLLABI}개)
        </p>

        {syllabiLoading ? (
          <p className={style.emptyNote}>강의계획서를 불러오는 중...</p>
        ) : seasonSyllabi.length === 0 ? (
          <p className={style.emptyNote}>
            이 학기에 등록된 강의계획서가 없습니다. 계획서가 개설된 뒤 다시
            선택해주세요.
          </p>
        ) : (
          <>
            <div className={style.listPanel}>
              {seasonSyllabi.map((s) => {
                const checked = selectedExampleIds.includes(s._id);
                return (
                  <label
                    key={s._id}
                    className={`${style.listRow} ${
                      checked ? style.listRowChecked : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      className={style.listCheck}
                      checked={checked}
                      onChange={() => toggleExampleSyllabus(s._id)}
                    />
                    <span>
                      <span className={style.listTitle}>
                        {s.classTitle || "(제목 없음)"}
                      </span>
                      <span className={style.listMeta}>
                        {" "}
                        · {s.userName || "작성자 미상"}
                        {s.subject?.length
                          ? ` · ${s.subject.filter(Boolean).join(" / ")}`
                          : ""}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>

            {selectedSyllabusMeta.length > 0 && (
              <div className={style.chipRow}>
                {selectedSyllabusMeta.map((s) => (
                  <span key={s._id} className={style.chip}>
                    {s.classTitle || "(제목 없음)"}
                  </span>
                ))}
              </div>
            )}

            <div className={style.actions}>
              <Button type="ghost" onClick={handleSaveExampleSyllabi}>
                모범 계획서 저장
              </Button>
            </div>
          </>
        )}
      </section>

      <section className={style.section}>
        <h4 className={style.sectionTitle}>참고 자료</h4>
        <p className={style.sectionHint}>
          AI가 강의계획서를 다룰 때 참고할 자료를 추가합니다.
        </p>

        {aiSettings.references.length > 0 && (
          <div className={style.tableWrap}>
            <Table
              type="object-array"
              data={aiSettings.references.map((ref, index) => ({
                ...ref,
                index,
                sourceType: ref.fileName ? "파일" : "직접 입력",
                download: ref.fileKey ? ref.fileName : "-",
              }))}
              header={[
                {
                  text: "제목",
                  key: "title",
                  type: "text",
                },
                {
                  text: "유형",
                  key: "sourceType",
                  type: "text",
                  width: "100px",
                  textAlign: "center",
                },
                {
                  text: "다운로드",
                  key: "download",
                  type: "button",
                  onClick: (e: any) => {
                    if (e.fileKey) handleDownloadReference(e.index);
                  },
                  width: "100px",
                  textAlign: "center",
                  btnStyle: {
                    border: true,
                    color: "blue",
                    padding: "4px",
                    round: true,
                  },
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

        <div className={style.refForm}>
          <div className={style.fieldBlock}>
            <label className={style.fieldLabel}>제목</label>
            <input
              className={style.input}
              type="text"
              value={newRefTitle}
              onChange={(e) => setNewRefTitle(e.target.value)}
              placeholder="참고 자료 제목"
            />
          </div>
          <div className={style.fieldBlock}>
            <label className={style.fieldLabel}>내용</label>
            <textarea
              className={style.fieldTextarea}
              value={newRefContent}
              onChange={(e) => setNewRefContent(e.target.value)}
              placeholder="참고 자료 내용"
            />
          </div>
          <div className={style.actionsSpread}>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt,.hwp"
                onChange={handleFileUpload}
                style={{ display: "none" }}
              />
              <Button
                type="ghost"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                style={{ marginRight: "8px" }}
              >
                {isUploading ? "업로드 중..." : "파일 업로드"}
              </Button>
              <span className={style.hintInline}>
                PDF, DOCX, TXT, HWP (최대 10MB)
              </span>
            </div>
            <Button type="ghost" onClick={handleAddReference}>
              직접 추가
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AISettings;
