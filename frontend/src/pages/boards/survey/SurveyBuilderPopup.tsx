import Popup from "components/popup/Popup";
import Button from "components/button/Button";
import SurveyBuilder from "./SurveyBuilder";
import { TSurvey } from "types/survey";

type Props = {
  setState: (state: boolean) => void;
  survey: TSurvey | null;
  onChange: (survey: TSurvey | null) => void;
  postId?: string;
};

const SurveyBuilderPopup = ({
  setState,
  survey,
  onChange,
  postId,
}: Props) => {
  return (
    <Popup
      setState={setState}
      title="설문 설정"
      closeBtn
      contentScroll
      style={{ maxWidth: "720px", width: "100%" }}
      footer={
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button type="ghost" onClick={() => setState(false)}>
            완료
          </Button>
        </div>
      }
    >
      <SurveyBuilder
        survey={survey}
        onChange={onChange}
        postId={postId}
        hideToggle
      />
    </Popup>
  );
};

export default SurveyBuilderPopup;
