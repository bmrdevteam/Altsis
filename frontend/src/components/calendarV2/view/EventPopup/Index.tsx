import {
  DateItem,
  EventItem,
  From,
  Type,
} from "components/calendarV2/calendarData";
import Input from "components/input/Input";
import Popup from "components/popup/Popup";
import Textarea from "components/textarea/Textarea";
import style from "./style.module.scss";
import Divider from "components/divider/Divider";
import Svg from "assets/svg/Svg";

type Props = {
  setState: any;
  event: EventItem;
};

const Description = ({ event }: { event: EventItem }) => {
  switch (event.from) {
    case "myCalendar":
      return (
        <div className={style.description}>
          {"내 캘린더에서 가져온 일정입니다. "}
          <a target="_blank" rel="noreferrer" href={event.htmlLink}>
            <div className={style.svg}>
              <Svg type={"edit"} style={{ width: "12px", height: "12px" }} />
            </div>
          </a>
        </div>
      );
    case "schoolCalendar":
      return <div className={style.description}>{"학사 일정입니다."}</div>;
    case "schoolCalendarTimetable":
      return (
        <div className={style.description}>{"기본 시간표 일정입니다."}</div>
      );
    case "enrollments":
      return (
        <div className={style.description}>
          {"수강 중인 수업입니다."}
          <div
            className={style.svg}
            onClick={() => {
              window.open("/courses/enrolled/" + event.id, "_blank");
            }}
          >
            <Svg type={"bookOpen"} style={{ width: "12px", height: "12px" }} />
          </div>
        </div>
      );

    case "mentorings":
      return (
        <div className={style.description}>
          {"담당 수업입니다."}
          <div
            className={style.svg}
            onClick={() => {
              window.open("/courses/mentoring/" + event.id, "_blank");
            }}
          >
            <Svg type={"bookOpen"} style={{ width: "12px", height: "12px" }} />
          </div>
        </div>
      );
  }
  return <></>;
};

const GoogleEvent = (props: {}) => {};

const Index = (props: Props) => {
  return (
    <Popup
      setState={props.setState}
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
        <div className={style.content}>
          {props.event.type === "google" ? (
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
                label={props.event.type === "google" ? "장소" : "강의실"}
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
        <Description event={props.event} />
      </div>
    </Popup>
  );
};

export default Index;
