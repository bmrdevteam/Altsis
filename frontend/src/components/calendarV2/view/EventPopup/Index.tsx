import {
  DateItem,
  EventItem,
  From,
  Type,
  resolveEventColor,
} from "components/calendarV2/calendarData";
import Input from "components/input/Input";
import Popup from "components/popup/Popup";
import Textarea from "components/textarea/Textarea";
import style from "./style.module.scss";
import Divider from "components/divider/Divider";
import Svg from "assets/svg/Svg";
import Button from "components/button/Button";
import { useAuth } from "contexts/authContext";
import { useAppNavigate } from "hooks/useAppNavigate";
import { canManageSchoolCalendar } from "components/calendarV2/calendarAuth";

type Props = {
  setPopupActive: any;
  event: EventItem;
  onDelete?: (eventId: string) => void;
  onEdit?: (event: EventItem) => void;
  readOnly?: boolean;
  customCategoryColors?: Record<string, string>;
};

const getSourceLink = (
  event: EventItem,
  readOnly?: boolean
): { label: string; url: string } | null => {
  if (event.sourceType === "enrollment" && event.sourceId) {
    if (readOnly && event.syllabusId) {
      return {
        label: "학습계획서 보기",
        url: `/courses/mentoring/${event.syllabusId}`,
      };
    }
    const parts = event.sourceId.split("_");
    const enrollmentId = parts[1];
    return { label: "수강 수업 보기", url: `/courses/enrolled/${enrollmentId}` };
  }
  if (event.sourceType === "syllabus" && event.sourceId) {
    const parts = event.sourceId.split("_");
    const syllabusId = parts[1];
    return { label: "담당 수업 보기", url: `/courses/mentoring/${syllabusId}` };
  }
  // Legacy support via `from` field
  if (event.from === "enrollments" && event.id) {
    return { label: "수강 수업 보기", url: `/courses/enrolled/${event.id}` };
  }
  if (event.from === "mentorings" && event.id) {
    return { label: "담당 수업 보기", url: `/courses/mentoring/${event.id}` };
  }
  return null;
};

const Description = ({
  event,
  readOnly,
}: {
  event: EventItem;
  readOnly?: boolean;
}) => {
  const navigate = useAppNavigate();
  const sourceLink = getSourceLink(event, readOnly);

  if (event.sourceType === "enrollment" || event.from === "enrollments") {
    return (
      <div className={style.description}>
        {"수강 중인 수업입니다."}
        {sourceLink && (
          <div
            className={style.svg}
            onClick={() => navigate(sourceLink.url)}
          >
            <Svg type={"bookOpen"} style={{ width: "12px", height: "12px" }} />
          </div>
        )}
      </div>
    );
  }

  if (event.sourceType === "syllabus" || event.from === "mentorings") {
    return (
      <div className={style.description}>
        {"담당 수업입니다."}
        {sourceLink && (
          <div
            className={style.svg}
            onClick={() => navigate(sourceLink.url)}
          >
            <Svg type={"bookOpen"} style={{ width: "12px", height: "12px" }} />
          </div>
        )}
      </div>
    );
  }

  if (event.sourceType === "memo") {
    return <div className={style.description}>{"메모 일정입니다."}</div>;
  }

  if (event.from === "schoolCalendar") {
    return <div className={style.description}>{"학교 캘린더 일정입니다."}</div>;
  }

  if (event.from === "personalCalendar") {
    return <div className={style.description}>{"개인 캘린더 일정입니다."}</div>;
  }

  return <></>;
};

const Index = (props: Props) => {
  const { currentUser } = useAuth();
  const isOwner =
    props.event.userId && String(props.event.userId) === String(currentUser?._id);

  const isSyncedEvent =
    props.event.sourceType === "enrollment" ||
    props.event.sourceType === "syllabus";

  const canModify =
    !props.readOnly &&
    props.event.type === "custom" &&
    !isSyncedEvent &&
    (props.event.scope === "school"
      ? canManageSchoolCalendar(currentUser)
      : isOwner);

  const eventColor = resolveEventColor(props.event, props.customCategoryColors);

  return (
    <Popup
      setState={props.setPopupActive}
      style={{
        width: "480px",
        display: "flex",
        flexDirection: "column",
      }}
      closeBtn
      title={props.event.title}
      contentScroll
    >
      <div className={style.section}>
        <div
          style={{
            width: "100%",
            height: "4px",
            backgroundColor: eventColor,
            borderRadius: "2px",
            marginBottom: "12px",
          }}
        />
        <div className={style.content}>
          {props.event.type === "custom" ? (
            <div
              className={style.row}
              style={{
                display: "flex",
                gap: "12px",
                alignItems: "center",
              }}
            >
              <Input
                label="시작"
                type="text"
                appearence="flat"
                defaultValue={`${props.event.startTimeText}`}
                disabled
              />
              <Input
                label="종료"
                type="text"
                appearence="flat"
                defaultValue={`${props.event.endTimeText}`}
                disabled
              />
            </div>
          ) : (
            <div
              className={style.row}
              style={{
                display: "flex",
                gap: "12px",
                alignItems: "flex-end",
              }}
            >
              <Input
                type="text"
                label="시간"
                appearence="flat"
                defaultValue={new DateItem({
                  text: props.event.startTimeText,
                }).getDayString()}
                disabled
              />

              <div
                style={{ display: "flex", gap: "12px", alignItems: "center" }}
              >
                <Input
                  type="time"
                  appearence="flat"
                  defaultValue={props.event.startTimeText.split(" ")[1]}
                  disabled
                />
                ~
                <Input
                  type="time"
                  appearence="flat"
                  defaultValue={props.event.endTimeText.split(" ")[1]}
                  disabled
                />
              </div>
            </div>
          )}
          {props.event.location && (
            <div
              className={style.row}
              style={{
                display: "flex",
                gap: "12px",
                alignItems: "center",
                flexGrow: "2",
              }}
            >
              <Input
                label={props.event.type === "custom" ? "장소" : "강의실"}
                type="text"
                appearence="flat"
                defaultValue={props.event.location}
                disabled
              />
            </div>
          )}

          {props.event.description && (
            <div className={style.row}>
              <Textarea
                label="설명"
                rows={3}
                defaultValue={props.event.description}
                disabled
              />
            </div>
          )}
        </div>
        <Divider />
        <Description event={props.event} readOnly={props.readOnly} />

        {canModify && (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "8px",
              marginTop: "4px",
            }}
          >
            <Button
              type="ghost"
              onClick={() => {
                if (props.onEdit) {
                  props.onEdit(props.event);
                }
              }}
            >
              수정
            </Button>
            <Button
              type="ghost"
              onClick={() => {
                if (
                  props.event.eventId &&
                  props.onDelete &&
                  window.confirm("이 일정을 삭제하시겠습니까?")
                ) {
                  props.onDelete(props.event.eventId);
                }
              }}
              style={{ color: "#ea4335" }}
            >
              삭제
            </Button>
          </div>
        )}
      </div>
    </Popup>
  );
};

export default Index;
