import { useEffect, useState } from "react";

import Button from "components/button/Button";
import Input from "components/input/Input";
import Popup from "components/popup/Popup";
import Table from "components/tableV2/Table";

import { unflattenObject } from "functions/functions";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import { TSchoolFormArchive } from "types/schools";
import _ from "lodash";

type Props = {
  school: string;
  setPopupActive: React.Dispatch<React.SetStateAction<boolean>>;
  formArchive: TSchoolFormArchive;
  setFormArchive: React.Dispatch<
    React.SetStateAction<TSchoolFormArchive | undefined>
  >;
  itemIdx: number;
};

function Index(props: Props) {
  const { SchoolAPI } = useAPIv2();

  const [formArchiveItemFields, setFormArchiveItemFields] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [editFieldsPopupActive, setEditFieldsPopupActive] =
    useState<boolean>(false);
  const [dateFieldsPopupActive, setDateFieldsPopupActive] =
    useState<boolean>(false);
  const [period, setPeriod] = useState<{ start: string; end: string; day: string[] }>({
    start: "",
    end: "",
    day: [],
  });
  const [fieldIdx, setFieldIdx] = useState<number>(0);

  const updateItemFields = async (e: any) => {
    try {
      if (e.length > formArchiveItemFields.length) {
        if (e[e.length - 1].label === "") {
          setIsLoading(true);
          return alert("라벨을 입력해주세요");
        }
      }
      const newFormArchive = _.cloneDeep(props.formArchive);
      newFormArchive[props.itemIdx].fields = e
        .map((o: any) => unflattenObject(o))
        .map((field: any) => {
          if (field.type === "") field.type = undefined;
          if (field.total === "") field.total = false;
          if (field.runningTotal === "") field.runningTotal = false;
          return field;
        });

      const { formArchive } = await SchoolAPI.USchoolFormArchive({
        params: {
          _id: props.school,
        },
        data: { formArchive: newFormArchive },
      });
      alert(SUCCESS_MESSAGE);
      props.setFormArchive(formArchive);
      setFormArchiveItemFields(formArchive[props.itemIdx].fields);
    } catch (err) {
      ALERT_ERROR(err);
      setIsLoading(true);
    }
  };

  const updateItemFieldOptions = async (options: any[]) => {
    try {
      const newFormArchive = _.cloneDeep(props.formArchive);
      newFormArchive[props.itemIdx].fields[fieldIdx].options = options;

      const { formArchive } = await SchoolAPI.USchoolFormArchive({
        params: {
          _id: props.school,
        },
        data: { formArchive: newFormArchive },
      });
      alert(SUCCESS_MESSAGE);
      props.setFormArchive(formArchive);
      setFormArchiveItemFields(formArchive[props.itemIdx].fields);
    } catch (err) {
      ALERT_ERROR(err);
      setIsLoading(true);
    }
  };
  useEffect(() => {
    if (isLoading) {
      setFormArchiveItemFields(props.formArchive[props.itemIdx].fields);
      setIsLoading(false);
    }
  }, [isLoading]);

  const updateItemFieldDate = async (e: { start: string; end: string; day: string[] }) => {
    try {
      const newFormArchive = _.cloneDeep(props.formArchive);
      newFormArchive[props.itemIdx].fields[fieldIdx].date = e;
      props.setFormArchive(newFormArchive);
      const { formArchive } = await SchoolAPI.USchoolFormArchive({
        params: {
          _id: props.school,
        },
        data: { formArchive: newFormArchive },
      });
      alert(SUCCESS_MESSAGE);
      setFormArchiveItemFields(formArchive[props.itemIdx].fields);
    } catch (err) {
      ALERT_ERROR(err);
      setIsLoading(true);
    }
  };

  // 체크박스 변경 핸들러
  const handleDayChange = (e:any) => {
    const { value, checked } = e.target;
    setPeriod((prevPeriod) => {
      if (checked) {
        // 체크박스가 체크되면 해당 요일을 배열에 추가 (중복 방지)
        // Set을 Array.from()을 사용하여 배열로 변환합니다.
        return { ...prevPeriod, day: Array.from(new Set([...prevPeriod.day, value])) };
      } else {
        // 체크박스가 체크 해제되면 해당 요일을 배열에서 제거
        return { ...prevPeriod, day: prevPeriod.day.filter((day) => day !== value) };
      }
    });
  };

  useEffect(() => {
    if (isLoading) {
      setFormArchiveItemFields(props.formArchive[props.itemIdx].fields);
      setIsLoading(false);
    }
  }, [isLoading]);
  return (
    <>
      <Popup
        closeBtn
        contentScroll
        style={{ width: "800px" }}
        setState={props.setPopupActive}
        title={`${props.formArchive[props.itemIdx].label}`}
      >
        <Table
          type="object-array"
          data={!isLoading ? formArchiveItemFields : []}
          onChange={updateItemFields}
          header={
            props.formArchive[props.itemIdx].dataType === "array"
              ? [
                  {
                    text: "순서",
                    fontSize: "12px",
                    fontWeight: "600",
                    type: "rowOrder",
                    width: "80px",
                    textAlign: "center",
                  },
                  {
                    text: "필드명",
                    key: "label",
                    type: "text",
                  },
                  {
                    text: "유형",
                    key: "type",
                    fontSize: "12px",
                    fontWeight: "600",
                    type: "status",
                    status: {
                      input: {
                        text: "텍스트",
                        color: "#B33F00",
                      },
                      date: {
                        text: "날짜 +",
                        color: "#B33F00",
                        onClick: (row) => {
                          const idx = _.findIndex(
                            formArchiveItemFields,
                            (field) => field.label === row.label
                          );
                          if (idx !== -1) {
                            setFieldIdx(idx);
                            setDateFieldsPopupActive(true);
                            // 날짜 필드의 기존 값으로 period 상태 초기화
                            setPeriod(
                              formArchiveItemFields[idx].date || {
                                start: "",
                                end: "",
                                day: [],
                              }
                            );
                          }
                        },
                      },
                      select: {
                        text: "선택 +",
                        color: "#8657ff",
                        onClick: (row) => {
                          const idx = _.findIndex(
                            formArchiveItemFields,
                            (field) => field.label === row.label
                          );
                          if (idx !== -1) {
                            setFieldIdx(idx);
                            setEditFieldsPopupActive(true);
                          }
                        },
                      },
                      "input-number": {
                        text: "숫자",
                        color: "#00B3AD",
                      },
                    },
                    width: "80px",
                    textAlign: "center",
                  },
                  {
                    text: "중복검사",
                    key: "duplicateCheck",
                    textAlign: "center",
                    width: "80px",
                    type: "toggle",
                  },
                  {
                    text: "합산",
                    key: "total",
                    textAlign: "center",
                    width: "80px",
                    type: "toggle",
                  },
                  {
                    text: "누계합산",
                    key: "runningTotal",
                    textAlign: "center",
                    width: "80px",
                    type: "toggle",
                  },
                  {
                    text: "수정",
                    fontSize: "12px",
                    fontWeight: "600",
                    type: "rowEdit",
                    width: "80px",
                    textAlign: "center",
                  },
                ]
              : [
                  {
                    text: "순서",
                    fontSize: "12px",
                    fontWeight: "600",
                    type: "rowOrder",
                    width: "80px",
                    textAlign: "center",
                  },
                  {
                    text: "필드명",
                    key: "label",
                    type: "text",
                  },
                  {
                    text: "유형",
                    key: "type",
                    fontSize: "12px",
                    fontWeight: "600",
                    type: "status",
                    status: {
                      input: {
                        text: "텍스트",
                        color: "#B33F00",
                      },
                      file: {
                        text: "파일",
                        color: "#8657ff",
                      },
                      "file-image": {
                        text: "사진",
                        color: "#00B3AD",
                      },
                    },
                    width: "80px",
                    textAlign: "center",
                  },

                  {
                    text: "수정",
                    fontSize: "12px",
                    fontWeight: "600",
                    type: "rowEdit",
                    width: "80px",
                    textAlign: "center",
                  },
                ]
          }
        />
      </Popup>
      {editFieldsPopupActive && (
        <Popup
          contentScroll
          style={{ width: "600px", borderRadius: "4px" }}
          closeBtn
          setState={setEditFieldsPopupActive}
          title={`${formArchiveItemFields[fieldIdx].label}`}
        >
          <Table
            type="string-array"
            data={
              !isLoading ? formArchiveItemFields[fieldIdx].options ?? [] : []
            }
            onChange={(e) => {
              const _data: string[] = e.map((o) => o["0"]);
              updateItemFieldOptions(_data);
            }}
            header={[
              {
                text: "순서",
                fontSize: "12px",
                fontWeight: "600",
                type: "rowOrder",
                width: "80px",
                textAlign: "center",
              },
              {
                text: "옵션",
                key: "0",
                type: "text",
              },
              {
                text: "수정",
                fontSize: "12px",
                fontWeight: "600",
                type: "rowEdit",
                width: "80px",
                textAlign: "center",
              },
            ]}
          />
        </Popup>
      )}
      {dateFieldsPopupActive && (
<Popup
      contentScroll
      style={{ width: "600px", borderRadius: "4px" }}
      closeBtn
      setState={setDateFieldsPopupActive}
      title={`${formArchiveItemFields[fieldIdx].label}`}
    >
      <div>
        <Input
          style={{ maxHeight: "30px" }}
          type="date"
          label="시작"
          appearence="flat"
          defaultValue={period.start}
          onChange={(e:any) => {
            setPeriod({ ...period, start: e.target.value });
          }}
        />
        <Input
          style={{ maxHeight: "30px" }}
          type="date"
          appearence="flat"
          label="끝"
          defaultValue={period.end}
          onChange={(e:any) => {
            setPeriod({ ...period, end: e.target.value });
          }}
        />
        <div style={{ fontSize: 12, marginTop: 5, fontWeight: 500 }}>요일</div>
        <div style={{ fontSize: 12, marginTop: 5, fontWeight: 500 }}>
          {/* 일괄 등록 체크박스는 다른 요일들과 로직이 다를 수 있으므로 별도 처리 */}
          <input
            type="checkbox"
            value="일괄 등록"
            checked={period.day.includes("일괄 등록")}
            onChange={handleDayChange}
          />
          <span style={{ fontSize: 15, fontWeight: 500 }}>일괄 등록 </span>
          <input
            type="checkbox"
            value="월"
            checked={period.day.includes("월")}
            onChange={handleDayChange}
          />
          <span style={{ fontSize: 15, fontWeight: 500 }}>월 </span>
          <input
            type="checkbox"
            value="화"
            checked={period.day.includes("화")}
            onChange={handleDayChange}
          />
          <span style={{ fontSize: 15, fontWeight: 500 }}>화 </span>
          <input
            type="checkbox"
            value="수"
            checked={period.day.includes("수")}
            onChange={handleDayChange}
          />
          <span style={{ fontSize: 15, fontWeight: 500 }}>수 </span>
          <input
            type="checkbox"
            value="목"
            checked={period.day.includes("목")}
            onChange={handleDayChange}
          />
          <span style={{ fontSize: 15, fontWeight: 500 }}>목 </span>
          <input
            type="checkbox"
            value="금"
            checked={period.day.includes("금")}
            onChange={handleDayChange}
          />
          <span style={{ fontSize: 15, fontWeight: 500 }}>금 </span>
          <input
            type="checkbox"
            value="토"
            checked={period.day.includes("토")}
            onChange={handleDayChange}
          />
          <span style={{ fontSize: 15, fontWeight: 500 }}>토 </span>
          <input
            type="checkbox"
            value="일"
            checked={period.day.includes("일")}
            onChange={handleDayChange}
          />
          <span style={{ fontSize: 15, fontWeight: 500 }}>일 </span>
        </div>

        <Button
          type={"ghost"}
          style={{
            borderRadius: "4px",
            height: "32px",
            marginTop: "24px",
          }}
          onClick={() => {
            updateItemFieldDate(period);
            console.log(period);
          }}
        >
          수정
        </Button>
      </div>
    </Popup>      )}
    </>
  );
}

export default Index;
