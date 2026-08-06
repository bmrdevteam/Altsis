import Svg from "assets/svg/Svg";
import Loading from "components/loading/Loading";
import Popup from "components/popup/Popup";
import Select from "components/select/Select";
import { useAuth } from "contexts/authContext";
import EditorParser from "editor/EditorParser";
import { zipSeasonsFormEvaluation } from "functions/docs";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import useRegisterAlterDocsReview from "hooks/useRegisterAlterDocsReview";
import _ from "lodash";
import React, { useEffect, useState } from "react";
import style from "style/pages/docs/docs.module.scss";
import { TRegistration } from "types/registrations";
import DocFormSelector from "./DocFormSelector";
import StudentPicker from "./StudentPicker";

const getStorageKey = (schoolId: string) => `docsSelectedForms_${schoolId}`;

const getSelectedFormIds = (schoolId: string): string[] => {
  try {
    const stored = window.localStorage.getItem(getStorageKey(schoolId));
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {}
  return [];
};

const saveSelectedFormIds = (schoolId: string, ids: string[]) => {
  window.localStorage.setItem(getStorageKey(schoolId), JSON.stringify(ids));
};

type Props = {};

function Docs({}: Props) {
  const { ArchiveAPI, EnrollmentAPI, SeasonAPI, FormAPI } = useAPIv2();
  const { currentSchool, currentSeason, currentRegistration } = useAuth();
  const isStudent = currentRegistration?.role === "student";
  const [loading, setLoading] = useState<boolean>(true);
  const [formData, setFormData] = useState<any>();
  const [printForms, setPrintForms] = useState<any>([]);
  const [DBData, setDBData] = useState<any>();
  /* not users but registrations */
  const [users, setUsers] = useState<TRegistration[]>([]);
  const [choosePopupActive, setChoosePopupActive] = useState<boolean>(false);
  const [selectorPopupActive, setSelectorPopupActive] = useState<boolean>(false);
  const [selectedFormIds, setSelectedFormIds] = useState<string[]>([]);

  const [evaluationData, setEvaluationData] = useState<any>();
  const [selectedStudentLabel, setSelectedStudentLabel] = useState<string>("");

  useRegisterAlterDocsReview({
    enabled: !isStudent && !!formData && !!DBData,
    label: formData?.title || "문서 점검",
    formTitle: formData?.title,
    studentLabel: selectedStudentLabel,
    getFormData: () => formData as any,
    getDbData: () => DBData as any,
  });

  async function getDBData(rid: string, uid: string, evalDataOverride?: any) {
    const evalData = evalDataOverride || evaluationData;
    let archiveData: any = {};
    try {
      const { archive } = await ArchiveAPI.RArchiveByRegistration({
        query: { registration: rid },
      });
      archiveData = archive?.data || {};
    } catch {
      archiveData = {};
    }

    let processedEvaluationByYear: any = [];

    let enrollments: any[] = [];
    try {
      const { enrollments: _enrollments } =
        await EnrollmentAPI.REnrollmentsWithEvaluation({
          query: { student: uid, school: currentSchool.school },
        });
      enrollments = _enrollments as any[];
    } catch {
      enrollments = [];
    }

    for (const enrollment of enrollments) {
      const IdByYear = `${enrollment.year}${_.join(enrollment.subject)}`;

      enrollment._subject = {};
      for (
        let idx = 0;
        idx < evalData?.subjectLabelsBySeason[enrollment?.season]?.length;
        idx++
      ) {
        enrollment._subject[
          evalData?.subjectLabelsBySeason[enrollment?.season][idx]
        ] = enrollment?.subject[idx];
      }

      enrollment._evaluation = {};
      for (const evLabel in enrollment?.evaluation) {
        enrollment._evaluation[`${enrollment.term}/${evLabel}`] =
          enrollment?.evaluation[evLabel];
      }

      const idx = _.findIndex(processedEvaluationByYear, ["id", IdByYear]);
      if (idx === -1) {
        for (const evLabel in enrollment?.evaluation) {
          enrollment._evaluation[`${"연도별"}/${evLabel}`] =
            enrollment?.evaluation[evLabel];
        }

        processedEvaluationByYear.push({
          id: IdByYear,
          학년도: enrollment.year,
          학년: enrollment.studentGrade,
          ...enrollment._subject,
          ...enrollment._evaluation,
          [`${enrollment.term}/단위수`]: enrollment?.point || 0,
        });
      } else {
        Object.assign(processedEvaluationByYear[idx], {
          [`${enrollment.term}/단위수`]:
            (processedEvaluationByYear[idx][`${enrollment.term}/단위수`] || 0) +
            (enrollment?.point || 0),
          ...enrollment?._evaluation,
        });
      }
    }

    return {
      [currentSchool.schoolId]: {
        archive: archiveData,
        evaluation: _.sortBy(processedEvaluationByYear, ["학년도","교과","과목"]),
      },
    };
  }

  const RData = async (school: string) => {
    const registrations = isStudent
      ? []
      : currentSeason?.registrations.filter(
          (reg) => reg.role === "student"
        );
    const [{ forms }, { seasons }] = await Promise.all([
      FormAPI.RForms({ query: { type: "print", archived: false } }),
      SeasonAPI.RSeasons({ query: { school: currentSchool?.school } }),
    ]);

    let form: object | undefined = undefined;
    if (forms.length > 0) {
      const storedIds = getSelectedFormIds(currentSchool.schoolId);
      const validStoredIds = storedIds.filter((id: string) =>
        forms.some((f: any) => f._id === id)
      );
      const firstFormId =
        validStoredIds.length > 0 ? validStoredIds[0] : forms[0]._id;
      const { form: _form } = await FormAPI.RForm({
        params: { _id: firstFormId },
      });
      form = _form;
    }

    return {
      registrations,
      forms,
      form,
      documentData: zipSeasonsFormEvaluation(seasons),
    };
  };

  useEffect(() => {
    RData(currentSchool?.school)
      .then(
        async (res: {
          registrations: any[];
          forms: any[];
          form?: any;
          documentData: {};
        }) => {
          // registrations (teacher only)
          if (!isStudent) {
            setUsers(_.sortBy(res.registrations, ["grade", "userName"]));
          }

          // forms, form, documentData
          setPrintForms(res.forms);
          setFormData(res.form);
          setEvaluationData(res.documentData);

          // Load user's form selection from localStorage
          const storedIds = getSelectedFormIds(currentSchool.schoolId);
          const validIds = storedIds.filter((id: string) =>
            res.forms.some((f: any) => f._id === id)
          );
          setSelectedFormIds(validIds);
          if (validIds.length !== storedIds.length) {
            saveSelectedFormIds(currentSchool.schoolId, validIds);
          }

          // Student: auto-load own data
          if (isStudent && currentRegistration && res.forms.length > 0) {
            const dbData = await getDBData(
              currentRegistration._id,
              currentRegistration.user,
              res.documentData
            );
            setDBData(dbData);
          }
        }
      )
      .then(() => {
        setLoading(false);
      })
      .catch((err) => {
        ALERT_ERROR(err);
        setLoading(false);
      });
  }, []);

  const displayForms =
    selectedFormIds.length > 0
      ? printForms.filter((f: any) => selectedFormIds.includes(f._id))
      : printForms;

  const handleSelectionChange = (ids: string[]) => {
    setSelectedFormIds(ids);
    saveSelectedFormIds(currentSchool.schoolId, ids);

    if (ids.length > 0 && formData?._id && !ids.includes(formData._id)) {
      const firstSelectedForm = printForms.find((f: any) =>
        ids.includes(f._id)
      );
      if (firstSelectedForm) {
        FormAPI.RForm({ params: { _id: firstSelectedForm._id } })
          .then(({ form }) => {
            setFormData(form);
          })
          .catch((err) => ALERT_ERROR(err));
      }
    }
  };

  return (
    <>
      <div className={style.section}>
        <div className={style.search}>
          {!isStudent ? (
            <>
              <div className={style.label}>학생선택</div>
              <div className={style.search}>
                <StudentPicker
                  students={users}
                  schoolId={currentSchool.schoolId}
                  onSelect={({ rid, uid }) => {
                    const student = users.find(
                      (u) => u._id === rid || u.user === uid
                    );
                    const label = [
                      student?.userName,
                      student?.grade && `${student.grade}학년`,
                      student?.userId,
                    ]
                      .filter(Boolean)
                      .join(" · ");
                    setSelectedStudentLabel(label);
                    setLoading(true);
                    getDBData(rid, uid)
                      .then((res) => {
                        setDBData(res);
                      })
                      .catch((err) => {
                        ALERT_ERROR(err);
                      })
                      .finally(() => {
                        setLoading(false);
                      });
                  }}
                />
              </div>
            </>
          ) : (
            <div className={style.label}>문서</div>
          )}
          <div className={style.search}>
            <Select
              style={{ borderRadius: "4px" }}
              selectedValue={formData?._id}
              options={[
                ...displayForms.map((val: any) => {
                  return { text: val.title, value: val._id };
                }),
              ]}
              onChange={(val: string) => {
                FormAPI.RForm({ params: { _id: val } })
                  .then(({ form }) => {
                    setFormData(form);
                  })
                  .catch((err) => {
                    ALERT_ERROR(err);
                  });
              }}
            />
            <div
              className="btn"
              onClick={() => {
                window.print();
              }}
            >
              <Svg type={"print"} />
            </div>
            <div
              className="btn"
              onClick={() => {
                setSelectorPopupActive(true);
              }}
              title="문서 관리"
            >
              <Svg type={"settings"} />
            </div>
          </div>
        </div>
        {!loading ? (
          printForms.length > 0 ? (
            <EditorParser
              auth={isStudent ? "view" : "edit"}
              data={formData}
              dbData={DBData}
              type="archive"
            />
          ) : (
            <div style={{ padding: "24px", color: "var(--accent-3)" }}>
              조회 가능한 문서가 없습니다.
            </div>
          )
        ) : (
          <Loading height={"calc(100vh - 55px)"} />
        )}
      </div>

      {choosePopupActive && (
        <Popup setState={setChoosePopupActive} title="a" closeBtn>
          <div></div>
        </Popup>
      )}

      {selectorPopupActive && (
        <DocFormSelector
          forms={printForms}
          selectedIds={selectedFormIds}
          onSelectionChange={handleSelectionChange}
          setState={setSelectorPopupActive}
        />
      )}
    </>
  );
}

export default Docs;
