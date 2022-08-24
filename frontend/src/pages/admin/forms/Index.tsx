import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Svg from "../../../assets/svg/Svg";
import Button from "../../../components/button/Button";
import Input from "../../../components/input/Input";
import NavigationLinks from "../../../components/navigationLinks/NavigationLinks";
import Popup from "../../../components/popup/Popup";
import Select from "../../../components/select/Select";
import Tab from "../../../components/tab/Tab";
import Table from "../../../components/table/Table";
import useDatabase from "../../../hooks/useDatabase";
import useSearch from "../../../hooks/useSearch";
import style from "../../../style/pages/admin/forms/forms.module.scss";

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

  const [formList, setFormList] = useState([]);
  const search = useSearch(formList);

  const [view, setView] = useState<"list" | "grid">("grid");
  const [updateFormList, setUpdateFormList] = useState<boolean>(true);

  const [addFormPopupActive, setAddFormPopupActive] = useState<boolean>(false);

  const [inputFormTitle, setInputFormTitle] = useState<string>("");
  const [selectFormType, setSelectFormType] = useState();
  const [isValid, setIsValid] = useState(false);

  /**
   * fetches the form list from the database
   * @async
   * @returns {Array} list of forms
   */
  async function getForms() {
    const { forms: res } = await database.R({ location: "forms/list" });
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
          data: { },
        },
      })
      .then(() => {
        setUpdateFormList(true);
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
    updateFormList &&
      getForms().then(() => {
        setUpdateFormList(false);
      });
  }, [updateFormList]);

  useEffect(() => {
    inputFormTitle !== "" ? setIsValid(true) : setIsValid(false);
  }, [inputFormTitle]);

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
      default:
        fileColor = "rgb(200, 200, 200)";
        break;
    }

    const Menu = () => {
      return <div>sd</div>;
    };
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
  const FormItems = ({ data }: { data: any[] }) => {
    return (
      <div className={style.content}>
        <div className={style.items}>
          {/* map from the back end */}
          <div
            className={style.item}
            onClick={() => {
              setAddFormPopupActive(true);
            }}
          >
            <div className={style.icon} style={{ height: "100%" }}>
              <Svg type="plus" width="32px" height="32px" />
            </div>
          </div>
          {data.map((value: any, index: number) => {
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
                    <FormItems
                      data={search.result().filter((value: any) => {
                        return value.type === "timetable";
                      })}
                    />
                  ) : (
                    <Table
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
                    <FormItems
                      data={search.result().filter((value: any) => {
                        return value.type === "syllabus";
                      })}
                    />
                  ) : (
                    <Table
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
                    <FormItems
                      data={search.result().filter((value: any) => {
                        return value.type === "evaluation";
                      })}
                    />
                  ) : (
                    <Table
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
              전체: (
                <div style={{ marginTop: "24px" }}>
                  {view === "grid" ? (
                    <FormItems data={search.result()} />
                  ) : (
                    <Table
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
        <Popup setState={setAddFormPopupActive} title="양식 추가">
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
              defaultSelected={
                decodeURI(location.hash) === "#시간표"
                  ? 0
                  : decodeURI(location.hash) === "#강의계획서"
                  ? 1
                  : decodeURI(location.hash) === "#평가"
                  ? 2
                  : 3
              }
              options={[
                { text: "시간표", value: "timetable" },
                { text: "강의계획서", value: "syllabus" },
                { text: "평가", value: "evaluation" },
                { text: "기타", value: "" },
              ]}
              onchange={(e: any) => {
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
          <div style={{ marginTop: "24px" }}>
            <Button
              disabled={!isValid}
              disableOnclick
              onClick={() => {
                addForm().catch((err) => {
                  console.log(err);
                });
              }}
            >
              추가
            </Button>
          </div>
        </Popup>
      )}
    </>
  );
};

export default Forms;
