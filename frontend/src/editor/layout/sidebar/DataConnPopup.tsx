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
  const evaluationData: string[] = [
    "년도",
    "학기",

    "과목",
    "교과",

    "1쿼터/단위수",
    "1쿼터/점수",
    "1쿼터/평가",
    "1쿼터/멘토 평가",

    "2쿼터/단위수",
    "2쿼터/점수",
    "2쿼터/평가",
    "2쿼터/멘토 평가",

    "3쿼터/단위수",
    "3쿼터/점수",
    "3쿼터/평가",
    "3쿼터/멘토 평가",

    "4쿼터/단위수",
    "4쿼터/점수",
    "4쿼터/평가",
    "4쿼터/멘토 평가",
  ];
  const textareaRef = useRef<HTMLDivElement>(null);

  const repeat = useRef<any>({
    by: getCurrentBlock()?.data?.dataRepeat?.by ?? "",
    index: getCurrentBlock()?.data?.dataRepeat?.index ?? "",
  });
  const [tableBlockMenuPopup, setTableBlockMenuPopup] =
    useState<boolean>(false);

  useEffect(() => {
    getSchools().then((res) => {
      console.log(res);
      res.map((val: any) => {
        database.R({ location: `schools/${val._id}` }).then((v) => {
          setArchiveData((prev: any) => ({
            ...prev,
            [val._id]: v.formArchive,
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
                            subItem={evaluationData.map((ev) => {
                              return (
                                <TreeItem
                                  key={ev}
                                  text={ev}
                                  onClick={() => {
                                    handleOnclick({
                                      location: `${school.schoolId}//evaluation//${ev}`,
                                      label: ev,
                                    });
                                  }}
                                />
                              );
                            })}
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
