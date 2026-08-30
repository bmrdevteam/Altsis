/**
 * @file Course Paste Popup
 * @page 수업 개설 뷰 - 강의계획서 복사 팝업
 */
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "contexts/authContext";

import style from "style/pages/courses/course.module.scss";

import Popup from "components/popup/Popup";
import Table from "components/tableV2/Table";
import Select from "components/select/Select";
import Loading from "components/loading/Loading";

import _ from "lodash";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import { TSyllabus } from "types/syllabuses";
import {
  PASTE_FILTER_ALL,
  filterPasteSyllabuses,
  formatPasteOwnerLabel,
  toSelectOptions,
  uniqueTerms,
  uniqueYears,
} from "./pasteSyllabusFilter";

type Props = {
  setPopupActive: (active: boolean) => void;
  pasteFunc: (syllabusId: string) => void;
};

type TPasteScope = "mine" | "school";

const Index = (props: Props) => {
  const { currentUser, currentSchool, currentSeason } = useAuth();
  const { SyllabusAPI } = useAPIv2();

  const [scope, setScope] = useState<TPasteScope>("mine");
  const [year, setYear] = useState("");
  const [term, setTerm] = useState("");
  const [keyword, setKeyword] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [syllabuses, setSyllabuses] = useState<TSyllabus[]>([]);

  const schoolId = currentSchool?.school || currentSchool?._id;
  const canLoadSchool = Boolean(schoolId);

  const applyScopeDefaults = (next: TPasteScope) => {
    setTerm("");
    setKeyword("");
    if (next === "school") {
      setYear(currentSeason?.year ?? "");
    } else {
      setYear("");
    }
  };

  const handleScopeChange = (next: TPasteScope) => {
    if (next === scope) return;
    if (next === "school" && !canLoadSchool) return;
    setScope(next);
    applyScopeDefaults(next);
    setIsLoading(true);
  };

  useEffect(() => {
    if (!isLoading) return;

    const query =
      scope === "school" && schoolId
        ? { school: schoolId }
        : { user: currentUser?._id };

    SyllabusAPI.RSyllabuses({ query })
      .then(({ syllabuses: list }) => {
        setSyllabuses(
          _.orderBy(
            list,
            ["year", "term", "subject", "classTitle"],
            ["desc", "desc", "asc", "asc"]
          )
        );
      })
      .catch(ALERT_ERROR)
      .finally(() => setIsLoading(false));
  }, [isLoading]);

  const yearOptions = useMemo(
    () => toSelectOptions(uniqueYears(syllabuses), year),
    [syllabuses, year]
  );
  const termOptions = useMemo(
    () => toSelectOptions(uniqueTerms(syllabuses, year)),
    [syllabuses, year]
  );

  useEffect(() => {
    if (term && !uniqueTerms(syllabuses, year).includes(term)) {
      setTerm("");
    }
  }, [syllabuses, year, term]);

  const filtered = useMemo(
    () => filterPasteSyllabuses({ syllabuses, year, term, keyword }),
    [syllabuses, year, term, keyword]
  );

  const tableData = useMemo(
    () =>
      filtered.map((syllabus) => ({
        ...syllabus,
        subject_2: _.join(syllabus.subject, "/ "),
        ownerText: formatPasteOwnerLabel(
          syllabus.userName,
          syllabus.user,
          currentUser?._id
        ),
      })),
    [filtered, currentUser?._id]
  );

  return (
    <Popup
      setState={props.setPopupActive}
      title={"복사할 강의계획서 선택"}
      closeBtn
      contentScroll
      style={{ width: "1080px" }}
    >
      <div className={style.paste_body}>
        <div className={style.paste_toolbar}>
          <div
            className={style.paste_scope}
            role="radiogroup"
            aria-label="강의계획서 범위"
          >
            <button
              type="button"
              role="radio"
              aria-checked={scope === "mine"}
              className={`${style.paste_scope_btn} ${
                scope === "mine" ? style.paste_scope_btn_active : ""
              }`}
              onClick={() => handleScopeChange("mine")}
            >
              내 강의계획서
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={scope === "school"}
              className={`${style.paste_scope_btn} ${
                scope === "school" ? style.paste_scope_btn_active : ""
              }`}
              disabled={!canLoadSchool}
              onClick={() => handleScopeChange("school")}
            >
              학교 전체
            </button>
          </div>
          <div className={style.paste_filters}>
            <Select
              key={`paste-year-${yearOptions.map((o) => o.value).join("|")}`}
              appearence="flat"
              label="학년도"
              options={yearOptions}
              selectedValue={year || PASTE_FILTER_ALL}
              onChange={(value: string) => {
                setYear(value === PASTE_FILTER_ALL ? "" : value);
                setTerm("");
              }}
              style={{ minWidth: "140px" }}
            />
            <Select
              key={`paste-term-${termOptions.map((o) => o.value).join("|")}`}
              appearence="flat"
              label="학기"
              options={termOptions}
              selectedValue={term || PASTE_FILTER_ALL}
              onChange={(value: string) => {
                setTerm(value === PASTE_FILTER_ALL ? "" : value);
              }}
              style={{ minWidth: "120px" }}
            />
          </div>
        </div>
        {isLoading ? (
          <Loading height="240px" />
        ) : (
          <Table
            key={`${scope}-${year}-${term}`}
            control
            defaultPageBy={10}
            data={tableData}
            type="object-array"
            searchValue={keyword}
            onSearchChange={setKeyword}
            searchPlaceholder="수업명, 개설자, 교과목"
            header={[
              {
                text: "No",
                type: "text",
                key: "tableRowIndex",
                width: "48px",
                textAlign: "center",
              },
              {
                text: "학년도",
                key: "year",
                type: "text",
                textAlign: "center",
              },
              {
                text: "학기",
                key: "term",
                type: "text",
                textAlign: "center",
              },
              {
                text: "교과목",
                key: "subject_2",
                type: "text",
              },
              {
                text: "수업명",
                key: "classTitle",
                type: "text",
                textAlign: "center",
              },
              {
                text: "개설자",
                key: "ownerText",
                type: "text",
                textAlign: "center",
              },
              {
                text: "선택",
                key: "select",
                type: "button",
                onClick: (e: any) => {
                  props.pasteFunc(e._id);
                  props.setPopupActive(false);
                },
                width: "80px",
                textAlign: "center",
                btnStyle: {
                  border: true,
                  color: "black",
                  padding: "4px",
                  round: true,
                },
              },
            ]}
          />
        )}
      </div>
    </Popup>
  );
};

export default Index;
