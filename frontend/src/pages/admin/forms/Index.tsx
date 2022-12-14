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
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "contexts/authContext";

import Svg from "assets/svg/Svg";

import Button from "components/button/Button";
import Input from "components/input/Input";
import NavigationLinks from "components/navigationLinks/NavigationLinks";
import Popup from "components/popup/Popup";
import Select from "components/select/Select";
import Tab from "components/tab/Tab";
import Table from "components/table/Table";
import useDatabase from "hooks/useDatabase";
import useSearch from "hooks/useSearch";
import style from "style/pages/admin/forms.module.scss";

type Props = {};

/**
 * admin form page
 * @param props
 * @returns {JSX.Element} Forms Page
 */

const Forms = (props: Props) => {
  const database = useDatabase();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [formList, setFormList] = useState([]);
  const search = useSearch(formList);

  const [view, setView] = useState<"list" | "grid">("grid");

  const [addFormPopupActive, setAddFormPopupActive] = useState<boolean>(false);

  const [inputFormTitle, setInputFormTitle] = useState<string>("");
  const [selectFormType, setSelectFormType] = useState<any>();

  /**
   * fetches the form list from the database
   * @async
   * @returns {Array} list of forms
   */
  async function getForms() {
    const { forms: res } = await database.R({ location: "forms" });
    setFormList(res.reverse());
    return res;
  }

  /**
   * adds a new form to the database
   * @async
   * @return null
   */

  async function addForm() {
    await database
      .C({
        location: "forms",
        data: {
          title: inputFormTitle,
          type: selectFormType,
          data: [],
        },
      })
      .then(() => {
        setIsLoading(true);
        setAddFormPopupActive(false);
      })
      .catch((error) => {
        if (error.response.status === 409) {
          alert("이미 존재하는 제목 입니다");
          setAddFormPopupActive(false);
        }
      });
  }

  useEffect(() => {
    if (currentUser.auth !== "admin" && currentUser.auth !== "manager") {
      alert("접근 권한이 없습니다.");
      navigate("/");
    } else {
      setIsLoading(true);
    }
  }, [currentUser]);

  useEffect(() => {
    if (isLoading) {
      getForms().then(() => {
        setIsLoading(false);
      });
    }
  }, [isLoading]);

  /**
   * form item container
   * @param {any} data
   * @returns {JSX.Element} form item element
   */
  const FormItem = ({ data }: { data: any }): JSX.Element => {
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
          <span className={style.more}>
            <Svg type={"verticalDots"} />
          </span>
        </div>
      </div>
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
                  : decodeURI(location.hash).replace("#", "") === "평가"
                  ? "evaluation"
                  : decodeURI(location.hash).replace("#", "") === "출력"
                  ? "print"
                  : "other"
              );
            }}
            style={{ height: "160px" }}
          >
            <div className={style.icon} style={{ height: "100%" }}>
              <Svg type="plus" width="32px" height="32px" />
            </div>
          </div>
          {search
            .result()
            .filter((value: any) => {
              if (type === undefined) {
                return true;
              }
              return value.type === type;
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
      <div className={style.section}>
        <NavigationLinks />
        <div className={style.title}>양식 관리</div>
        <div style={{ marginTop: "24px" }}>
          <Tab
            align={"flex-start"}
            items={{
              시간표: (
                <div style={{ marginTop: "24px" }}>
                  {view === "grid" ? (
                    <FormItems type={"timetable"} />
                  ) : (
                    <Table
                      type="object-array"
                      data={search.result().filter((value: any) => {
                        return value.type === "timetable";
                      })}
                      header={[
                        { type: "index", key: "", text: "ID", width: "48px" },
                        { type: "string", key: "title", text: "제목" },
                        {
                          type: "string",
                          key: "type",
                          text: "종류",
                          width: "240px",
                        },
                      ]}
                    />
                  )}
                </div>
              ),
              강의계획서: (
                <div style={{ marginTop: "24px" }}>
                  {view === "grid" ? (
                    <FormItems type={"syllabus"} />
                  ) : (
                    <Table
                      type="object-array"
                      data={search.result().filter((value: any) => {
                        return value.type === "syllabus";
                      })}
                      header={[
                        { type: "index", key: "", text: "ID", width: "48px" },
                        { type: "string", key: "title", text: "제목" },
                        {
                          type: "string",
                          key: "type",
                          text: "종류",
                          width: "240px",
                        },
                      ]}
                    />
                  )}
                </div>
              ),
              평가: (
                <div style={{ marginTop: "24px" }}>
                  {view === "grid" ? (
                    <FormItems type={"evaluation"} />
                  ) : (
                    <Table
                      type="object-array"
                      data={search.result().filter((value: any) => {
                        return value.type === "evaluation";
                      })}
                      header={[
                        { type: "index", key: "", text: "ID", width: "48px" },
                        { type: "string", key: "title", text: "제목" },
                        {
                          type: "string",
                          key: "type",
                          text: "종류",
                          width: "240px",
                        },
                      ]}
                    />
                  )}
                </div>
              ),
              출력: (
                <div style={{ marginTop: "24px" }}>
                  {view === "grid" ? (
                    <FormItems type={"print"} />
                  ) : (
                    <Table
                      type="object-array"
                      data={search.result().filter((value: any) => {
                        return value.type === "print";
                      })}
                      header={[
                        { type: "index", key: "", text: "ID", width: "48px" },
                        { type: "string", key: "title", text: "제목" },
                        {
                          type: "string",
                          key: "type",
                          text: "종류",
                          width: "240px",
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
                      data={search.result()}
                      header={[
                        { type: "index", key: "", text: "ID", width: "48px" },
                        { type: "string", key: "title", text: "제목" },
                        {
                          type: "string",
                          key: "type",
                          text: "종류",
                          width: "240px",
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
              </div>
            </div>
          </Tab>
        </div>
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
                  console.log(err);
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
              display: "flex",
              gap: "24px",
              minWidth: "500px",
            }}
          >
            <Input
              label="제목"
              required
              onChange={(e: any) => {
                setInputFormTitle(e.target.value);
              }}
            />
            <Select
              label="양식 종류"
              required
              defaultSelectedIndex={
                decodeURI(location.hash) === "#시간표"
                  ? 0
                  : decodeURI(location.hash) === "#강의계획서"
                  ? 1
                  : decodeURI(location.hash) === "#평가"
                  ? 2
                  : decodeURI(location.hash) === "#출력"
                  ? 3
                  : 4
              }
              options={[
                { text: "시간표", value: "timetable" },
                { text: "강의계획서", value: "syllabus" },
                { text: "평가", value: "evaluation" },
                { text: "출력", value: "print" },
                { text: "기타", value: "" },
              ]}
              onChange={(e: any) => {
                setSelectFormType(e);
                switch (e) {
                  case "timetable":
                    navigate("#시간표");
                    break;
                  case "syllabus":
                    navigate("#강의계획서");
                    break;
                  case "evaluation":
                    navigate("#평가");
                    break;
                  case "print":
                    navigate("#출력");
                    break;
                  case "":
                    navigate("#전체");
                    break;
                  default:
                    navigate("#전체");
                    break;
                }
              }}
            />
          </div>
        </Popup>
      )}
    </>
  );
};

export default Forms;
