import { useAuth } from "contexts/authContext";

import _ from "lodash";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useAppNavigate } from "hooks/useAppNavigate";
import style from "style/pages/archive.module.scss";
import Table from "components/tableV2/Table";
import Popup from "components/popup/Popup";
import Button from "components/button/Button";
import EnrollFilterBar from "pages/courses/EnrollFilterBar";
import Svg from "assets/svg/Svg";

import ArrayView from "./tab/ArrayView";
import ObjectView from "./tab/ObjectView";
import Loading from "components/loading/Loading";
import { TSeasonRegistration } from "types/seasons";
import { useArchiveListFilter } from "./useArchiveListFilter";

type Props = {};

function matchesStudentKeyword(reg: any, q: string): boolean {
  if (!q) return true;
  const haystack = [
    reg.userName,
    reg.userId,
    reg.grade,
    reg.group,
    reg.teacherName,
    reg.subTeacherName,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

const ArchiveField = (props: Props) => {
  const { pid: _pid } = useParams(); // archive label ex) 인적 사항
  const { currentUser, currentSchool, currentRegistration, currentSeason } =
    useAuth();
  const navigate = useAppNavigate();

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [pid, setPid] = useState<string>();

  const [registrationList, setRegistrationList] = useState<any[]>([]);
  const [selectedRegistrationList, setSelectedRegistrationList] = useState<
    any[]
  >([]);
  const registrationListRef = useRef<any>([]);

  const [selectPopupAtcive, setSelectPopupActive] = useState<boolean>(false);
  const [popupKeyword, setPopupKeyword] = useState("");
  const [selectedGrades, setSelectedGrades] = useState<Set<string>>(
    () => new Set()
  );

  function formArchive() {
    return (
      currentSchool.formArchive?.filter((val: any) => {
        return val.label === _pid;
      })[0] ?? { authTeacher: "undefined", fields: [], dataType: "array" }
    );
  }

  const archiveForm = formArchive();
  const {
    keyword,
    setKeyword,
    fieldLabels,
    columnOptions,
    effectiveVisibleColumns,
    handleColumnToggle,
    handleShowAll,
    handleFilterReset,
  } = useArchiveListFilter({
    storageKey: `archive.${_pid ?? ""}`,
    fields: archiveForm.fields,
  });

  useEffect(() => {
    if (!isLoading && currentRegistration?.role && currentSeason?._id && _pid) {
      setIsLoading(true);
    }
  }, [currentRegistration, currentSeason, _pid]);

  useEffect(() => {
    if (isLoading) {
      const isManager = currentUser.auth === "manager";
      const hasManagerPermission =
        formArchive().authManager === "viewAndEdit";
      const isTeacher = currentRegistration?.role === "teacher";
      const hasTeacherPermission =
        formArchive().authTeacher &&
        formArchive().authTeacher !== "undefined";

      // 관리자 권한이 있는 관리자이거나 교사 권한이 있는 교사만 접근 가능
      if (
        !(isManager && hasManagerPermission) &&
        (!isTeacher || !hasTeacherPermission)
      ) {
        alert("접근 권한이 없습니다.");
        navigate("/");
      }

      let newRegistrationList: (TSeasonRegistration & {
        tableRowChecked?: boolean;
      })[] = [];
      let newSelectedRegistrationList: TSeasonRegistration[] = [];

      // 관리자 권한이 있거나 모든 학생 수정 권한이 있는 경우
      if (
        (isManager && hasManagerPermission) ||
        formArchive().authTeacher === "viewAndEditStudents"
      ) {
        /* 1. 관리자 권한이 있거나 모든 선생님이 수정할 수 있는 양식인 경우 */
        newRegistrationList = currentSeason.registrations.filter(
          (reg) => reg.role === "student"
        );
      } else if (formArchive().authTeacher === "viewAndEditMyStudents") {
        /* 2. 선생님이 담당 학생만 수정할 수 있는 양식인 경우 */
        newRegistrationList = currentSeason.registrations.filter(
          (reg) =>
            reg.role === "student" &&
            (reg?.teacher === currentUser._id ||
              reg?.subTeacher === currentUser._id)
        );
      } else if (!(isManager && hasManagerPermission)) {
        alert("잘못된 양식입니다.");
        return navigate("/");
      }

      for (let reg of newRegistrationList) {
        if (_.find(selectedRegistrationList, { _id: reg._id })) {
          reg.tableRowChecked = true;
          newSelectedRegistrationList.push(reg);
        }
      }

      setPid(_pid);
      setRegistrationList(newRegistrationList);
      registrationListRef.current = newRegistrationList;
      setSelectedRegistrationList(newSelectedRegistrationList);
      setIsLoading(false);
    }
  }, [isLoading]);

  const gradeOptions = useMemo(() => {
    const grades = _.uniq(
      registrationList.map((reg) => reg.grade).filter((g) => !!g)
    ) as string[];
    return grades.map((grade) => ({ key: grade, text: grade }));
  }, [registrationList]);

  const allGradeKeys = useMemo(
    () => gradeOptions.map((c) => c.key),
    [gradeOptions]
  );

  const effectiveSelectedGrades = useMemo(() => {
    if (allGradeKeys.length === 0) return new Set<string>();
    if (selectedGrades.size === 0) return new Set(allGradeKeys);
    const next = new Set(
      Array.from(selectedGrades).filter((k) => allGradeKeys.includes(k))
    );
    return next.size > 0 ? next : new Set(allGradeKeys);
  }, [selectedGrades, allGradeKeys]);

  const filteredRegistrations = useMemo(() => {
    const q = popupKeyword.trim().toLowerCase();
    const allGradesSelected =
      allGradeKeys.length > 0 &&
      allGradeKeys.every((k) => effectiveSelectedGrades.has(k));

    return registrationListRef.current.filter((reg: any) => {
      if (!allGradesSelected && !effectiveSelectedGrades.has(reg.grade)) {
        return false;
      }
      return matchesStudentKeyword(reg, q);
    });
  }, [
    popupKeyword,
    effectiveSelectedGrades,
    allGradeKeys,
    registrationList,
    selectPopupAtcive,
  ]);

  const openSelectPopup = () => {
    setPopupKeyword("");
    setSelectedGrades(new Set());
    setSelectPopupActive(true);
  };

  const handleGradeToggle = (key: string) => {
    setSelectedGrades((prev) => {
      const base =
        prev.size === 0 ? new Set(allGradeKeys) : new Set(prev);
      if (base.has(key)) base.delete(key);
      else base.add(key);
      return base.size === 0 ? new Set(allGradeKeys) : base;
    });
  };

  const handleShowAllGrades = () => {
    setSelectedGrades(new Set(allGradeKeys));
  };

  const handlePopupFilterReset = () => {
    setPopupKeyword("");
    setSelectedGrades(new Set(allGradeKeys));
  };

  const syncChecksFromFiltered = (filteredRows: any[]) => {
    const checkedById = new Map(
      filteredRows.map((row) => [row._id, !!row.tableRowChecked])
    );
    registrationListRef.current = registrationListRef.current.map(
      (reg: any) => {
        if (!checkedById.has(reg._id)) return reg;
        return { ...reg, tableRowChecked: checkedById.get(reg._id) };
      }
    );
  };

  const removeSelectedStudent = (idx: number) => {
    const registration = selectedRegistrationList[idx];
    if (!registration) return;
    const next = selectedRegistrationList.filter((_, i) => i !== idx);
    setSelectedRegistrationList(next);
    const reg = _.find(registrationListRef.current, {
      _id: registration._id,
    });
    if (reg) reg.tableRowChecked = false;
  };

  const selectedStudents = () => {
    if (selectedRegistrationList.length === 0) {
      return (
        <button
          type="button"
          className={style.student_select_cta}
          onClick={openSelectPopup}
        >
          <Svg type="userPlus" width="16px" height="16px" />
          학생 선택
        </button>
      );
    }
    return (
      <>
        <button
          type="button"
          className={style.student_summary_chip}
          onClick={openSelectPopup}
        >
          학생 {selectedRegistrationList.length}명 · 변경
        </button>
        {selectedRegistrationList.map((registration: any, idx: number) => (
          <span className={style.student_name_chip} key={registration._id}>
            {registration.userName}
            <button
              type="button"
              className={style.student_name_chip_remove}
              aria-label={`${registration.userName} 제거`}
              onClick={() => removeSelectedStudent(idx)}
            >
              <Svg type="x" width="12px" height="12px" />
            </button>
          </span>
        ))}
      </>
    );
  };

  const isObjectType = archiveForm.dataType === "object";

  return !isLoading ? (
    <>
      <div className={style.section}>
        <div className={style.title}>{pid}</div>

        <EnrollFilterBar
          keyword={keyword}
          columns={columnOptions}
          visibleKeys={effectiveVisibleColumns}
          onToggleColumn={handleColumnToggle}
          onShowAll={handleShowAll}
          onReset={handleFilterReset}
          totalCount={selectedRegistrationList.length}
          ariaLabel="기록 목록 보기 설정"
        />

        {isObjectType && (
          <div className={style.search_wrap}>
            <span className={style.search_icon} aria-hidden>
              <Svg type="search" width="16px" height="16px" />
            </span>
            <input
              className={style.search_external}
              type="search"
              placeholder="이름, 필드값 검색"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              aria-label="검색"
            />
          </div>
        )}

        <div className={style.student_select_container}>
          <div className={style.student_select_row}>{selectedStudents()}</div>
        </div>

        {!isLoading &&
          pid &&
          (isObjectType ? (
            <ObjectView
              pid={pid}
              registrationList={selectedRegistrationList}
              keyword={keyword}
              visibleKeys={effectiveVisibleColumns}
              fieldLabels={fieldLabels}
            />
          ) : (
            <ArrayView
              pid={pid}
              registrationList={selectedRegistrationList}
              keyword={keyword}
              onSearchChange={setKeyword}
              visibleKeys={effectiveVisibleColumns}
              fieldLabels={fieldLabels}
            />
          ))}
      </div>
      {selectPopupAtcive && (
        <Popup
          setState={setSelectPopupActive}
          title="학생 선택"
          closeBtn
          contentScroll
          footer={
            <Button
              type="ghost"
              onClick={() => {
                setSelectedRegistrationList(
                  _.filter(registrationListRef.current, {
                    tableRowChecked: true,
                  })
                );
                setSelectPopupActive(false);
              }}
            >
              선택
            </Button>
          }
        >
          <EnrollFilterBar
            keyword={popupKeyword}
            columns={gradeOptions}
            visibleKeys={effectiveSelectedGrades}
            onToggleColumn={handleGradeToggle}
            onShowAll={handleShowAllGrades}
            onReset={handlePopupFilterReset}
            totalCount={registrationList.length}
            ariaLabel="학생 학년 필터"
          />
          <Table
            data={filteredRegistrations}
            type="object-array"
            control
            defaultPageBy={50}
            searchValue={popupKeyword}
            onSearchChange={setPopupKeyword}
            searchPlaceholder="이름, ID, 그룹, 담임 검색"
            onChange={(value: any[]) => {
              syncChecksFromFiltered(value);
            }}
            header={[
              {
                text: "checkbox",
                key: "",
                type: "checkbox",
                width: "48px",
              },
              {
                text: "학년",
                key: "grade",
                type: "text",
                textAlign: "center",
                whiteSpace: "pre",
              },
              {
                text: "이름",
                key: "userName",
                type: "text",
                textAlign: "center",
                whiteSpace: "pre",
              },
              {
                text: "ID",
                key: "userId",
                type: "text",
                textAlign: "center",
                whiteSpace: "pre",
              },

              {
                text: "그룹",
                key: "group",
                type: "text",
                textAlign: "center",
              },
              {
                text: "담임 선생님",
                key: "teacherName",
                type: "text",
                textAlign: "center",
              },
              {
                text: "부담임 선생님",
                key: "subTeacherName",
                type: "text",
                textAlign: "center",
              },
            ]}
          />
        </Popup>
      )}
    </>
  ) : (
    <Loading height={"calc(100vh - 55px)"} />
  );
};

export default ArchiveField;
