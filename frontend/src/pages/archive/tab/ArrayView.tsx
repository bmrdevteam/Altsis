import Button from "components/button/Button";
import Table from "components/tableV2/Table";
import { useAuth } from "contexts/authContext";
import style from "style/pages/archive.module.scss";
import { useRef, useEffect, useState } from "react";

import Loading from "components/loading/Loading";
import Popup from "components/popup/Popup";
import Progress from "components/progress/Progress";
import Callout from "components/callout/Callout";
import _ from "lodash";

import ExcelPopup from "./ExcelPopup";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";

type Props = {
  pid: string;
  registrationList: any[];
};

const colors = ["#ff595e", "#2c6e49", "#1982c4", "#6a4c93"];

const One = (props: Props) => {
  const { ArchiveAPI } = useAPIv2();
  const { currentSchool, currentUser } = useAuth();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [archiveList, setArchiveList] = useState<any[]>([]);
  const [archiveListFlattened, setArchiveListFlattened] = useState<any[]>([]);
  const archiveListFlattenedRef = useRef<any>([]);
  const [userNameStatus, setUserNameStatus] = useState<{
    [key: string]: { text: string; color: string };
  }>({});

  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [isUpdatePopupActive, setIsUpdatePopupActive] =
    useState<boolean>(false);
  const [updatingRatio, setUpdatingRatio] = useState<number>(0);
  const [updatingLogs, setUpdatingLogs] = useState<string[]>([]);

  const [isExcelPopupActive, setIsExcelPopupActive] = useState<boolean>(false);

  useEffect(() => {
    if (props.pid) {
      setIsLoading(true);
    }
  }, [props.registrationList, props.pid]);

  const findArchiveList = async () => {
    if (!props.pid || props.pid === "") return [];

    try {
      const rawArchiveList = (
        await Promise.all(
          props.registrationList.map(async (reg) =>
            ArchiveAPI.RArchiveByRegistration({
              query: { registration: reg._id, label: props.pid },
            })
          )
        )
      ).map(({ archive }) => archive);

      const archiveList = [];
      for (let i = 0; i < rawArchiveList.length; i++) {
        archiveList.push({
          data: rawArchiveList[i].data[props.pid] ?? [],
          registration: props.registrationList[i]._id,
          user: props.registrationList[i].user,
          userId: props.registrationList[i].userId,
          userName: props.registrationList[i].userName,
          grade: props.registrationList[i].grade,
          _id: rawArchiveList[i]._id,
        });
      }
      return archiveList;
    } catch (err) {
      ALERT_ERROR(err);
      return [];
    }
  };

  const updateArchiveListFlattened = (archiveList: any[]) => {
    const archiveListFlattened = [];
    const userNameStatus: {
      [key: string]: { text: string; color: string };
    } = {};

    for (let i = 0; i < archiveList.length; i++) {
      const archive = archiveList[i];
      if (!userNameStatus[archive._id]) {
        userNameStatus[archive._id] = {
          text: archive.userName,
          color: colors[i % 4],
        };
      }

      for (let idx = 0; idx < archive.data.length; idx++) {
        archiveListFlattened.push({
          ...archive.data[idx],
          _id: archive._id,
          user: archive.user,
          userId: archive.userId,
          userName: archive.userName,
          grade: archive.grade,
          registration: archive.registration,
        });
      }
    }
    setUserNameStatus(userNameStatus);
    setArchiveListFlattened(archiveListFlattened);
    archiveListFlattenedRef.current = archiveListFlattened;
  };

  useEffect(() => {
    if (isLoading && props.pid) {
      findArchiveList()
        .then((archiveList) => {
          setArchiveList(archiveList);
          updateArchiveListFlattened(archiveList);
        })
        .then(() => {
          setIsLoading(false);
        });
    }
  }, [isLoading]);

  // const data = useRef;
  function formArchive() {
    return (
      currentSchool.formArchive?.filter((val: any) => {
        return val.label === props.pid;
      })[0] ?? { fields: [] }
    );
  }

  const updateArchives = async () => {
    const _archiveList: any[] = archiveList.map((a) => {
      return {
        _id: a._id,
        user: a.user,
        userId: a.userId,
        userName: a.userName,
        grade: a.grade,
        registration: a.registration,
        data: [],
      };
    });
    setUpdatingRatio(0);
    const updatingLogs: string[] = [];

    for (let archiveFlattened of archiveListFlattenedRef.current) {
      const _aIdx = _.findIndex(
        _archiveList,
        (a) => a._id === archiveFlattened._id
      );
      if (_aIdx !== -1) {
        const dataItem: { [key: string]: string } = {};
        for (let field of formArchive().fields ?? []) {
          dataItem[field.label] = archiveFlattened[field.label];
        }
        _archiveList[_aIdx].data.push(dataItem);
      }
    }

    for (let i = 0; i < _archiveList.length; i++) {
      try {
        const { archive } = await ArchiveAPI.UArchiveByRegistration({
          params: { _id: _archiveList[i]._id },
          data: {
            label: props.pid ?? "",
            data: _archiveList[i].data,
            registration: _archiveList[i].registration,
          },
        });
        archiveList.push({
          ..._archiveList[i],
          ...archive,
        });
      } catch (err) {
        archiveList.push({ ..._archiveList[i] });
        updatingLogs.push(
          `${archiveList[i].userName} (${archiveList[i].grade}/${archiveList[i].userId})`
        );
      } finally {
        setUpdatingRatio((i + 1) / _archiveList.length);
      }
    }

    setUpdatingLogs([...updatingLogs]);
    return _archiveList;
  };

  useEffect(() => {
    if (isUpdating && props.pid) {
      setIsUpdatePopupActive(true);
      updateArchives()
        .then((archiveList) => {
          setArchiveList(archiveList);
          updateArchiveListFlattened(archiveList);
        })
        .then(() => {
          setIsUpdating(false);
        });
    }
  }, [isUpdating]);

  function archiveHeader() {
    let arr: any = [
      {
        text: "이름",
        whiteSpace: "pre",
        key: "_id",
        type: "status",
        width: "124px",
        textAlign: "center",
        status: userNameStatus,
        fontWeight: "600",
      },
    ];
    formArchive().fields?.map((val: any) => {
      if (val.type === "select") {
        arr.push({
          text: val.label,
          whiteSpace: "pre",
          key: val.label,
          type: "select",
          option: val.options,
        });
      } else if (val.type === "input-number") {
        arr.push({
          text: val.label,
          whiteSpace: "pre",
          key: val.label,
          type: "input-number",
        });
      } else {
        arr.push({
          byteCalc: true,
          text: val.label,
          key: val.label,
          type: val.type,
        });
      }
    });
    arr.push({
      text: "수정",
      type: "rowEdit",
      width: "72px",
      textAlign: "center",
      fontSize: "12px",
      btnStyle: {
        round: true,
        border: true,
        padding: "4px",
        color: "red",
        background: "#FFF1F1",
      },
      fontWeight: "600",
    });
    return arr;
  }

  return !isLoading ? (
    <>
      {archiveList.length !== 0 && (
        <>
          <Button
            type="ghost"
            style={{ marginTop: "24px", borderColor: "gray" }}
            onClick={() => {
              setIsUpdating(true);
            }}
          >
            제출
          </Button>{" "}
    {/* 관리자만 엑셀 파일로 수정 기능 사용 24.02.04 devgoodway */}
      {currentUser.auth == "manager" &&(
        <>
          <Button
            type="ghost"
            style={{ marginTop: "24px", borderColor: "gray" }}
            onClick={() => {
              setIsExcelPopupActive(true);
            }}
          >
          엑셀 파일로 수정
          </Button>
          <br></br>
        </>
      )}
      </>
    )}
    <div style={{ marginTop: "12px" }}>※ 이름을 선택하지 않고 입력한 값은 모든 사용자에게 일괄로 적용됩니다.</div>
      <div style={{ marginTop: "12px" }}>
        <Table
          defaultPageBy={200}
          control
          onChange={(value) => {
            /* if value is updated */
            if (value.length === archiveListFlattenedRef.current.length) {
              archiveListFlattenedRef.current = value;
              return;
            }
            /* if value is added or removed */
            /* if value is added */
            if (value.length > archiveListFlattenedRef.current.length) {
              if (archiveList.length === 0) {
                alert("학생을 먼저 선택해주세요");
                setIsLoading(true);
                return;
              }
              if (value[value.length - 1]._id === "") {
                const base = value[value.length - 1];
                value.splice(value.length - 1, 1);
                for (let archive of archiveList) {
                  value.push({ ...base, _id: archive._id });
                }
              }
            }
            archiveListFlattenedRef.current = value;

            setIsUpdating(true);
          }}
          type="object-array"
          data={archiveListFlattened ?? []}
          header={archiveHeader()}
          menus={[]}
        />
      </div>
      {isUpdatePopupActive && (
        <Popup setState={setIsUpdatePopupActive} contentScroll closeBtn>
          <div>
            <p>
              {isUpdating
                ? "저장 중입니다."
                : `저장이 완료되었습니다 (성공: ${
                    archiveList.length - updatingLogs.length
                  }, 실패: ${updatingLogs.length})`}
            </p>
            <Progress
              value={updatingRatio ?? 0}
              style={{ margin: "12px 0px" }}
              showIconSuccess={!isUpdating && updatingLogs.length === 0}
              showIconError={!isUpdating && updatingLogs.length > 0}
            />
            {updatingLogs.length > 0 && (
              <Callout
                type="error"
                style={{ whiteSpace: "pre" }}
                title={"저장되지 않은 항목이 있습니다."}
                description={updatingLogs.join("\n")}
              />
            )}
          </div>
        </Popup>
      )}
      {isExcelPopupActive && (
        <ExcelPopup
          type="array"
          setPopupActive={setIsExcelPopupActive}
          fields={formArchive().fields}
          pid={props.pid ?? "data"}
          archiveListRef={archiveListFlattenedRef}
          archiveList={archiveList}
          userNameStatus={userNameStatus}
          setIsUpdating={setIsUpdating}
        />
      )}
    </>
  ) : (
    <Loading height={"calc(100vh - 55px)"} />
  );
};

export default One;
