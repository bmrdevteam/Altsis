import { useEffect, useState } from "react";
import style from "./survey.module.scss";
import Button from "components/button/Button";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import { TPost } from "types/post";
import {
  TSurvey,
  TSurveyStats,
  TSurveyResponse,
  TSurveyQuestion,
  TSurveyQuestionStats,
} from "types/survey";

type Props = {
  post: TPost;
  survey: TSurvey;
  surveyId: string;
  canViewResults: boolean;
};

const SurveyResults = ({ post, survey, surveyId, canViewResults }: Props) => {
  const { SurveyResponseAPI } = useAPIv2();
  const [stats, setStats] = useState<TSurveyStats | null>(null);
  const [responses, setResponses] = useState<TSurveyResponse[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showTextFor, setShowTextFor] = useState<string | null>(null);

  useEffect(() => {
    if (!canViewResults) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    SurveyResponseAPI.RSurveyStats({ query: { post: post._id, surveyId } })
      .then(({ stats }) => {
        setStats(stats);
        setIsLoading(false);
      })
      .catch((err) => {
        ALERT_ERROR(err);
        setIsLoading(false);
      });
  }, [post._id, canViewResults]);

  const loadTextResponses = (questionId: string) => {
    if (showTextFor === questionId) {
      setShowTextFor(null);
      return;
    }

    if (!responses) {
      SurveyResponseAPI.RSurveyResponses({ query: { post: post._id, surveyId } })
        .then(({ surveyResponses }) => {
          setResponses(surveyResponses);
          setShowTextFor(questionId);
        })
        .catch(ALERT_ERROR);
    } else {
      setShowTextFor(questionId);
    }
  };

  const loadAllResponses = () => {
    if (responses) return Promise.resolve(responses);
    return SurveyResponseAPI.RSurveyResponses({ query: { post: post._id, surveyId } })
      .then(({ surveyResponses }) => {
        setResponses(surveyResponses);
        return surveyResponses as TSurveyResponse[];
      });
  };

  const handleExportCSV = async () => {
    try {
      const allResponses = await loadAllResponses();
      if (!allResponses || allResponses.length === 0) {
        alert("내보낼 응답이 없습니다.");
        return;
      }

      const headers = [
        "응답자",
        "응답일시",
        ...survey.questions.map((q) => q.title),
      ];

      const rows = allResponses.map((r) => {
        const respondent = r.respondentName || "익명";
        const date = new Date(r.createdAt).toLocaleString("ko-KR");
        const answerCells = survey.questions.map((q) => {
          const a = r.answers.find((a) => a.questionId === q.id);
          if (!a) return "";

          if (q.type === "fileUpload") {
            return (a.files || []).map((f) => f.fileName).join(", ");
          }

          if (q.type === "singleChoice" || q.type === "dropdown") {
            const opt = q.options?.find((o) => o.id === a.value);
            return opt?.text || String(a.value || "");
          }

          if (q.type === "multipleChoice" && Array.isArray(a.value)) {
            return (a.value as string[])
              .map((v) => q.options?.find((o) => o.id === v)?.text || v)
              .join(", ");
          }

          return String(a.value ?? "");
        });

        return [respondent, date, ...answerCells];
      });

      const escapeCSV = (val: string) => {
        if (val.includes(",") || val.includes('"') || val.includes("\n")) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      };

      const BOM = "\uFEFF";
      const csvContent =
        BOM +
        [headers.map(escapeCSV).join(",")]
          .concat(rows.map((row) => row.map(escapeCSV).join(",")))
          .join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `설문결과_${survey.title || post.title || "survey"}_${
        new Date().toISOString().slice(0, 10)
      }.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  if (isLoading) {
    return <div className={style.noResultsMessage}>결과 로드 중...</div>;
  }

  if (!canViewResults) {
    return (
      <div className={style.noResultsMessage}>
        {survey.settings.showResults === "afterResponse"
          ? "설문에 응답하면 결과를 볼 수 있습니다."
          : "결과는 작성자만 볼 수 있습니다."}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div>
      <div className={style.resultSummaryBar}>
        <span className={style.resultSummaryText}>
          총 <strong>{stats.totalResponses}</strong>명 응답
        </span>
        <Button
          type="hover"
          onClick={handleExportCSV}
          style={{ fontSize: "13px", padding: "5px 12px" }}
        >
          CSV 내보내기
        </Button>
      </div>

      {survey.questions.map((q) => {
        const qStats = stats.questionStats.find((s) => s.questionId === q.id);
        if (!qStats) return null;

        return (
          <div key={q.id} className={style.resultQuestion}>
            <div className={style.resultQuestionHeader}>
              <span className={style.resultTitle}>{q.title}</span>
              <span className={style.resultAnswerCount}>
                {qStats.totalAnswers}명 응답
              </span>
            </div>

            {(q.type === "singleChoice" ||
              q.type === "multipleChoice" ||
              q.type === "dropdown") && (
              <ChoiceResult question={q} qStats={qStats} total={stats.totalResponses} />
            )}

            {q.type === "rating" && <RatingResult qStats={qStats} />}

            {q.type === "linearScale" && (
              <ScaleResult question={q} qStats={qStats} />
            )}

            {(q.type === "shortText" || q.type === "longText" || q.type === "date") && (
              <TextResult
                qStats={qStats}
                questionId={q.id}
                responses={responses}
                showTextFor={showTextFor}
                onToggle={() => loadTextResponses(q.id)}
              />
            )}

            {q.type === "fileUpload" && (
              <div>
                <div className={style.textResponseCount}>
                  {qStats.totalFiles || 0}개 파일
                </div>
                <button
                  type="button"
                  className={style.responseToggleBtn}
                  onClick={() => loadTextResponses(q.id)}
                >
                  {showTextFor === q.id ? "닫기" : "파일 보기"}
                </button>
                {showTextFor === q.id && responses && (
                  <FileResponseList
                    responses={responses}
                    questionId={q.id}
                  />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

/* ─── 선택형 결과 (가로 막대 차트) ─── */

const ChoiceResult = ({
  question,
  qStats,
  total,
}: {
  question: TSurveyQuestion;
  qStats: TSurveyQuestionStats;
  total: number;
}) => {
  const maxCount = Math.max(
    ...(question.options || []).map(
      (opt) => qStats.optionCounts?.find((o) => o.optionId === opt.id)?.count || 0
    ),
    1
  );

  return (
    <div className={style.barChartContainer}>
      {(question.options || []).map((opt) => {
        const count =
          qStats.optionCounts?.find((o) => o.optionId === opt.id)?.count || 0;
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        const isMax = count === maxCount && count > 0;

        return (
          <div key={opt.id} className={style.barRow}>
            <div className={style.barRowTop}>
              <span className={style.barLabel} title={opt.text}>
                {opt.text}
              </span>
              <span className={style.barValue}>
                {count}명 ({pct}%)
              </span>
            </div>
            <div className={style.barTrack}>
              <div
                className={`${style.barFill} ${isMax ? style.barFillMax : ""}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ─── 평점 결과 ─── */

const RatingResult = ({ qStats }: { qStats: TSurveyQuestionStats }) => {
  const total = qStats.totalAnswers;

  return (
    <div>
      <div className={style.averageDisplay}>
        <span className={style.averageNumber}>
          {(qStats.average || 0).toFixed(1)}
        </span>
        <div className={style.averageRight}>
          <div className={style.starGroup}>
            {[1, 2, 3, 4, 5].map((v) => (
              <span
                key={v}
                className={`${style.resultStar} ${
                  (qStats.average || 0) >= v ? style.active : ""
                }`}
              >
                ★
              </span>
            ))}
          </div>
          <span className={style.averageLabel}>{total}명 응답</span>
        </div>
      </div>
      <div className={style.barChartContainer}>
        {(qStats.distribution || []).map(({ value, count }) => {
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <div key={value} className={style.barRow}>
              <div className={style.barRowTop}>
                <span className={style.barLabel}>{value}점</span>
                <span className={style.barValue}>
                  {count}명 ({pct}%)
                </span>
              </div>
              <div className={style.barTrack}>
                <div className={style.barFill} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ─── 선형 배율 결과 ─── */

const ScaleResult = ({
  question,
  qStats,
}: {
  question: TSurveyQuestion;
  qStats: TSurveyQuestionStats;
}) => {
  const total = qStats.totalAnswers;

  return (
    <div>
      <div className={style.averageDisplay}>
        <span className={style.averageNumber}>
          {(qStats.average || 0).toFixed(1)}
        </span>
        <span className={style.averageLabel}>
          / {question.scaleMax || 5} ({total}명 응답)
        </span>
      </div>
      <div className={style.barChartContainer}>
        {(qStats.distribution || []).map(({ value, count }) => {
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <div key={value} className={style.barRow}>
              <div className={style.barRowTop}>
                <span className={style.barLabel}>{value}</span>
                <span className={style.barValue}>
                  {count}명 ({pct}%)
                </span>
              </div>
              <div className={style.barTrack}>
                <div className={style.barFill} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ─── 텍스트 응답 결과 ─── */

const TextResult = ({
  qStats,
  questionId,
  responses,
  showTextFor,
  onToggle,
}: {
  qStats: TSurveyQuestionStats;
  questionId: string;
  responses: TSurveyResponse[] | null;
  showTextFor: string | null;
  onToggle: () => void;
}) => {
  const isExpanded = showTextFor === questionId;
  const filteredResponses = responses?.filter((r) =>
    r.answers.find((a) => a.questionId === questionId)
  );

  return (
    <div>
      <div className={style.textResponseCount}>
        {qStats.totalAnswers}개 응답
      </div>

      {/* 미리보기 (접힌 상태에서 최대 2개) */}
      {!isExpanded && filteredResponses && filteredResponses.length > 0 && (
        <div className={style.textPreviewList}>
          {filteredResponses.slice(0, 2).map((r) => {
            const a = r.answers.find((a) => a.questionId === questionId);
            return (
              <div key={r._id} className={style.textResponseItem}>
                {String(a?.value || "")}
              </div>
            );
          })}
        </div>
      )}

      <button
        type="button"
        className={style.responseToggleBtn}
        onClick={onToggle}
      >
        {isExpanded
          ? "닫기"
          : filteredResponses && filteredResponses.length > 2
          ? `전체 응답 보기 (${qStats.totalAnswers}개)`
          : "응답 보기"}
      </button>

      {isExpanded && responses && (
        <div className={style.textResponseList} style={{ marginTop: "8px" }}>
          {(filteredResponses || []).map((r) => {
            const a = r.answers.find((a) => a.questionId === questionId);
            return (
              <div key={r._id} className={style.textResponseItem}>
                {String(a?.value || "")}
                {r.respondentName && (
                  <div className={style.respondentName}>
                    - {r.respondentName}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ─── 파일 응답 목록 ─── */

const FileResponseList = ({
  responses,
  questionId,
}: {
  responses: TSurveyResponse[];
  questionId: string;
}) => {
  const { SurveyResponseAPI } = useAPIv2();

  const handleDownload = async (file: { key: string; fileName: string }) => {
    try {
      const { preSignedUrl } = await SurveyResponseAPI.RSurveyFileSignedUrl({
        query: { key: file.key, fileName: file.fileName },
      });
      window.open(preSignedUrl, "_blank");
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  return (
    <div className={style.textResponseList} style={{ marginTop: "8px" }}>
      {responses
        .filter((r) => {
          const a = r.answers.find((a) => a.questionId === questionId);
          return a?.files && a.files.length > 0;
        })
        .map((r) => {
          const a = r.answers.find((a) => a.questionId === questionId)!;
          return (
            <div key={r._id} className={style.textResponseItem}>
              {(a.files || []).map((f) => (
                <div key={f.key} style={{ marginBottom: "4px" }}>
                  <span
                    className={style.fileDownloadLink}
                    onClick={() => handleDownload(f)}
                  >
                    {f.fileName}
                  </span>
                  <span className={style.fileDownloadSize}>
                    ({Math.round(f.fileSize / 1024)}KB)
                  </span>
                </div>
              ))}
              {r.respondentName && (
                <div className={style.respondentName}>- {r.respondentName}</div>
              )}
            </div>
          );
        })}
    </div>
  );
};

export default SurveyResults;
