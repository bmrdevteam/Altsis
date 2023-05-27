import Button from "components/button/Button";
import Callout from "components/callout/Callout";
import Input from "components/input/Input";
import Popup from "components/popup/Popup";
import { useAuth } from "contexts/authContext";
import useApi from "hooks/useApi";
import useGoogleAPI from "hooks/useGoogleAPI";
import { useEffect, useRef, useState } from "react";

type Props = {
  setState: any;
};

const description01 =
  "[ 구글 캘린더 - 내 캘린더의 설정 - 일정의 엑세스 권한 - 공개 사용 설정 ]";
const description02 = "[캘린더 통합 - 캘린더 ID]";
const description03 = "등록 후 새로고침";
const placeholder = "캘린더 ID";

const Index = (props: Props) => {
  const { currentUser, setCurrentUser } = useAuth();
  const { UserApi } = useApi();
  const { CalendarAPI } = useGoogleAPI();

  const calendarRef = useRef<string | undefined>();
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
      const { calendar } = await UserApi.UUserCalendar({
        calendar: calendarRef.current,
      });
      calendarRef.current = calendar;
      currentUser.calendar = calendar;
      setCurrentUser(currentUser);
      alert(SUCCESS_MESSAGE);
    } catch (err) {
      console.error(err);
      alert("에러가 발생했습니다.");
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
    <Popup
      setState={props.setState}
      style={{
        width: "480px",
        display: "flex",
        flexDirection: "column",
      }}
      closeBtn
      title={"캘린더 설정"}
      contentScroll
    >
      <div>
        <Callout
          style={{ marginBottom: "24px" }}
          type={"info"}
          title={"구글 캘린더 연동하기"}
          child={
            <ol>
              <li>{description01}</li>
              <li>{description02}</li>
              <li>{description03}</li>
            </ol>
          }
          showIcon
        />
        {!refresh && (
          <div style={{ marginTop: "24px" }}>
            <div style={{ display: "flex", gap: "12px" }}>
              <Input
                style={{ maxHeight: "30px" }}
                appearence="flat"
                label="내 캘린더"
                defaultValue={currentUser.calendar ?? ""}
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
                    alert("캘린더 공유 링크를 적어주세요");
                  } else {
                    updateSchoolCalendar();
                  }
                }}
              >
                {currentUser.calendar ? "수정" : "등록"}
              </Button>
              {currentUser.calendar && (
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
          </div>
        )}
      </div>
    </Popup>
  );
};

export default Index;
