/**
 * @file Form Index Page
 *
 * @author seedlessapple <luminousseedlessapple@gmail.com>
 *
 * -------------------------------------------------------
 *
 * IN PRODUCTION
 *
 * -------------------------------------------------------
 *
 * IN MAINTENANCE
 *
 * -------------------------------------------------------
 *
 * IN DEVELOPMENT
 *
 * -------------------------------------------------------
 *
 * DEPRECATED
 *
 * -------------------------------------------------------
 *
 * NOTES
 *
 * @version 1.0
 *
 */
import React, { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import style from "style/pages/admin/forms.module.scss";

// hooks
import Autofill from "components/input/Autofill";
import useSearch from "hooks/useSearch";
import EditorParser from "editor/EditorParser";
import _ from "lodash";
import Button from "components/button/Button";
import Input from "components/input/Input";
import NavigationLinks from "components/navigationLinks/NavigationLinks";
import { zipSeasonsFormEvaluation } from "functions/docs";
import Loading from "components/loading/Loading";
import Popup from "components/popup/Popup";
import Select from "components/select/Select";
import Skeleton from "components/skeleton/Skeleton";
import Tab from "components/tab/Tab";
import Table from "components/tableV2/Table";
import {
  dateFormat,
  flattenObject,
  objectDownloadAsCSV,
  objectDownloadAsJson,
  unflattenObject,
} from "functions/functions";

import { useAuth } from "contexts/authContext";
import Svg from "assets/svg/Svg";
import useOutsideClick from "hooks/useOutsideClick";
import Navbar from "layout/navbar/Navbar";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";

type Props = {};

/**
 * admin form page
 * @param props
 * @returns {JSX.Element} Forms Page
 */

const Forms = (props: Props) => {
  const location = useLocation();
  const [formList, setFormList] = useState([]);
  const search = useSearch(formList);
  const { FormAPI } = useAPIv2();
  const { currentUser } = useAuth();

  const [jsonData, setJsonData] = useState(null);
  const fileInput = useRef<HTMLInputElement | null>(null);

  const [view, setView] = useState<"list" | "grid">("list");

  const [addFormPopupActive, setAddFormPopupActive] = useState<boolean>(false);

  const [inputFormTitle, setInputFormTitle] = useState<string>("");
  const [selectFormType, setSelectFormType] = useState<
    "timetable" | "syllabus" | "print" | "other"
  >("timetable");
  const navigate = useNavigate();  const { ArchiveAPI, EnrollmentAPI, SeasonAPI } = useAPIv2();
    const { currentSchool, currentSeason } = useAuth();
    const [loading, setLoading] = useState<boolean>(true);
    const [formData, setFormData] = useState<any>();
    const [printForms, setPrintForms] = useState<any>([]);
    const [DBData, setDBData] = useState<any>();
    /* not users but registrations */
    const [users, setUsers] = useState<any[]>([]);
    const [grades, setGrades] = useState<any[]>([]);
    const [selectedGrade, setSelectedGrade] = useState<string>();
    const [choosePopupActive, setChoosePopupActive] = useState<boolean>(false);
  
    const [evaluationData, setEvaluationData] = useState<any>();
  
    async function getDBData(rid: string, uid: string) {
      const { archive } = await ArchiveAPI.RArchiveByRegistration({
        query: { registration: rid },
      });
  
      let processedEvaluationByYear: any = [];
  
      const { enrollments: _enrollments } =
        await EnrollmentAPI.REnrollmentsWithEvaluation({
          query: { student: uid, school: currentSchool.school },
        });
      const enrollments = _enrollments as any[];
  
      for (const enrollment of enrollments) {
        const IdByYear = `${enrollment.year}${_.join(enrollment.subject)}`;
  
        enrollment._subject = {};
        for (
          let idx = 0;
          idx < evaluationData?.subjectLabelsBySeason[enrollment?.season]?.length;
          idx++
        ) {
          enrollment._subject[
            evaluationData?.subjectLabelsBySeason[enrollment?.season][idx]
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
          archive: archive.data,
          evaluation: _.sortBy(processedEvaluationByYear, ["학년도","교과","과목"]),
        },
      };
    }

  const RData = async (school: string) => {
    const registrations = currentSeason?.registrations.filter(
      (reg) => reg.role === "student"
    );
    const [{ forms }, { seasons }] = await Promise.all([
      FormAPI.RForms({ query: { type: "print", archived: false } }),
      SeasonAPI.RSeasons({ query: { school: currentSchool?.school } }),
    ]);

    let form: object | undefined = undefined;
    if (forms.length > 0) {
      const { form: _form } = await FormAPI.RForm({
        params: { _id: forms[0]._id },
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
          (res: {
            registrations: any[];
            forms: any[];
            form?: any;
            documentData: {};
          }) => {
            // registrations
            const g: any = _.uniqBy(res.registrations, "grade");
            setGrades(
              g.map((val: any) => {
                return { text: val.grade, value: val.grade };
              })
            );
            setSelectedGrade(g[0]?.grade);
            setUsers(_.sortBy(res.registrations, ["userName"]));
  
            // forms, form, documentData
            setPrintForms(res.forms);
            setFormData(res.form);
            setEvaluationData(res.documentData);
          }
        )
        .then(() => {
          setLoading(false);
        });
    getForms();
  }, []);


  /**
   * upload json data
   * @returns upload json data & create form
   */
  
  const handleProfileUploadButtonClick = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (fileInput.current) fileInput.current.click();
  };

  const handleFileChange = (e:any) => {
    const file = e.target.files[0];
    if (file) {
      // 파일이 선택되었을 때 처리
      const reader = new FileReader();

      // 파일 읽기가 완료되었을 때
      reader.onload = (e:any) => {
        try {
          // 파일 내용을 JSON으로 파싱
          const data = JSON.parse(e.target.result);
          setJsonData(data);
          // 데이터 베이스에 저장하기
            try {
              FormAPI.CForm({
                data: {
                  title: data.title + "의 사본",
                  type: data.type,
                  data: data.data,
                },
              });
              alert(SUCCESS_MESSAGE);
              getForms();
            } catch (err) {
              ALERT_ERROR(err);
            }
        } catch (err) {
          ALERT_ERROR(err);
          setJsonData(null);
        }
      };

      // 파일 읽기 오류 처리
      reader.onerror = (err) => {
        ALERT_ERROR(err);
        setJsonData(null);
      };

      // 파일 읽기 시작
      reader.readAsText(file);
    }
  };

  /**
   * fetches the form list from the database
   * @async
   * @returns {Array} list of forms
   */
  async function getForms() {
    try {
      const { forms } = await FormAPI.RForms({});
      setFormList(forms.reverse());
      return forms;
    } catch (err) {
      ALERT_ERROR(err);
    }
  }

  /**
   * adds a new form to the database
   * @async
   * @return null
   */
  async function addForm() {
    try {
      if (selectFormType === "other") return;
      await FormAPI.CForm({
        data: {
          title: inputFormTitle,
          type: selectFormType,
          data: [],
        },
      });
      alert(SUCCESS_MESSAGE);
      getForms();
      setAddFormPopupActive(false);
    } catch (err) {
      ALERT_ERROR(err);
      setAddFormPopupActive(false);
    }
  }

  /**
   * form item container
   * @param {any} data
   * @returns {JSX.Element} form item element
   */
  const FormItem = ({ data }: { data: any }): JSX.Element => {

    const navigate = useNavigate();
    const outsideclick = useOutsideClick();

    let fileColor;
    switch (data.type) {
      case "timetable":
        fileColor = "rgb(128, 128, 255)";
        break;
      case "evaluation":
        fileColor = "rgb(84, 255, 128)";
        break;
      case "syllabus":
        fileColor = "rgb(255, 128, 128)";
        break;
      case "print":
        fileColor = "rgb(255, 212, 94)";
        break;
      default:
        fileColor = "rgb(200, 200, 200)";
        break;
    }

    return (
      <>
        <div className={style.item} title={data.title}>
          <div
            className={style.icon}
            onClick={() => {
              navigate(data._id);
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 315 415"
              width={"64px"}
              height={"64px"}
            >
              <path
                style={{
                  strokeMiterlimit: 10,
                  strokeWidth: "10px",
                  fillOpacity: 0.2,
                  fill: fileColor,
                  stroke: fileColor,
                }}
                d="M394.55,450h-300V50h200l100,100Z"
                transform="translate(-89.55 -45)"
              />
            </svg>
            <div
              className={style.type}
              style={{ color: fileColor }}
            >{`.${data.type.substring(0, 4)}`}</div>
          </div>
          <div className={style.info}>
            <span
              className={style.title}
              onClick={() => {
                navigate(data._id);
              }}
            >
              {data.title}
            </span>
            <span
              className={style.more}
              ref={outsideclick.RefObject}
              onClick={() => {
                outsideclick.setActive(true);
              }}
              style={{zIndex: "2"}}
            >
              <Svg type={"verticalDots"} />
              {outsideclick.active &&
                (!data.archived ? (
                  <div className={style.menu}>
                    <div
                      className={style.menu_item}
                      onClick={() => {
                        FormAPI.CCopyForm({
                          params: { _id: data._id },
                        })
                          .then(() => {
                            alert(SUCCESS_MESSAGE);
                            getForms();
                          })
                          .catch((err) => {
                            ALERT_ERROR(err);
                          });
                      }}
                    >
                      복사하기
                    </div>
                    <div
                      className={style.menu_item}
                      onClick={() => {
                        FormAPI.UArchiveForm({ params: { _id: data._id } })
                          .then(() => {
                            alert(SUCCESS_MESSAGE);
                            getForms();
                          })
                          .catch((err) => {
                            ALERT_ERROR(err);
                          });
                      }}
                    >
                      보관하기
                    </div>
                    <div
                      className={style.menu_item}
                      onClick={async() =>{                             
                          try {
                            const { form } = await FormAPI.RForm({ params: { _id: data._id } });
                            objectDownloadAsJson(form);
                            alert(SUCCESS_MESSAGE);
                          } catch (err) {
                            ALERT_ERROR(err);
                          }}
                      }
                    >
                      다운로드
                    </div>
                  </div>
                ) : (
                  <div className={style.menu}>
                    <div
                      className={style.menu_item}
                      onClick={() => {
                        FormAPI.DForm({ params: { _id: data._id } })
                          .then(() => {
                            alert(SUCCESS_MESSAGE);
                            getForms();
                          })
                          .catch((err) => {
                            ALERT_ERROR(err);
                          });
                      }}
                    >
                      삭제
                    </div>
                    <div
                      className={style.menu_item}
                      onClick={() => {
                        FormAPI.URestoreForm({
                          params: { _id: data._id },
                        })
                          .then(() => {
                            alert(SUCCESS_MESSAGE);
                            getForms();
                          })
                          .catch((err) => {
                            ALERT_ERROR(err);
                          });
                      }}
                    >
                      복원
                    </div>
                    <div
                      className={style.menu_item}
                      onClick={async() =>{                             
                          try {
                            const { form } = await FormAPI.RForm({ params: { _id: data._id } });
                            objectDownloadAsJson(form);
                            alert(SUCCESS_MESSAGE);
                          } catch (err) {
                            ALERT_ERROR(err);
                          }}
                      }
                    >
                      다운로드
                    </div>
                  </div>
                ))}
            </span>
          </div>
        </div>
      </>
    );
  };

  /**
   *
   * @param {any[]} data
   * @returns {JSX.Element} a grid of form items
   */
  const FormItems = ({ type }: { type?: string }) => {
    return (
      <div className={style.content}>
        <div className={style.items}>
          {/* map from the back end */}
          {type !== "archived" && (
            <div
              className={style.item}
              onClick={() => {
                setAddFormPopupActive(true);
                setInputFormTitle("");
                setSelectFormType(
                  decodeURI(location.hash).replace("#", "") === "시간표"
                    ? "timetable"
                    : decodeURI(location.hash).replace("#", "") === "강의계획서"
                    ? "syllabus"
                    : decodeURI(location.hash).replace("#", "") === "출력"
                    ? "print"
                    : "other"
                );
              }}
              // style={{ height: "160px" }}
            >
              <div className={style.icon} style={{ height: "100%" }}>
                <Svg type="plus" width="32px" height="32px" />
              </div>
            </div>
          )}
          {search
            .result()
            .filter((value: any) => {
              if (type === undefined && !value.archived) {
                return true;
              }
              if (type === "archived") {
                return value.archived === true;
              }
              return !value.archived && value.type === type;
            })
            .map((value: any, index: number) => {
              return <FormItem key={index} data={value} />;
            })}
        </div>
      </div>
    );
  };

  return (
    <>
      <Navbar />
      <div className={style.section}>
        <div style={{ display: "flex", gap: "24px" }}>
          <div style={{ flex: "1 1 0" }}>
            <div className={style.title}>문서</div>
            <div className={style.description}>
              {currentUser !== undefined ? (
                `${currentUser.academyName} / ${currentUser.academyId}`
              ) : (
                <Skeleton height="22px" width="20%" />
              )}
            </div>
          </div>
        </div>
          <Tab
            align={"flex-start"}
            items={{
              출력: (
                <div style={{ marginTop: "24px" }}>
                  {view === "grid" ? (
                    <FormItems type={"print"} />
                  ) : (
                    <Table
                      type="object-array"
                      data={search
                        .result()
                        .filter(
                          (value: any) =>
                            value.type === "print" && !value.archived
                        )}
                      header={[
                        {
                          text: "No",
                          type: "text",
                          key: "tableRowIndex",
                          width: "48px",
                          textAlign: "center",
                        },
                        { 
                          type: "text", 
                          key: "title", 
                          text: "제목", 
                          onClick: async(e: any) => {                              
                              try {
                                const { form } = await FormAPI.RForm({ params: { _id: e._id } });
                                console.log(e);
                                setFormData(form);
                              } catch (err) {
                                ALERT_ERROR(err);
                              }
                          },
                        },
                        { 
                          type: "text", 
                          key: "userName", 
                          text: "작성자",
                          textAlign: "center",
                        },
                        {
                          type: "button",
                          key: "copy",
                          text: "복사",
                          onClick: (e: any) => {
                            FormAPI.CCopyForm({
                              params: { _id: e._id },
                            })
                              .then(() => {
                                alert(SUCCESS_MESSAGE);
                                getForms();
                              })
                              .catch((err) => {
                                ALERT_ERROR(err);
                              });
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
                        {
                          type: "button",
                          key: "archive",
                          text: "보관",
                          onClick: (e: any) => {
                            FormAPI.UArchiveForm({ params: { _id: e._id } })
                              .then(() => {
                                alert(SUCCESS_MESSAGE);
                                getForms();
                              })
                              .catch((err) => {
                                ALERT_ERROR(err);
                              });
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
                        {
                          type: "button",
                          key: "json",
                          text: "다운로드",
                          onClick: async(e: any) => {                              
                              try {
                                const { form } = await FormAPI.RForm({ params: { _id: e._id } });
                                objectDownloadAsJson(form);
                                alert(SUCCESS_MESSAGE);
                              } catch (err) {
                                ALERT_ERROR(err);
                              }
                          },
                          width: "100px",
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
              ),
              전체: (
                <div style={{ marginTop: "24px" }}>
                  {view === "grid" ? (
                    <FormItems />
                  ) : (
                    <Table
                      type="object-array"
                      data={search.result().filter((value: any) => {
                        return !value.archived;
                      })}
                      header={[
                        {
                          text: "No",
                          type: "text",
                          key: "tableRowIndex",
                          width: "48px",
                          textAlign: "center",
                        },
                        { 
                          type: "text", 
                          key: "title", 
                          text: "제목", 
                          onClick: (e: any) => {
                            navigate(e._id);
                        }},
                        { 
                          type: "text", 
                          key: "userName", 
                          text: "작성자",
                          textAlign: "center",
                        },
                        {
                          type: "button",
                          key: "copy",
                          text: "복사",
                          onClick: (e: any) => {
                            FormAPI.CCopyForm({
                              params: { _id: e._id },
                            })
                              .then(() => {
                                alert(SUCCESS_MESSAGE);
                                getForms();
                              })
                              .catch((err) => {
                                ALERT_ERROR(err);
                              });
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
                        {
                          type: "button",
                          key: "archive",
                          text: "보관",
                          onClick: (e: any) => {
                            FormAPI.UArchiveForm({ params: { _id: e._id } })
                              .then(() => {
                                alert(SUCCESS_MESSAGE);
                                getForms();
                              })
                              .catch((err) => {
                                ALERT_ERROR(err);
                              });
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
                        {
                          type: "button",
                          key: "json",
                          text: "다운로드",
                          onClick: async(e: any) => {                              
                              try {
                                const { form } = await FormAPI.RForm({ params: { _id: e._id } });
                                objectDownloadAsJson(form);
                                alert(SUCCESS_MESSAGE);
                              } catch (err) {
                                ALERT_ERROR(err);
                              }
                          },
                          width: "100px",
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
              ),
              보관됨: (
                <div style={{ marginTop: "24px" }}>
                  {view === "grid" ? (
                    <FormItems type={"archived"} />
                  ) : (
                    <Table
                      type="object-array"
                      data={search.result().filter((value: any) => {
                        return value.archived === true;
                      })}
                      header={[
                        {
                          text: "No",
                          type: "text",
                          key: "tableRowIndex",
                          width: "48px",
                          textAlign: "center",
                        },
                        { 
                          type: "text", 
                          key: "title", 
                          text: "제목", 
                          onClick: (e: any) => {
                            navigate(e._id);
                        }},
                        { 
                          type: "text", 
                          key: "userName", 
                          text: "작성자",
                          textAlign: "center",
                        },
                        {
                          type: "button",
                          key: "delete",
                          text: "삭제",
                          onClick: (e: any) => {
                            FormAPI.DForm({ params: { _id: e._id } })
                              .then(() => {
                                alert(SUCCESS_MESSAGE);
                                getForms();
                              })
                              .catch((err) => {
                                ALERT_ERROR(err);
                              });
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
                        {
                          type: "button",
                          key: "archive",
                          text: "복원",
                          onClick: (e: any) => {
                            FormAPI.URestoreForm({
                              params: { _id: e._id },
                            })
                              .then(() => {
                                alert(SUCCESS_MESSAGE);
                                getForms();
                              })
                              .catch((err) => {
                                ALERT_ERROR(err);
                              });
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
                        {
                          type: "button",
                          key: "json",
                          text: "다운로드",
                          onClick: async(e: any) => {                              
                              try {
                                const { form } = await FormAPI.RForm({ params: { _id: e._id } });
                                objectDownloadAsJson(form);
                                alert(SUCCESS_MESSAGE);
                              } catch (err) {
                                ALERT_ERROR(err);
                              }
                          },
                          width: "100px",
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
              ),
            }}
          >
            <div
              className={style.search}
              style={{ margin: "24px 0", display: "flex" }}
            >
              <Input
                placeholder={"제목으로 검색"}
                defaultValue={
                  search.filters.filter((val) => val.id === "search")[0]?.value
                }
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  search.addFilterItem({
                    id: "search",
                    key: "title",
                    operator: "=",
                    value: e.target.value,
                  });
                }}
              />
              <div className={style.btns}>
                <div
                  className={`${style.btn} ${view === "grid" && style.active}`}
                  onClick={() => {
                    setView("grid");
                  }}
                >
                  <Svg type="grid" width="20px" height="20px" />
                </div>
                <div
                  className={`${style.btn} ${view === "list" && style.active}`}
                  onClick={() => {
                    setView("list");
                  }}
                >
                  <Svg type="list" width="26px" height="26px" />
                </div>
                <div
                  className={style.btn}
                  onClick={(e: any) => {
                    handleProfileUploadButtonClick(e);
                  }}
                >
                  <Svg type="upload" width="26px" height="26px" />
                </div>
                <input
                  type="file"
                  ref={fileInput}
                  style={{ display: "none" }}
                  onChange={(e: any) => {
                    handleFileChange(e);
                    e.target.value = "";
                  }}
          />
              </div>
            </div>
          </Tab>
      </div>
      {addFormPopupActive && (
        <Popup
          setState={setAddFormPopupActive}
          title="양식 추가"
          footer={
            <Button
              disabled={inputFormTitle === ""}
              disableOnclick
              onClick={() => {
                addForm().catch((err) => {
                });
                setAddFormPopupActive(false);
              }}
            >
              추가
            </Button>
          }
        >
          <div
            style={{
              marginTop: "12px",
            }}
          >
            <Input
              label="제목"
              required
              onChange={(e: any) => {
                setInputFormTitle(e.target.value);
              }}
            />
          </div>

          <div className={style.select_form}>
            <div
              className={`${style.form} ${
                selectFormType === "timetable" && style.active
              }`}
              onClick={() => {
                setSelectFormType("timetable");
              }}
            >
              시간표
            </div>
            <div
              className={`${style.form} ${
                selectFormType === "syllabus" && style.active
              }`}
              onClick={() => {
                setSelectFormType("syllabus");
              }}
            >
              강의계획서
            </div>
            <div
              className={`${style.form} ${
                selectFormType === "print" && style.active
              }`}
              onClick={() => {
                setSelectFormType("print");
              }}
            >
              출력
            </div>
          </div>
        </Popup>
      )}
        <div className={style.search}>
          <div className={style.label}>학생선택</div>
          <div className={style.search}>
            <Select
              options={grades}
              onChange={(val: string) => {
                setSelectedGrade(val);
              }}
              className={style.selectGrade}
              style={{ borderRadius: "4px", maxWidth: "120px" }}
            />
            <Autofill
              style={{ borderRadius: "4px" }}
              options={[
                { text: "", value: "" },
                ...users
                  ?.filter((val) => val.grade === selectedGrade)
                  .map((val) => {
                    return {
                      value: JSON.stringify({
                        rid: val._id,
                        uid: val.user,
                      }),
                      text: `${val.userName} / ${val.userId}`,
                    };
                  }),
              ]}
              onChange={(value: string | number) => {
                if (value === "") return;
                setLoading(true);
                if (value !== "") {
                  const { rid, uid } = JSON.parse(`${value}`);
                  getDBData(rid, uid).then((res) => {
                    console.log(value);
                    setDBData(res);
                    setLoading(false);
                  });
                }
              }}
              placeholder={"검색"}
            />
          </div>
          <div className={style.search}>
            <Select
              style={{ borderRadius: "4px" }}
              options={[
                ...printForms.map((val: any) => {
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
          </div>
        </div>
        {!loading ? (
          <EditorParser
            auth="edit"
            data={formData}
            dbData={DBData}
            type="archive"
          />
        ) : (
          <Loading height={"calc(100vh - 55px)"} />
        )}
    </>
  );
};

export default Forms;
