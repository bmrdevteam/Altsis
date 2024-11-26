import React, { useEffect, useRef, useState } from "react";
import style from "./schedule.module.scss";
import { create } from "zustand";
import useGenerateId from "hooks/useGenerateId";
import Svg from "assets/svg/Svg";
import { useAuth } from "contexts/authContext";
import Select from "components/select/Select";
import Input from "components/input/Input";
import Textarea from "components/textarea/Textarea";
import Popup from "components/popup/Popup";
import Button from "components/button/Button";
import useApi from "hooks/useApi";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";

type TEvent = {
  id: string;
  day: string;
  title: string;
  type: string;
  classroom?: string;
  startTime: string;
  endTime: string;
  memo?: string;
  _id: string;
};

interface ICalendarState {
  events: TEvent[];
  addEvent: (
    type: string,
    day: string,
    startTime: string,
    endTime: string,
    _id: string
  ) => void;
  setEvents: (events: TEvent[]) => void;
  editor: boolean;
  setEditor: (to: boolean) => void;
  currentEvent: TEvent | undefined;
  setCurrentEvent: (id: string) => void;
}

const useStore = create<ICalendarState>()((set) => {
  const idGen = useGenerateId;
  return {
    events: [],
    editor: false,
    setEditor: (to: boolean) =>
      set((state) => ({
        editor: to,
      })),
    addEvent: (type, day, startTime, endTime, _id) =>
      set((state) => ({
        events: [
          ...state.events,
          {
            id: idGen(12),
            day: day,
            title: "",
            type: type,
            startTime: startTime,
            endTime: endTime,
            _id: _id,
          },
        ],
      })),
    setEvents: (events) =>
      set((state) => ({
        events: events,
      })),
    currentEvent: undefined,
    setCurrentEvent: (id: string) =>
      set((state) => ({
        currentEvent: state.events.filter((val) => val.id === id)[0],
      })),
  };
});
const RowFunction = ({ day }: { day: string }) => {
  const { addEvent } = useStore();
  return (
    <div className={style.row_function}>
      {Array.from(Array(24).keys()).map((val) => {
        return (
          <div
            key={val}
            className={style.block}
            onClick={() => {
              // addEvent(day, `${val}:00`, `${val + 1}:00`);
            }}
          ></div>
        );
      })}
    </div>
  );
};
const EventEditor = ({ mode = "edit" }: { mode?: "edit" | "view" }) => {
  const { editor, setEditor, currentEvent } = useStore();
  const { currentSeason, currentRegistration, reloadRegistration } = useAuth();
  const { RegistrationApi } = useApi();
  const { EnrollmentAPI } = useAPIv2();

  const today = new Date();

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [title, setTitle] = useState<string>("");
  const [day, setDay] = useState<string>("");
  const [start, setStart] = useState<string>();
  const [end, setEnd] = useState<string>();
  const [classroom, setClassroom] = useState<string>("");
  const [memo, setMemo] = useState<string>("");

  const days = ["일", "월", "화", "수", "목", "금", "토"];

  async function update() {
    setTitle(currentEvent?.title || "");
    setDay(currentEvent?.day || days[today.getDay()]);
    setStart(currentEvent?.startTime);
    setEnd(currentEvent?.endTime);
    setClassroom(currentEvent?.classroom || "");
    setMemo(currentEvent?.memo || "");
  }

  useEffect(() => {
    setIsLoading(true);
  }, [currentEvent]);

  useEffect(() => {
    if (isLoading) {
      update().then(() => setIsLoading(false));
    }
  }, [isLoading]);

  return editor && !isLoading ? (
    <Popup
      setState={setEditor}
      style={{
        width: "640px",
        display: "flex",
        flexDirection: "column",
      }}
      closeBtn
      title={currentEvent?.title || "일정 추가"}
      contentScroll
      footer={
        mode === "edit" ? (
          <div>
            <Button
              type={"ghost"}
              onClick={() => {
                if (
                  currentEvent?.type === "course" &&
                  currentEvent?._id !== ""
                ) {
                  EnrollmentAPI.UEnrollmentMemo({
                    params: {
                      _id: currentEvent._id,
                    },
                    data: { memo },
                  })
                    .then(async () => {
                      reloadRegistration();
                    })
                    .then(() => {
                      alert(SUCCESS_MESSAGE);
                      setEditor(false);
                    })
                    .catch((err) => {
                      ALERT_ERROR(err);
                    });
                } else {
                  if (!title) alert("제목을 입력해주세요");
                  else if (!day || !start || !end) alert("시간을 선택해주세요");
                  else {
                    if (currentEvent) {
                      RegistrationApi.UMemo({
                        _id: currentEvent._id,
                        rid: currentRegistration?._id,
                        memo: { title, day, start, end, classroom, memo },
                      })
                        .then((res) => {
                          reloadRegistration();
                        })
                        .then(() => {
                          alert(SUCCESS_MESSAGE);
                          setEditor(false);
                        })
                        .catch((err) => alert("error!"));
                    } else {
                      RegistrationApi.CMemo({
                        rid: currentRegistration?._id,
                        memo: { title, day, start, end, classroom, memo },
                      })
                        .then((res) => {
                          reloadRegistration();
                        })
                        .then(() => {
                          alert(SUCCESS_MESSAGE);
                          setEditor(false);
                        })
                        .catch((err) => alert("error!"));
                    }
                  }
                }
              }}
              style={{
                borderRadius: "4px",
                height: "32px",
                boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
              }}
            >
              {currentEvent ? "수정" : "추가"}
            </Button>
            {currentEvent?.type !== "course" && currentEvent?._id ? (
              <Button
                type={"ghost"}
                onClick={() => {
                  RegistrationApi.DMemo({
                    _id: currentEvent._id,
                    rid: currentRegistration?._id,
                  })
                    .then((res) => {
                      reloadRegistration();
                    })
                    .then(() => {
                      alert(SUCCESS_MESSAGE);
                      setEditor(false);
                    })
                    .catch((err) => alert("error!"));
                }}
                style={{
                  borderRadius: "4px",
                  height: "32px",
                  boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
                  marginTop: "12px",
                }}
              >
                삭제
              </Button>
            ) : (
              <></>
            )}
          </div>
        ) : (
          <></>
        )
      }
    >
      {currentEvent?.type !== "course" ? (
        <Input
          appearence="flat"
          type="text"
          defaultValue={title}
          label="제목"
          required
          onChange={(e: any) => {
            setTitle(e.target.value);
          }}
          style={{ marginBottom: "24px" }}
          disabled={mode !== "edit"}
        />
      ) : (
        <></>
      )}

      <div
        style={{
          display: "flex",
          gap: "12px",
          alignItems: "flex-end",
        }}
      >
        {currentEvent?.type === "course" ? (
          <Input
            type="text"
            label="시간"
            appearence="flat"
            defaultValue={classroom}
            disabled
          />
        ) : mode === "edit" ? (
          <Select
            required
            label={"시간"}
            defaultSelectedValue={day}
            options={days.map((day: string) => {
              return { text: day, value: day };
            })}
            onChange={(e: any) => {
              setDay(e);
            }}
            appearence="flat"
          />
        ) : (
          <Input
            appearence="flat"
            required
            label={"시간"}
            defaultValue={day}
            disabled
          />
        )}

        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <Input
            type="time"
            appearence="flat"
            defaultValue={start}
            onChange={(e: any) => setStart(e.target.value)}
            disabled={currentEvent?.type === "course" || mode !== "edit"}
          />
          ~
          <Input
            type="time"
            appearence="flat"
            defaultValue={end}
            onChange={(e: any) => setEnd(e.target.value)}
            disabled={currentEvent?.type === "course" || mode !== "edit"}
          />
        </div>
      </div>

      <div style={{ marginTop: "24px" }}>
        {currentEvent?.type === "course" ? (
          <Input
            type="text"
            label="강의실"
            appearence="flat"
            defaultValue={classroom}
            disabled
          />
        ) : mode === "edit" ? (
          <Select
            label="강의실"
            options={[
              { text: "없음", value: "" },
              ...currentSeason?.classrooms.map((classroom: string) => {
                return { text: classroom, value: classroom };
              }),
            ]}
            onChange={(e: string) => {
              setClassroom(e);
            }}
            appearence="flat"
          />
        ) : (
          <Input
            appearence="flat"
            label="강의실"
            defaultValue={classroom}
            disabled
          />
        )}
      </div>

      <div style={{ marginTop: "24px" }}>
        <Textarea
          label="메모"
          rows={10}
          defaultValue={memo}
          onChange={(e: any) => {
            setMemo(e.target.value);
          }}
          disabled={mode !== "edit"}
        />
      </div>
      <div className={style.row}></div>
    </Popup>
  ) : (
    <></>
  );
};
const Event = ({ data }: { data: TEvent }) => {
  const { setEditor, setCurrentEvent } = useStore();

  const startTime = data.startTime || "00:00";
  const endTime = data.endTime || "00:00";

  const start =
    parseInt(startTime.split(":")[0]) +
    parseInt(startTime.split(":")[1]) / 60;
  const end =
    parseInt(endTime.split(":")[0]) +
    parseInt(endTime.split(":")[1]) / 60;
  const height = end - start;

  return (
    <div
      className={style.event}
      style={{
        top: `${start * 80}px`,
        height: `${height * 80}px`,
      }}
      onClick={() => {
        setCurrentEvent(data.id?.slice(0, 23));
        setEditor(true);
      }}
    >
      <div className={style.title}>
        {(data.title || data.title === " ") ?? "제목 없음"}
      </div>
      {data.classroom && <div className={style.room}>{data.classroom}</div>}
      <div className={style.time}>
        {data.startTime}
        {" ~ "}
        {data.endTime}
      </div>
    </div>
  );
};

const EventContainer = ({ day }: { day: string }) => {
  const { events } = useStore();
  const filteredEvents = events.filter((val) => val.day === day);
  return (
    <div className={style.event_container}>
      {filteredEvents.map((val) => {
        return <Event key={val.id} data={val} />;
      })}
    </div>
  );
};

const CurrentTime = () => {
  const [, update] = useState({});
  const currentTimeRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    currentTimeRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "nearest",
    });

    const timer = setInterval(() => {
      update({});
    }, 10000);
    return () => {
      clearInterval(timer);
    };
  }, []);

  const today = new Date();
  const currentTime = today.getHours() + today.getMinutes() / 60;

  return (
    <div
      ref={currentTimeRef}
      className={style.current_time}
      style={{ top: `${currentTime * 80}px` }}
    >
      <div className={style.time}>{``}</div>
      <div className={style.indicator}></div>
    </div>
  );
};
const RowGrid = ({ day }: { day: string }) => {
  return (
    <div className={style.row_grid}>
      {Array.from(Array(24).keys()).map((val) => {
        return <div key={val} className={style.block}></div>;
      })}
    </div>
  );
};
function Schedule({
  defaultEvents,
  title,
  dayArray,
  mode = "edit",
}: {
  defaultEvents?: TEvent[];
  title: string;
  dayArray: Array<"일" | "월" | "화" | "수" | "목" | "금" | "토">;
  mode?: "edit" | "view";
}) {
  const { setEvents, setEditor, setCurrentEvent } = useStore();
  const today = new Date();

  useEffect(() => {
    defaultEvents && setEvents(defaultEvents);
  }, [defaultEvents]);

  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div className={style.calendar_container}>
      <div className={style.header}>
        <div className={style.controls}>
          <div className={style.title}>{title}</div>
          <div style={{ flex: "1 1 0" }}></div>
          {mode === "edit" && (
            <div
              className={style.btn}
              onClick={() => {
                setCurrentEvent("");
                setEditor(true);
              }}
            >
              일정추가
            </div>
          )}
          {/* <div>
            <Svg type={"chevronLeft"} width={"24px"} height={"24px"} />
          </div>
          <div>{}</div>
          <div>
            <Svg type={"chevronRight"} width={"24px"} height={"24px"} />
          </div> */}
          <div>
            <Svg type={"horizontalDots"} width={"24px"} height={"18px"} />
          </div>
        </div>
        <div className={style.days}>
          <div style={{ minWidth: "80px", maxWidth: "80px" }}></div>
          {dayArray.map((val) => {
            return (
              <div key={val} className={style.day}>
                {val}
              </div>
            );
          })}
        </div>
      </div>
      <div className={style.calendar}>
        <div className={style.time_labels}>
          <div className={style.label}>0:00 AM</div>
          <div className={style.label}>1:00 AM</div>
          <div className={style.label}>2:00 AM</div>
          <div className={style.label}>3:00 AM</div>
          <div className={style.label}>4:00 AM</div>
          <div className={style.label}>5:00 AM</div>
          <div className={style.label}>6:00 AM</div>
          <div className={style.label}>7:00 AM</div>
          <div className={style.label}>8:00 AM</div>
          <div className={style.label}>9:00 AM</div>
          <div className={style.label}>10:00 AM</div>
          <div className={style.label}>11:00 AM</div>
          <div className={style.label}>12:00 PM</div>
          <div className={style.label}>1:00 PM</div>
          <div className={style.label}>2:00 PM</div>
          <div className={style.label}>3:00 PM</div>
          <div className={style.label}>4:00 PM</div>
          <div className={style.label}>5:00 PM</div>
          <div className={style.label}>6:00 PM</div>
          <div className={style.label}>7:00 PM</div>
          <div className={style.label}>8:00 PM</div>
          <div className={style.label}>9:00 PM</div>
          <div className={style.label}>10:00 PM</div>
          <div className={style.label}>11:00 PM</div>
        </div>
        <CurrentTime />
        <div className={style.grid} ref={scrollRef}>
          {dayArray.map((val) => {
            return (
              <div key={val} className={style.column}>
                <RowGrid day={val} />
                <EventContainer day={val} />
                <RowFunction day={val} />
              </div>
            );
          })}
        </div>
        <EventEditor mode={mode} />
      </div>
    </div>
  );
}

export default Schedule;
