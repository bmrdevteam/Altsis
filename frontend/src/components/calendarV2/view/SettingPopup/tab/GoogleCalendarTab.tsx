import { useEffect, useRef, useState } from "react";

import useAPIv2 from "hooks/useAPIv2";
import useGoogleAPI from "hooks/useGoogleAPI";

import Button from "components/button/Button";
import Callout from "components/callout/Callout";
import Input from "components/input/Input";
import { useAuth } from "contexts/authContext";
import Textarea from "components/textarea/Textarea";

type Props = {};

const description = `1. [구글 캘린더 - 내 캘린더의 설정 - 일정의 엑세스 권한 - 공개 사용 설정 체크]
2. [캘린더 통합 - 캘린더 ID 복사]
3. 등록 후 새로고침(F5)
`;
const placeholder = "캘린더 ID";

const Index = (props: Props) => {
  const { currentUser, setCurrentUser } = useAuth();
  const { UserAPI } = useAPIv2();
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
      const { calendar } = await UserAPI.UUserCalendar({
        data: {
          calendar: calendarRef.current,
        },
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
    <div style={{ marginTop: "24px" }}>
      <Callout
        style={{ marginBottom: "24px" }}
        type={"info"}
        title={"구글 캘린더 연동하기"}
        child={
          <Textarea
            defaultValue={description}
            rows={5}
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
  );
};

export default Index;
