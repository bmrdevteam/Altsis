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
import useRegisterAlterArchive from "hooks/useRegisterAlterArchive";

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
  const [hasChanges, setHasChanges] = useState<boolean>(false);
  const [changedCount, setChangedCount] = useState<number>(0);
  const initialArchiveListFlattenedRef = useRef<any[]>([]);

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
    initialArchiveListFlattenedRef.current = JSON.parse(JSON.stringify(archiveListFlattened));
    setHasChanges(false);
  };

  const checkForChanges = () => {
    // Build current and initial archive lists for comparison
    const currentByStudent: { [key: string]: any[] } = {};
    const initialByStudent: { [key: string]: any[] } = {};

    for (const item of archiveListFlattenedRef.current) {
      if (!currentByStudent[item._id]) currentByStudent[item._id] = [];
      const dataItem: { [key: string]: string } = {};
      for (const field of formArchive().fields ?? []) {
        dataItem[field.label] = item[field.label];
      }
      currentByStudent[item._id].push(dataItem);
    }

    for (const item of initialArchiveListFlattenedRef.current) {
      if (!initialByStudent[item._id]) initialByStudent[item._id] = [];
      const dataItem: { [key: string]: string } = {};
      for (const field of formArchive().fields ?? []) {
        dataItem[field.label] = item[field.label];
      }
      initialByStudent[item._id].push(dataItem);
    }

    // Count changed students
    let count = 0;
    const allIds = Array.from(new Set([...Object.keys(currentByStudent), ...Object.keys(initialByStudent)]));
    for (const id of allIds) {
      if (!_.isEqual(currentByStudent[id] ?? [], initialByStudent[id] ?? [])) {
        count++;
      }
    }

    setChangedCount(count);
    setHasChanges(count > 0);
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

  const formArchiveItem = formArchive();
  const canEditArchive =
    !isLoading &&
    !!props.pid &&
    archiveList.length > 0 &&
    ((currentUser.auth === "manager" &&
      formArchiveItem.authManager === "viewAndEdit") ||
      formArchiveItem.authTeacher === "viewAndEditStudents" ||
      formArchiveItem.authTeacher === "viewAndEditMyStudents");

  /** Alter용: 학생당 1행 (첫 데이터 행 기준, 없으면 빈 값) */
  const getAlterArchiveRows = () => {
    const fieldLabels = (formArchiveItem.fields || []).map(
      (f: any) => f.label
    );
    const firstByUser = new Map<string, any>();
    for (const row of archiveListFlattenedRef.current || []) {
      const key = String(row.user ?? "").trim();
      if (!key || firstByUser.has(key)) continue;
      firstByUser.set(key, row);
    }
    return (archiveList || []).map((a) => {
      const key = String(a.user ?? "").trim();
      const existing = firstByUser.get(key);
      if (existing) return existing;
      const empty: Record<string, any> = {
        user: a.user,
        userId: a.userId,
        userName: a.userName,
        grade: a.grade,
        registration: a.registration,
        _id: a._id,
      };
      for (const label of fieldLabels) empty[label] = "";
      return empty;
    });
  };

  const applyAlterArchiveRows = (next: any[]) => {
    const fieldLabels = (formArchiveItem.fields || [])
      .filter((f: any) => f?.label && f.type === "input")
      .map((f: any) => f.label);
    const flattened = [...(archiveListFlattenedRef.current || [])];
    const firstIdxByUser = new Map<string, number>();
    for (let i = 0; i < flattened.length; i++) {
      const key = String(flattened[i].user ?? "").trim();
      if (key && !firstIdxByUser.has(key)) firstIdxByUser.set(key, i);
    }

    for (const student of next || []) {
      const key = String(student.user ?? "").trim();
      if (!key) continue;
      const idx = firstIdxByUser.get(key);
      if (idx != null) {
        const merged = { ...flattened[idx] };
        for (const label of fieldLabels) {
          if (label in student) merged[label] = student[label];
        }
        flattened[idx] = merged;
      } else {
        const meta =
          (archiveList || []).find(
            (a) => String(a.user ?? "").trim() === key
          ) || {};
        const row: Record<string, any> = {
          _id: meta._id || student._id,
          user: meta.user || student.user,
          userId: meta.userId || student.userId,
          userName: meta.userName || student.userName,
          grade: meta.grade || student.grade,
          registration: meta.registration || student.registration,
        };
        for (const label of fieldLabels) {
          row[label] = student[label] ?? "";
        }
        flattened.push(row);
      }
    }

    archiveListFlattenedRef.current = flattened;
    setArchiveListFlattened(flattened);
    checkForChanges();
  };

  useRegisterAlterArchive({
    enabled: canEditArchive,
    archiveLabel: props.pid || "",
    formArchiveFields: formArchiveItem.fields || [],
    getArchiveList: getAlterArchiveRows,
    setArchiveList: applyAlterArchiveRows,
  });

  const updateArchives = async () => {
    // Build current archive list from flattened data
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

    // Build initial archive list from initial flattened data for comparison
    const _initialArchiveList: any[] = archiveList.map((a) => {
      return {
        _id: a._id,
        data: [],
      };
    });

    for (let archiveFlattened of initialArchiveListFlattenedRef.current) {
      const _aIdx = _.findIndex(
        _initialArchiveList,
        (a) => a._id === archiveFlattened._id
      );
      if (_aIdx !== -1) {
        const dataItem: { [key: string]: string } = {};
        for (let field of formArchive().fields ?? []) {
          dataItem[field.label] = archiveFlattened[field.label];
        }
        _initialArchiveList[_aIdx].data.push(dataItem);
      }
    }

    // Find changed students
    const changedIndices: number[] = [];
    for (let i = 0; i < _archiveList.length; i++) {
      if (!_.isEqual(_archiveList[i].data, _initialArchiveList[i]?.data)) {
        changedIndices.push(i);
      }
    }

    setChangedCount(changedIndices.length);
    setUpdatingRatio(0);
    const updatingLogs: string[] = [];

    let processed = 0;
    for (let i = 0; i < _archiveList.length; i++) {
      // Skip unchanged students
      if (!changedIndices.includes(i)) {
        continue;
      }

      try {
        await ArchiveAPI.UArchiveByRegistration({
          params: { _id: _archiveList[i]._id },
          data: {
            label: props.pid ?? "",
            data: _archiveList[i].data,
            registration: _archiveList[i].registration,
          },
        });
      } catch (err) {
        updatingLogs.push(
          `${_archiveList[i].userName} (${_archiveList[i].grade}/${_archiveList[i].userId})`
        );
      } finally {
        processed++;
        setUpdatingRatio(changedIndices.length > 0 ? processed / changedIndices.length : 1);
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
      {archiveList.length !== 0 && hasChanges && (
        <>
          <Button
            type="solid"
            style={{
              marginTop: "24px",
              backgroundColor: "#2563eb",
              color: "white",
              fontWeight: 600,
              padding: "0 20px",
              boxShadow: "0 2px 8px rgba(37, 99, 235, 0.3)",
            }}
            onClick={() => {
              setIsUpdating(true);
            }}
          >
            {`변경 사항 저장 (${changedCount}명)`}
          </Button>{" "}
    {/* 관리자 권한이 있고 교사/학생에게 수정 권한이 없을 때만 엑셀 파일로 수정 기능 사용 */}
      {currentUser.auth === "manager" &&
        formArchive().authManager === "viewAndEdit" &&
        formArchive().authStudent !== "viewAndEdit" &&
        formArchive().authTeacher !== "viewAndEditStudents" &&
        formArchive().authTeacher !== "viewAndEditMyStudents" && (
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
              checkForChanges();
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
                    changedCount - updatingLogs.length
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
