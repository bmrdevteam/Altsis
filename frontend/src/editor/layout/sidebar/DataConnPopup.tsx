import { archiveTestData } from "archiveTest";
import Svg from "assets/svg/Svg";
import Button from "components/button/Button";
import Popup from "components/popup/Popup";
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
  const { changeCurrentCell, getCurrentCell } = useEditor();
  async function getSchools() {
    const { schools: result } = await database.R({ location: "schools" });
    return result;
  }
  const [schools, setSchools] = useState<any>();
  const textareaRef = useRef<HTMLDivElement>(null);

  const [tableBlockMenuPopup, setTableBlockMenuPopup] =
    useState<boolean>(false);

  useEffect(() => {
    getSchools().then((res) => {
      setSchools(res);
    });
  }, []);
  console.log(getCurrentCell()?.dataText);

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
                console.log(textareaRef.current?.childNodes);
                changeCurrentCell({
                  dataTextChildNodes: textareaRef.current?.childNodes,
                });
                changeCurrentCell({ dataText: result });
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
                            subItem={archiveTestData.map((archive) => {
                              return (
                                <TreeItem
                                  key={archive.label}
                                  text={archive.label}
                                  subItem={
                                    archive.fields &&
                                    archive.fields?.map((v:any) => {
                                      return (
                                        <TreeItem
                                          key={v.label}
                                          text={v.label}
                                          onClick={() => {
                                            const data =
                                              document.createElement("data");
                                            data.contentEditable = "false";
                                            data.innerText = `${v.label}`;
                                            data.className = style.data;
                                            // data.setAttribute("name", "DBData");
                                            data.setAttribute(
                                              "data-location",
                                              `${school.schoolId}/archive/${archive.label}/${v.label}`
                                            );
                                            data.addEventListener(
                                              "keydown",
                                              (e) => {
                                                e.key === "Backspace" &&
                                                  e.preventDefault();
                                              }
                                            );
                                            const selection = window
                                              .getSelection()
                                              ?.getRangeAt(0);
                                            selection?.insertNode(
                                              document.createTextNode(" ")
                                            );
                                            selection?.insertNode(data);

                                            setTimeout(() => {
                                              textareaRef.current?.blur();
                                              window.getSelection()?.empty();
                                            });
                                          }}
                                        />
                                      );
                                    })
                                  }
                                />
                              );
                            })}
                          />,
                          //   <TreeItem text="평가" />,
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
                            const arr = dataTextElement.location?.split("/");
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
                  <div className={style.options}>
                    <label>반복 설정</label>
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
