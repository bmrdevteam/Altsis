import Svg from "assets/svg/Svg";
import Button from "components/button/Button";
import Popup from "components/popup/Popup";
import Select from "components/select/Select";
import Tree, { TreeItem } from "components/tree/Tree";
import { useEditor } from "editor/functions/editorContext";
import React, { useEffect, useRef, useState } from "react";
import style from "../../editor.module.scss";
import useAPIv2 from "hooks/useAPIv2";
import { TSchool } from "types/schools";
import { zipSeasonsFormEvaluation } from "functions/docs";
import _ from "lodash";

type Props = {
  callPageReload: () => void;
};

const DataConnPopup = (props: Props) => {
  const { SchoolAPI, SeasonAPI } = useAPIv2();

  const {
    changeCurrentCell,
    getCurrentCell,
    changeCurrentBlockData,
    getCurrentBlock,
    getCurrentCellIndex,
  } = useEditor();

  const [schools, setSchools] = useState<TSchool[]>([]);
  const [archiveData, setArchiveData] = useState<any>();
  const [evaluationData, setEvaluationData] = useState<any>();

  const textareaRef = useRef<HTMLDivElement>(null);

  const repeat = useRef<any>({
    by: getCurrentBlock()?.data?.dataRepeat?.by ?? "",
    index: getCurrentBlock()?.data?.dataRepeat?.index ?? "",
  });
  const [filters, setFilters] = useState<any[]>(
    getCurrentBlock()?.data?.dataFilter ?? []
  );
  const filtersRef = useRef<any[]>(getCurrentBlock()?.data?.dataFilter ?? []);
  const [orFilters, setOrFilters] = useState<any[]>(
    getCurrentBlock()?.data?.dataOrFilter ?? []
  );
  const orFiltersRef = useRef<any[]>(getCurrentBlock()?.data?.dataOrFilter ?? []);
  const [cellFilters, setCellFilters] = useState<any[]>(
    getCurrentBlock()?.data?.dataCellFilter ?? []
  );
  const cellFiltersRef = useRef<any[]>(getCurrentBlock()?.data?.dataCellFilter ?? []);
  const [orders, setOrders] = useState<any[]>(
    getCurrentBlock()?.data?.dataOrder ?? []
  );
  const ordersRef = useRef<any[]>(getCurrentBlock()?.data?.dataOrder ?? []);
  const [tableBlockMenuPopup, setTableBlockMenuPopup] =
    useState<boolean>(false);
  useEffect(() => {
    SchoolAPI.RSchools().then(({ schools }) => {
      schools.map((school) => {
        const formArchive = school.formArchive.map((item) => {
          const fields = _.filter(
            item.fields,
            (field) => field.type !== "file"
          );
          return { ...item, fields };
        });
        setArchiveData((prev: any) => ({
          ...prev,
          [school._id]: formArchive,
        }));

        SeasonAPI.RSeasons({ query: { school: school._id } }).then(
          ({ seasons }) => {
            setEvaluationData((prev: any) => ({
              ...prev,
              [school._id]: zipSeasonsFormEvaluation(seasons),
            }));
          }
        );
      });
      setSchools(schools);
    });
  }, []);

  function handleOnclick({
    location,
    label,
  }: {
    location: string;
    label: string;
  }) {
    const textarea = document.getElementById("textarea");
    const data = document.createElement("data");
    data.contentEditable = "false";
    data.innerText = label;
    data.className = style.data;
    // data.setAttribute("name", "DBData");
    data.setAttribute("data-location", location);
    try {
      const selection = window.getSelection()?.getRangeAt(0);

      if (
        selection?.commonAncestorContainer.parentElement?.id ===
        "textareaContainer"
      ) {
        selection?.insertNode(document.createTextNode(" "));
        selection?.insertNode(data);
      }
    } catch {}

    setTimeout(() => {
      textareaRef.current?.blur();
      window.getSelection()?.empty();
    });
  }

  return (
    <>
      <Button
        type="ghost"
        style={{ height: "32px", marginTop: "8px" }}
        onClick={() => {
          setTableBlockMenuPopup(true);
        }}
      >
        데이터 연결
      </Button>
      {tableBlockMenuPopup && (
        <Popup
          setState={setTableBlockMenuPopup}
          title="데이터 연결"
          contentScroll
          closeBtn
          style={{ width: "800px" }}
          footer={
            <Button
              onClick={() => {
                let result: any[] = [];
                textareaRef.current?.childNodes.forEach((Element: any) => {
                  if (Element.nodeType === 3 && Element.textContent !== "") {
                    result.push(Element.textContent);
                  }
                  if (Element.nodeType === 1 && Element.nodeName === "DATA") {
                    result.push({
                      tag: "DATA",
                      location: Element.dataset.location,
                    });
                  }
                  if (Element.nodeType === 1 && Element.nodeName === "BR") {
                    result.push({ tag: "BR" });
                  }
                });
                changeCurrentCell({
                  dataText: result,
                });
                changeCurrentBlockData({
                  dataRepeat: repeat.current,
                  dataFilter: filtersRef.current,
                  dataOrFilter: orFiltersRef.current,
                  dataOrder: ordersRef.current,
                  dataCellFilter: cellFiltersRef.current,
                });

                props.callPageReload();
              }}
              type="ghost"
            >
              저장
            </Button>
          }
        >
          <div className={style.cell_data_conn_popup}>
            <div className={style.content}>
              <div className={style.select_data}>
                <div className={style.title}>데이터 선택</div>
                <Tree>
                  {schools?.map((school: any) => {
                    return (
                      <TreeItem
                        key={school.schoolId}
                        text={school.schoolName}
                        subItem={[
                          <TreeItem
                            text="아카이브"
                            key={"archive"}
                            subItem={archiveData[school._id]?.map(
                              (archive: any) => {
                                return (
                                  <TreeItem
                                    key={`${school.schoolId}//archive//${archive.label}`}
                                    text={archive.label}
                                    subItem={
                                      archive.fields &&
                                      archive.fields?.map((v: any) => {
                                        let returnArchive = [
                                          <TreeItem
                                            key={`${school.schoolId}//archive//${archive.label}//${v.label}`}
                                            text={`${v.label}`}
                                            onClick={() => {
                                              handleOnclick({
                                                location: `${school.schoolId}//archive//${archive.label}//${v.label}`,
                                                label: v.label,
                                              });
                                            }}
                                          />,
                                        ];
                                        if (v.runningTotal)
                                          returnArchive.push(
                                            <TreeItem
                                              key={`${school.schoolId}//archive//${archive.label}//${v.label}[누계합산]`}
                                              text={`${v.label}[누계합산]`}
                                              onClick={() => {
                                                handleOnclick({
                                                  location: `${school.schoolId}//archive//${archive.label}//${v.label}[누계합산]`,
                                                  label: `${v.label}[누계합산]`,
                                                });
                                              }}
                                            />
                                          );
                                        if (v.total)
                                          returnArchive.push(
                                            <TreeItem
                                              key={`${school.schoolId}//archive//${archive.label}//${v.label}[합산]`}
                                              text={`${v.label}[합산]`}
                                              onClick={() => {
                                                handleOnclick({
                                                  location: `${school.schoolId}//archive//${archive.label}//${v.label}[합산]`,
                                                  label: `${v.label}[합산]`,
                                                });
                                              }}
                                            />
                                          );

                                        return returnArchive;
                                      })
                                    }
                                  />
                                );
                              }
                            )}
                          />,
                          <TreeItem
                            text="평가"
                            key={"evaluation-1"}
                            subItem={[
                              <TreeItem
                                key={"학년도"}
                                text={"학년도"}
                                onClick={() => {
                                  handleOnclick({
                                    location: `${
                                      school.schoolId
                                    }//evaluation//${"학년도"}`,
                                    label: "학년도",
                                  });
                                }}
                              />,
                              <TreeItem
                                key={"학기"}
                                text={"학기"}
                                onClick={() => {
                                  handleOnclick({
                                    location: `${
                                      school.schoolId
                                    }//evaluation//${"학기"}`,
                                    label: "학기",
                                  });
                                }}
                              />,
                              <TreeItem
                                key={"학년"}
                                text={"학년"}
                                onClick={() => {
                                  handleOnclick({
                                    location: `${
                                      school.schoolId
                                    }//evaluation//${"학년"}`,
                                    label: "학년",
                                  });
                                }}
                              />,
                              <>
                                {evaluationData && evaluationData?.[school._id]?.subjectLabels?.map(
                                  (subLabel: string) => (
                                    <TreeItem
                                      key={subLabel}
                                      text={subLabel}
                                      onClick={() => {
                                        handleOnclick({
                                          location: `${school.schoolId}//evaluation//${subLabel}`,
                                          label: subLabel,
                                        });
                                      }}
                                    />
                                  )
                                )}
                              </>,
                              <>
                                {evaluationData &&evaluationData?.[
                                  school._id
                                ]?.evaluationFieldsByYear?.map(
                                  (evField: {
                                    label: string;
                                    type: string;
                                  }) => {
                                    const text = `연도별/${evField.label}`;
                                    return (
                                      <TreeItem
                                        key={text}
                                        text={text}
                                        onClick={() => {
                                          handleOnclick({
                                            location: `${school.schoolId}//evaluation//${text}`,
                                            label: text,
                                          });
                                        }}
                                      />
                                    );
                                  }
                                )}
                              </>,
                              evaluationData?.[school._id]?.terms?.map(
                                (term: string) => {
                                  return (
                                    <>
                                      <TreeItem
                                        key={`${term}/단위수`}
                                        text={`${term}/단위수`}
                                        onClick={() => {
                                          handleOnclick({
                                            location: `${
                                              school.schoolId
                                            }//evaluation//${`${term}/단위수`}`,
                                            label: `${term}/단위수`,
                                          });
                                        }}
                                      />
                                      <TreeItem
                                        key={`${term}/단위수[합산]`}
                                        text={`${term}/단위수[합산]`}
                                        onClick={() => {
                                          handleOnclick({
                                            location: `${
                                              school.schoolId
                                            }//evaluation//${`${term}/단위수[합산]`}`,
                                            label: `${term}/단위수[합산]`,
                                          });
                                        }}
                                      />
                                      {evaluationData?.[
                                        school._id
                                      ]?.evaluationFieldsByTerm[term]?.map(
                                        (evField: {
                                          label: string;
                                          type: string;
                                        }) => {
                                          const text = `${term}/${evField.label}`;
                                          return (
                                            <TreeItem
                                              key={text}
                                              text={text}
                                              onClick={() => {
                                                handleOnclick({
                                                  location: `${school.schoolId}//evaluation//${text}`,
                                                  label: text,
                                                });
                                              }}
                                            />
                                          );
                                        }
                                      )}
                                    </>
                                  );
                                }
                              ),
                            ]}
                          />,
                        ]}
                      />
                    );
                  })}
                </Tree>
              </div>
              <div className={style.divider}></div>
              <div style={{ flex: "1 1 0", overflow: "hidden" }}>
                <div className={style.title}>데이터 옵션</div>
                <div
                  style={{
                    borderRadius: "4px",
                  }}
                  id="textareaContainer"
                >
                  <div className={style.title}></div>
                  <div className={style.title}></div>
                  <div
                    contentEditable
                    ref={textareaRef}
                    suppressContentEditableWarning
                    placeholder="데이터 입력"
                    className={style.text}
                    onKeyDown={(e) => {
                      if (e.key === "Backspace") {
                        if (
                          textareaRef.current?.childNodes.length === 1 &&
                          textareaRef.current?.childNodes[0].nodeName === "BR"
                        ) {
                          textareaRef.current.innerHTML = "";
                        }
                      }
                    }}
                  >
                    {getCurrentCell()?.dataText?.map(
                      (dataTextElement: any, index: number) => {
                        if (typeof dataTextElement === "object") {
                          if (dataTextElement.tag === "DATA") {
                            const arr = dataTextElement.location?.split("//");
                            return (
                              <data
                                key={index}
                                className={style.data}
                                contentEditable={false}
                                data-location={dataTextElement.location}
                              >
                                {arr ? arr[arr.length - 1] : ""}
                              </data>
                            );
                          }
                          if (dataTextElement.tag === "BR") {
                            return <br key={index} />;
                          }
                        } else {
                          if (dataTextElement === " ") {
                            return <span key={index}>&nbsp;</span>;
                          }
                          return dataTextElement;
                        }
                      }
                    )}
                  </div>
                  <div>
                    <div className={style.item}>
                      <label>테이블 반복 설정</label>
                      <select
                        name=""
                        id=""
                        defaultValue={repeat.current.by}
                        onChange={(e) => {
                          repeat.current.by = e.target.value;
                        }}
                      >
                        <option key={"none"} value="">
                          없음
                        </option>
                        {schools.map((s: any, i: number) => {
                          return archiveData[s._id]?.map(
                            (val: any, index: number) => {
                              return (
                                <option
                                  key={`${s}-${index}`}
                                  value={`${s.schoolId}//archive//${val.label}`}
                                >
                                  {`${s.schoolName}-${val.label}`}
                                </option>
                              );
                            }
                          );
                        })}

                        {schools.map((s: any, i: number) => {
                          return (
                            <option
                              key={`${s.schoolId}//evaluation`}
                              value={`${s.schoolId}//evaluation`}
                            >
                              {`${s.schoolName}-평가`}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    <div className={style.item}>
                      <label>테이블 반복 시작 행</label>

                      <select
                        name=""
                        id=""
                        defaultValue={repeat.current.index}
                        onChange={(e) => {
                          repeat.current.index = parseInt(e.target.value);
                        }}
                      >
                        {getCurrentBlock()?.data?.table?.map(
                          (val: any, index: number) => {
                            return (
                              <option key={index} value={index}>
                                {getCurrentCellIndex().row === index
                                  ? `${index + 1} - 현재 셀`
                                  : index + 1}
                              </option>
                            );
                          }
                        )}
                      </select>
                    </div>
                    <div className={style.filters}>
                      <label>
                        AND 필터
                      </label>
                      {filters.map((value, index) => {
                        return (
                          <div className={style.filter} key={value.key}>
                            <input
                              type="text"
                              placeholder="필드"
                              defaultValue={value.by}
                              onChange={(e) => {
                                filtersRef.current.find(
                                  (v) => v.key === value.key
                                ).by = e.target.value;
                              }}
                            />
                            <select
                              defaultValue={value.operator}
                              onChange={(e) => {
                                filtersRef.current.find(
                                  (v) => v.key === value.key
                                ).operator = e.target.value;
                              }}
                            >
                              <option value="===">==</option>
                              <option value="!==">!=</option>
                            </select>
                            <input
                              type="text"
                              placeholder="값"
                              onChange={(e) => {
                                filtersRef.current.find(
                                  (v) => String(v.key) === String(value.key)
                                ).value = e.target.value;
                              }}
                              defaultValue={value.value}
                            />
                            <span
                              className={style.icon}
                              onClick={() => {
                                filtersRef.current = filtersRef.current.filter(
                                  (v) => String(v.key) !== String(value.key)
                                );
                                setFilters(filtersRef.current.slice());
                              }}
                            >
                              <Svg type={"x"} />
                            </span>
                          </div>
                        );
                      })}
                      <div
                        className={style.btn}
                        onClick={() => {
                          const id = Math.random()
                            .toString(36)
                            .substring(2, 11);
                          filtersRef.current.push({
                            key: id,
                            by: "",
                            operator: "===",
                            value: "",
                          });
                          setFilters(filtersRef.current.slice());
                        }}
                      >
                        추가
                      </div>
                    </div>
                    <div className={style.orfilters}>
                      <label>
                        OR 필터
                      </label>
                      {orFilters.map((value, index) => {
                        return (
                          <div className={style.orfilter} key={value.key}>
                            <input
                              type="text"
                              placeholder="필드"
                              defaultValue={value.by}
                              onChange={(e) => {
                                orFiltersRef.current.find(
                                  (v) => String(v.key) === String(value.key)
                                ).by = e.target.value;
                              }}
                            />
                            <select
                              defaultValue={value.operator}
                              onChange={(e) => {
                                orFiltersRef.current.find(
                                  (v) => String(v.key) === String(value.key)
                                ).operator = e.target.value;
                              }}
                            >
                              <option value="===">==</option>
                              <option value="!==">!=</option>
                            </select>
                            <input
                              type="text"
                              placeholder="값"
                              onChange={(e) => {
                                orFiltersRef.current.find(
                                  (v) => String(v.key) === String(value.key)
                                ).value = e.target.value;
                              }}
                              defaultValue={value.value}
                            />
                            <span
                              className={style.icon}
                              onClick={() => {
                                orFiltersRef.current = orFiltersRef.current.filter(
                                  (v) => String(v.key) !== String(value.key)
                                );
                                setOrFilters(orFiltersRef.current.slice());
                              }}
                            >
                              <Svg type={"x"} />
                            </span>
                          </div>
                        );
                      })}
                      <div
                        className={style.btn}
                        onClick={() => {
                          const id = Math.random()
                            .toString(36)
                            .substring(2, 11);
                          orFiltersRef.current.push({
                            key: id,
                            by: "",
                            operator: "===",
                            value: "",
                          });
                          setOrFilters(orFiltersRef.current.slice());
                        }}
                      >
                        추가
                      </div>
                    </div>
                    <div className={style.cellfilters}>
                      <label>
                        CELL 필터
                      </label>
                      {cellFilters.map((value, index) => {
                        return (
                          <div className={style.cellfilter} key={value.key}>
                            <input
                              type="text"
                              placeholder="필드"
                              defaultValue={value.by}
                              onChange={(e) => {
                                cellFiltersRef.current.find(
                                  (v) => String(v.key) === String(value.key)
                                ).by = e.target.value;
                              }}
                            />
                            <select
                              defaultValue={value.operator}
                              onChange={(e) => {
                                cellFiltersRef.current.find(
                                  (v) => String(v.key) === String(value.key)
                                ).operator = e.target.value;
                              }}
                            >
                              <option value="===">==</option>
                              <option value="!==">!=</option>
                            </select>
                            <input
                              type="text"
                              placeholder="값"
                              onChange={(e) => {
                                cellFiltersRef.current.find(
                                  (v) => String(v.key) === String(value.key)
                                ).value = e.target.value;
                              }}
                              defaultValue={value.value}
                            />
                            <input
                              type="text"
                              placeholder="값"
                              onChange={(e) => {
                                cellFiltersRef.current.find(
                                  (v) => String(v.key) === String(value.key)
                                ).cell = e.target.value;
                              }}
                              defaultValue={value.cell}
                            />
                            <span
                              className={style.icon}
                              onClick={() => {
                                cellFiltersRef.current = cellFiltersRef.current.filter(
                                  (v) => String(v.key) !== String(value.key)
                                );
                                setCellFilters(cellFiltersRef.current.slice());
                              }}
                            >
                              <Svg type={"x"} />
                            </span>
                          </div>
                        );
                      })}
                      <div
                        className={style.btn}
                        onClick={() => {
                          const id = Math.random()
                            .toString(36)
                            .substring(2, 11);
                          cellFiltersRef.current.push({
                            key: id,
                            by: "",
                            cell: "",
                            operator: "===",
                            value: "",
                          });
                          setCellFilters(cellFiltersRef.current.slice());
                        }}
                      >
                        추가
                      </div>
                    </div>
                    <label>
                        정렬
                      </label>
                    <div className={style.orders}>
                      {orders.map((value, index) => {
                        return (
                          <div className={style.order} key={value.key}>
                            <input
                              type="text"
                              placeholder="필드"
                              defaultValue={value.by}
                              onChange={(e) => {
                                ordersRef.current.find(
                                  (v) => String(v.key) === String(value.key)
                                ).by = e.target.value;
                              }}
                            />
                            <input
                              type="text"
                              placeholder="우선순위 '/'로 구분하여 입력"
                              defaultValue={value.priority}
                              onChange={(e) => {
                                ordersRef.current.find(
                                  (v) => String(v.key) === String(value.key)
                                ).priority = e.target.value;
                              }}
                            />
                            <select
                              defaultValue={value.order}
                              onChange={(e) => {
                                ordersRef.current.find(
                                  (v) => String(v.key) === String(value.key)
                                ).order = e.target.value;
                              }}
                            >
                              <option value="asc">오름차순</option>
                              <option value="desc">내림차순</option>
                            </select>
                            <span
                              className={style.icon}
                              onClick={() => {
                                ordersRef.current = ordersRef.current.filter(
                                  (v) => String(v.key) !== String(value.key)
                                );
                                setOrders(ordersRef.current.slice());
                              }}
                            >
                              <Svg type={"x"} />
                            </span>
                          </div>
                        );
                      })}
                      <div
                        className={style.btn}
                        onClick={() => {
                          const id = Math.random()
                            .toString(36)
                            .substring(2, 11);
                          ordersRef.current.push({
                            key: id,
                            by: "",
                            priority: "",
                            order: "asc",
                          });
                          setOrders(ordersRef.current.slice());
                        }}
                      >
                        추가
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Popup>
      )}
    </>
  );
};

export default DataConnPopup;
