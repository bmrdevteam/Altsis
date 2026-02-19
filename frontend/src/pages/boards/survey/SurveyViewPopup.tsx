import { useState } from "react";
import Popup from "components/popup/Popup";
import Button from "components/button/Button";
import SurveyRenderer from "./SurveyRenderer";
import SurveyResults from "./SurveyResults";
import style from "./survey.module.scss";
import { TPost } from "types/post";

type Props = {
  setState: (state: boolean) => void;
  post: TPost;
  surveyIndex: number;
  currentUserId: string;
  isAuthor: boolean;
  isManager: boolean;
};

const SurveyViewPopup = ({
  setState,
  post,
  surveyIndex,
  currentUserId,
  isAuthor,
  isManager,
}: Props) => {
  const [showResults, setShowResults] = useState(false);
  const survey = post.surveys[surveyIndex];

  if (!survey) return null;

  const surveyId = survey._id!;
  const canViewResults =
    isAuthor ||
    isManager ||
    survey.settings.showResults === "afterResponse";

  return (
    <Popup
      setState={setState}
      title={survey.title || "설문조사"}
      closeBtn
      contentScroll
      style={{ maxWidth: "720px", width: "100%" }}
      footer={
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button type="ghost" onClick={() => setState(false)}>
            닫기
          </Button>
        </div>
      }
    >
      <div>
        {survey.description && (
          <div className={style.surveyDescription}>{survey.description}</div>
        )}
        <div className={style.popupTabHeader}>
          <div className={style.tabContainer}>
            <button
              type="button"
              className={`${style.tab} ${
                !showResults ? style.tabActive : ""
              }`}
              onClick={() => setShowResults(false)}
            >
              설문 작성
            </button>
            <button
              type="button"
              className={`${style.tab} ${
                showResults ? style.tabActive : ""
              }`}
              onClick={() => setShowResults(true)}
            >
              결과 보기
            </button>
          </div>
          <span className={style.responseCount}>
            {survey.responseCount}명 응답
          </span>
        </div>

        {showResults ? (
          <SurveyResults
            post={post}
            survey={survey}
            surveyId={surveyId}
            canViewResults={canViewResults}
          />
        ) : (
          <SurveyRenderer
            post={post}
            survey={survey}
            surveyId={surveyId}
            currentUserId={currentUserId}
          />
        )}
      </div>
    </Popup>
  );
};

export default SurveyViewPopup;
