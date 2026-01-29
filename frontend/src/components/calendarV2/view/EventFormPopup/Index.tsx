import { useEffect, useState } from "react";
import Popup from "components/popup/Popup";
import Input from "components/input/Input";
import Textarea from "components/textarea/Textarea";
import Button from "components/button/Button";
import Select from "components/select/Select";
import style from "./style.module.scss";
import { useAuth } from "contexts/authContext";

type Props = {
  setPopupActive: (active: boolean) => void;
  onSave: (data: EventFormData) => void;
  defaultValues?: EventFormData;
  mode?: "create" | "edit";
};

export type EventFormData = {
  title: string;
  description: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  isAllDay: boolean;
  scope: "school" | "personal";
  recurrenceType: "none" | "daily" | "weekly" | "monthly";
  recurrenceEndDate: string;
  color: string;
};

const colorOptions = [
  { text: "파랑", value: "#4285f4" },
  { text: "빨강", value: "#ea4335" },
  { text: "초록", value: "#34a853" },
  { text: "노랑", value: "#fbbc04" },
  { text: "보라", value: "#a142f4" },
  { text: "주황", value: "#fa7b17" },
  { text: "분홍", value: "#f538a0" },
  { text: "회색", value: "#9e9e9e" },
];

const Index = (props: Props) => {
  const { currentUser } = useAuth();
  const isManager =
    currentUser?.auth === "admin" || currentUser?.auth === "manager";

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const [title, setTitle] = useState(props.defaultValues?.title ?? "");
  const [description, setDescription] = useState(
    props.defaultValues?.description ?? ""
  );
  const [startDate, setStartDate] = useState(
    props.defaultValues?.startDate ?? todayStr
  );
  const [startTime, setStartTime] = useState(
    props.defaultValues?.startTime ?? "09:00"
  );
  const [endDate, setEndDate] = useState(
    props.defaultValues?.endDate ?? todayStr
  );
  const [endTime, setEndTime] = useState(
    props.defaultValues?.endTime ?? "10:00"
  );
  const [isAllDay, setIsAllDay] = useState(
    props.defaultValues?.isAllDay ?? false
  );
  const [scope, setScope] = useState<"school" | "personal">(
    props.defaultValues?.scope ?? "personal"
  );
  const [recurrenceType, setRecurrenceType] = useState<
    "none" | "daily" | "weekly" | "monthly"
  >(props.defaultValues?.recurrenceType ?? "none");
  const [recurrenceEndDate, setRecurrenceEndDate] = useState(
    props.defaultValues?.recurrenceEndDate ?? ""
  );
  const [color, setColor] = useState(
    props.defaultValues?.color ?? "#4285f4"
  );

  const handleSave = () => {
    if (!title.trim()) return;
    props.onSave({
      title,
      description,
      startDate,
      startTime,
      endDate,
      endTime,
      isAllDay,
      scope,
      recurrenceType,
      recurrenceEndDate,
      color,
    });
  };

  return (
    <Popup
      setState={props.setPopupActive}
      style={{
        width: "480px",
        display: "flex",
        flexDirection: "column",
      }}
      closeBtn
      title={props.mode === "edit" ? "일정 수정" : "일정 추가"}
      contentScroll
    >
      <div className={style.section}>
        <div className={style.content}>
          <div className={style.row}>
            <Input
              label="제목"
              type="text"
              required
              defaultValue={title}
              onChange={(e: any) => setTitle(e.target.value)}
              placeholder="일정 제목을 입력하세요"
            />
          </div>

          {isManager && (
            <div className={style.row}>
              <Select
                label="범위"
                options={[
                  { text: "개인 캘린더", value: "personal" },
                  { text: "학교 캘린더", value: "school" },
                ]}
                defaultSelectedValue={scope}
                onChange={(e: any) => setScope(e as "school" | "personal")}
              />
            </div>
          )}

          <div className={style.row}>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px" }}>
              <input
                type="checkbox"
                checked={isAllDay}
                onChange={(e) => setIsAllDay(e.target.checked)}
              />
              종일
            </label>
          </div>

          <div
            className={style.row}
            style={{ display: "flex", gap: "12px", alignItems: "flex-end" }}
          >
            <Input
              label="시작일"
              type="date"
              defaultValue={startDate}
              onChange={(e: any) => setStartDate(e.target.value)}
            />
            {!isAllDay && (
              <Input
                type="time"
                defaultValue={startTime}
                onChange={(e: any) => setStartTime(e.target.value)}
              />
            )}
          </div>

          <div
            className={style.row}
            style={{ display: "flex", gap: "12px", alignItems: "flex-end" }}
          >
            <Input
              label="종료일"
              type="date"
              defaultValue={endDate}
              onChange={(e: any) => setEndDate(e.target.value)}
            />
            {!isAllDay && (
              <Input
                type="time"
                defaultValue={endTime}
                onChange={(e: any) => setEndTime(e.target.value)}
              />
            )}
          </div>

          <div className={style.row}>
            <Select
              label="반복"
              options={[
                { text: "반복 없음", value: "none" },
                { text: "매일", value: "daily" },
                { text: "매주", value: "weekly" },
                { text: "매월", value: "monthly" },
              ]}
              defaultSelectedValue={recurrenceType}
              onChange={(e: any) => setRecurrenceType(e)}
            />
          </div>

          {recurrenceType !== "none" && (
            <div className={style.row}>
              <Input
                label="반복 종료일"
                type="date"
                defaultValue={recurrenceEndDate}
                onChange={(e: any) => setRecurrenceEndDate(e.target.value)}
                placeholder="미설정 시 무한 반복"
              />
            </div>
          )}

          <div className={style.row}>
            <Select
              label="색상"
              options={colorOptions}
              defaultSelectedValue={color}
              onChange={(e: any) => setColor(e)}
            />
          </div>

          <div className={style.row}>
            <Textarea
              label="설명"
              rows={3}
              defaultValue={description}
              onChange={(e: any) => setDescription(e.target.value)}
              placeholder="일정 설명 (선택)"
            />
          </div>
        </div>

        <div className={style.footer}>
          <Button
            type="ghost"
            onClick={() => props.setPopupActive(false)}
          >
            취소
          </Button>
          <Button
            type="solid"
            onClick={handleSave}
            disabled={!title.trim()}
          >
            {props.mode === "edit" ? "수정" : "저장"}
          </Button>
        </div>
      </div>
    </Popup>
  );
};

export default Index;
