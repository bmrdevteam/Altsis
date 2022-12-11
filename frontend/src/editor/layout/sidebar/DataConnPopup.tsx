import { archiveTestData } from "archiveTest";
import Svg from "assets/svg/Svg";
import Button from "components/button/Button";
import Popup from "components/popup/Popup";
import Select from "components/select/Select";
import Tree, { TreeItem } from "components/tree/Tree";
import { useEditor } from "editor/functions/editorContext";
import useDatabase from "hooks/useDatabase";
import React, { useEffect, useRef, useState } from "react";
import style from "../../editor.module.scss";

type Props = {
  callPageReload: () => void;
};

const DataConnPopup = (props: Props) => {
  const database = useDatabase();
  const {
    changeCurrentCell,
    getCurrentCell,
    changeCurrentBlockData,
    getCurrentBlock,
    getCurrentCellIndex,
  } = useEditor();
  async function getSchools() {
    const { schools: result } = await database.R({ location: "schools" });
    return result;
  }

  const [schools, setSchools] = useState<any>();
  const [archiveData, setArchiveData] = useState<any>();
  const [seasonData, setSeasonData] = useState<any>();
  function seasonName(schoolId: string) {
    if (seasonData) {
      console.log(seasonData?.[schoolId]);

      let result: string[] = [];
      seasonData?.[schoolId]?.map((season: any) => {
        if (result.includes(season.term)) {
        } else {
          result.push(season.term);
        }
      });

      return result;
    }
    return [];
  }
  const textareaRef = useRef<HTMLDivElement>(null);

  const repeat = useRef<any>({
    by: getCurrentBlock()?.data?.dataRepeat?.by ?? "",
    index: getCurrentBlock()?.data?.dataRepeat?.index ?? "",
    filterBy: getCurrentBlock()?.data?.dataRepeat?.filterBy ?? "",
    filterValue: getCurrentBlock()?.data?.dataRepeat?.filterValue ?? "",
  });
  const [tableBlockMenuPopup, setTableBlockMenuPopup] =
    useState<boolean>(false);

  useEffect(() => {
    getSchools().then((res) => {
      res.map((val: any) => {
        database.R({ location: `schools/${val._id}` }).then((v) => {
          setArchiveData((prev: any) => ({
            ...prev,
            [val._id]: v.formArchive,
          }));
          setSeasonData((prev: any) => ({
            ...prev,
            [val._id]: v.seasons,
          }));
        });
      });
      setSchools(res);
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
          style={{ borderRadius: "4px", width: "800px" }}
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
                            subItem={archiveData[school._id]?.map(
                              (archive: any) => {
                                return (
                                  <TreeItem
                                    key={`${school.schoolId}//archive//${archive.label}`}
                                    text={archive.label}
                                    subItem={
                                      archive.fields &&
                                      archive.fields?.map((v: any) => {
                                        return (
                                          <TreeItem
                                            key={`${school.schoolId}//archive//${archive.label}//${v.label}`}
                                            text={`${v.label} - ${v.type}`}
                                            onClick={() => {
                                              handleOnclick({
                                                location: `${school.schoolId}//archive//${archive.label}//${v.label}`,
                                                label: v.label,
                                              });
                                            }}
                                          />
                                        );
                                      })
                                    }
                                  />
                                );
                              }
                            )}
                          />,
                          <TreeItem
                            text="평가"
                            subItem={[
                              <TreeItem
                                key={"년도"}
                                text={"년도"}
                                onClick={() => {
                                  handleOnclick({
                                    location: `${
                                      school.schoolId
                                    }//evaluation//${"년도"}`,
                                    label: "년도",
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
                              <TreeItem
                                key={"과목"}
                                text={"과목"}
                                onClick={() => {
                                  handleOnclick({
                                    location: `${
                                      school.schoolId
                                    }//evaluation//${"과목"}`,
                                    label: "과목",
                                  });
                                }}
                              />,
                              <TreeItem
                                key={"세부능력 및 특기사항"}
                                text={"세부능력 및 특기사항"}
                                onClick={() => {
                                  handleOnclick({
                                    location: `${
                                      school.schoolId
                                    }//evaluation//${"세부능력 및 특기사항"}`,
                                    label: "세부능력 및 특기사항",
                                  });
                                }}
                              />,
                              <TreeItem
                                key={"교과"}
                                text={"교과"}
                                onClick={() => {
                                  handleOnclick({
                                    location: `${
                                      school.schoolId
                                    }//evaluation//${"교과"}`,
                                    label: "교과",
                                  });
                                }}
                              />,
                              ...seasonName(school._id).map((ev) => {
                                return (
                                  <>
                                    <TreeItem
                                      key={`${ev}/단위수`}
                                      text={`${ev}/단위수`}
                                      onClick={() => {
                                        handleOnclick({
                                          location: `${school.schoolId}//evaluation//${ev}/단위수`,
                                          label: `${ev}/단위수`,
                                        });
                                      }}
                                    />
                                    <TreeItem
                                      key={`${ev}/평가`}
                                      text={`${ev}/평가`}
                                      onClick={() => {
                                        handleOnclick({
                                          location: `${school.schoolId}//evaluation//${ev}/평가`,
                                          label: `${ev}/평가`,
                                        });
                                      }}
                                    />
                                    <TreeItem
                                      key={`${ev}/점수`}
                                      text={`${ev}/점수`}
                                      onClick={() => {
                                        handleOnclick({
                                          location: `${school.schoolId}//evaluation//${ev}/점수`,
                                          label: `${ev}/점수`,
                                        });
                                      }}
                                    />
                                    <TreeItem
                                      key={`${ev}/멘토 평가`}
                                      text={`${ev}/멘토 평가`}
                                      onClick={() => {
                                        handleOnclick({
                                          location: `${school.schoolId}//evaluation//${ev}/멘토 평가`,
                                          label: `${ev}/멘토 평가`,
                                        });
                                      }}
                                    />
                                  </>
                                );
                              }),
                            ]}
                          />,
                        ]}
                      />
                    );
                  })}
                </Tree>
              </div>
              <div className={style.divider}></div>
              <div style={{ flex: "1 1 0" }}>
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
                            return <>&nbsp;</>;
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
                          console.log(archiveData[s._id]);
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
                              평가
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
                    <div className={style.item}>
                      <label>테이블 반복 필터</label>
                      <input
                        type="text"
                        defaultValue={repeat.current.filterBy}
                        onChange={(e) => {
                          repeat.current.filterBy = e.target.value;
                        }}
                      />
                      <div>=</div>
                      <input
                        type="text"
                        defaultValue={repeat.current.filterValue}
                        onChange={(e) => {
                          repeat.current.filterValue = e.target.value;
                        }}
                      />
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
