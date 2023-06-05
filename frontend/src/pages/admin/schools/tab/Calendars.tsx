import { useEffect, useRef, useState } from "react";
import style from "style/pages/archive.module.scss";

import Button from "components/button/Button";
import Callout from "components/callout/Callout";
import Input from "components/input/Input";
import Textarea from "components/textarea/Textarea";

import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import useGoogleAPI from "hooks/useGoogleAPI";

type Props = {
  schoolData: any;
  setSchoolData: any;
};

const description = `1. [ 구글 캘린더 - 내 캘린더의 설정 - 일정의 엑세스 권한 - 공개 사용 설정 ]
2. [캘린더 통합 - 캘린더 ID]`;

const description1 = "[ 일정 ]에서 조회됩니다.";
const description2 = "[일정 - 월 별로 보기]에서 조회됩니다.";
const placeholder = "캘린더 ID";

function Calendars(props: Props) {
  const { SchoolAPI } = useAPIv2();
  const { CalendarAPI } = useGoogleAPI();
  const calendarRef = useRef<string | undefined>(
    props.schoolData.calendar ?? ""
  );
  const calendarTimetableRef = useRef<string | undefined>(
    props.schoolData.calendarTimetableRef ?? ""
  );
  const [refresh, setRefresh] = useState<boolean>(false);

  const updateSchoolCalendar = async () => {
    try {
      if (calendarRef.current) {
        await CalendarAPI.RPublicEvents({
          calendarId: calendarRef.current,
          queries: {
            timeMin: new Date(2023, 0, 1).toISOString(),
            timeMax: new Date(2023, 0, 1).toISOString(),
          },
        });
      }
    } catch (err) {
      alert(
        "에러가 발생했습니다. 캘린더가 공개로 설정되어 있고 캘린더 ID가 유효한지 확인해주세요."
      );
      return;
    }
    try {
      const { calendar, calendarTimetable } = await SchoolAPI.USchoolCalendars({
        params: {
          _id: props.schoolData._id,
        },
        data: {
          calendar: calendarRef.current,
          calendarTimetable: props.schoolData.calendarTimetable,
        },
      });
      props.setSchoolData({ ...props.schoolData, calendar, calendarTimetable });
      alert(SUCCESS_MESSAGE);
    } catch (err) {
      ALERT_ERROR(err);
    } finally {
      setRefresh(true);
    }
  };

  const updateSchoolCalendarTimetable = async () => {
    try {
      if (calendarTimetableRef.current) {
        await CalendarAPI.RPublicEvents({
          calendarId: calendarTimetableRef.current,
          queries: {
            timeMin: new Date(2023, 0, 1).toISOString(),
            timeMax: new Date(2023, 0, 1).toISOString(),
          },
        });
      }
    } catch (err) {
      alert(
        "에러가 발생했습니다. 캘린더가 공개로 설정되어 있고 캘린더 ID가 유효한지 확인해주세요."
      );
      return;
    }
    try {
      const { calendar, calendarTimetable } = await SchoolAPI.USchoolCalendars({
        params: {
          _id: props.schoolData._id,
        },
        data: {
          calendar: props.schoolData.calendar,
          calendarTimetable: calendarTimetableRef.current,
        },
      });
      props.setSchoolData({ ...props.schoolData, calendar, calendarTimetable });
      alert(SUCCESS_MESSAGE);
    } catch (err) {
      ALERT_ERROR(err);
    } finally {
      setRefresh(true);
    }
  };

  useEffect(() => {
    if (refresh) {
      setRefresh(false);
    }

    return () => {};
  }, [refresh]);

  return (
    <div className={style.section} style={{ marginTop: "24px" }}>
      <Callout
        style={{ marginBottom: "24px" }}
        type={"info"}
        title={"구글 캘린더 연동하기"}
        child={
          <Textarea
            defaultValue={description}
            rows={3}
            style={{
              backgroundColor: "rgba(0, 0, 0, 0)",
              margin: "0px",
              padding: "0px",
            }}
            disabled
          />
        }
        showIcon
      />
      {!refresh && (
        <>
          <div style={{ marginTop: "24px" }}>
            <div style={{ display: "flex", gap: "12px" }}>
              <Input
                style={{ maxHeight: "30px" }}
                appearence="flat"
                label="학사 일정"
                defaultValue={props.schoolData.calendar ?? ""}
                onChange={(e: any) => {
                  calendarRef.current = e.target.value;
                }}
                placeholder={placeholder}
              />
              <Button
                type={"ghost"}
                style={{
                  borderRadius: "4px",
                  height: "32px",
                  marginTop: "20px",
                }}
                onClick={() => {
                  if (!calendarRef.current || calendarRef.current === "") {
                    alert("캘린더 ID를 적어주세요");
                  } else {
                    updateSchoolCalendar();
                  }
                }}
              >
                {props.schoolData.calendar ? "수정" : "등록"}
              </Button>
              {props.schoolData.calendar && (
                <Button
                  type={"ghost"}
                  style={{
                    borderRadius: "4px",
                    height: "32px",
                    marginTop: "20px",
                  }}
                  onClick={() => {
                    calendarRef.current = undefined;
                    updateSchoolCalendar();
                  }}
                >
                  삭제
                </Button>
              )}
            </div>
            <div className={style.description} style={{ margin: "4px" }}>
              {description1}
            </div>
          </div>
          <div style={{ marginTop: "32px" }}>
            <div style={{ display: "flex", gap: "12px" }}>
              <Input
                style={{ maxHeight: "30px" }}
                appearence="flat"
                label="시간표 일정"
                defaultValue={props.schoolData.calendarTimetable ?? ""}
                onChange={(e: any) => {
                  calendarTimetableRef.current = e.target.value;
                }}
                placeholder={placeholder}
              />

              <Button
                type={"ghost"}
                style={{
                  borderRadius: "4px",
                  height: "32px",
                  marginTop: "20px",
                }}
                onClick={() => {
                  if (
                    !calendarTimetableRef.current ||
                    calendarTimetableRef.current === ""
                  ) {
                    alert("캘린더 ID를 적어주세요");
                  } else {
                    updateSchoolCalendarTimetable();
                  }
                }}
              >
                {props.schoolData.calendarTimetable ? "수정" : "등록"}
              </Button>
              {props.schoolData.calendarTimetable && (
                <Button
                  type={"ghost"}
                  style={{
                    borderRadius: "4px",
                    height: "32px",
                    marginTop: "20px",
                  }}
                  onClick={() => {
                    calendarTimetableRef.current = undefined;
                    updateSchoolCalendarTimetable();
                  }}
                >
                  삭제
                </Button>
              )}
            </div>
            <div className={style.description} style={{ margin: "4px" }}>
              {description2}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default Calendars;
