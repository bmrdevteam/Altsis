import React, { useEffect, useRef, useState } from "react";
import Button from "../../../components/button/Button";
import Popup from "../../../components/popup/Popup";
import Menu from "./Menu";
import style from "../../editor.module.scss";
import { useEditor } from "../../functions/editorContext";
import { isArray } from "lodash";
import Select from "../../../components/select/Select";
import Autofill from "../../../components/input/Autofill";
import useDatabase from "../../../hooks/useDatabase";

type Props = {};

const DatatableMenu = (props: Props) => {
  const { getCurrentBlock, changetCurrentBlockData } = useEditor();
  const [dataTableMenuOpen, setDataTableMenuOpen] = useState<boolean>(true);
  const [columns, setColumns] = useState<number[]>([1, 1]);
  const [headers, setHeaders] = useState<any[]>([]);
  const [headerRows, setHeaderRows] = useState<any[]>([]);

  const database = useDatabase();

  const [data, setData] = useState<any>();

  useEffect(() => {
    if (isArray(getCurrentBlock().data?.dataTableHeader)) {
      setHeaders(getCurrentBlock().data?.dataTableHeader);
    } else {
      setHeaders(["", ""]);
    }

    database.R({ location: "enrollments/list" }).then((res) => {
      setData(res);
    });
  }, []);

  return (
    <>
      <Menu name="Data 테이블">
        <Button
          type="ghost"
          styles={{
            marginTop: "8px",
            borderRadius: "4px",
            height: "32px",
            boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
          }}
          onClick={() => {
            setDataTableMenuOpen(true);
          }}
        >
          편집
        </Button>
      </Menu>
      {dataTableMenuOpen && (
        <Popup
          style={{ maxWidth: "800px", width: "100%" }}
          title="Data 테이블 편집"
          closeBtn
          setState={setDataTableMenuOpen}
        >
          <div className={style.popup_container}>
            <div className={style.controls}>
              <div className={style.title}>Column 설정</div>
              <div style={{ flex: "1 1 0" }}></div>
              <Button
                type="ghost"
                styles={{
                  width: "30px",
                  marginTop: "6px",
                  height: "100%",
                  borderRadius: "4px",
                  boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
                }}
                onClick={() => {
                  setColumns((prev) => [...prev, 1]);
                }}
              >
                +
              </Button>
            </div>
            <div className={style.column_settings}>
              {columns?.map((value, index) => {
                return (
                  <input
                    onChange={(e) => {
                      if (!(parseFloat(e.target.value) > 20)) {
                        setColumns((prev) => [
                          ...prev.slice(0, index),
                          parseFloat(e.target.value),
                          ...prev.slice(index + 1, prev.length),
                        ]);
                      }
                    }}
                    value={value}
                    max={"20"}
                    min={1}
                    type="number"
                    key={index}
                    style={{ flex: `${value} 1 0%` }}
                    className={style.item}
                  />
                );
              })}
            </div>

            <div className={style.controls}>
              <div className={style.title}>헤더 설정</div>
            </div>
            <div className={style.table_container}>
              <table>
                <thead>
                  <tr>
                    {columns?.map((value, index) => {
                      return (
                        <td
                          style={{
                            width: `${
                              (100 / columns.reduce((a, b) => a + b, 0)) * value
                            }%`,
                          }}
                          key={index}
                        >
                          <div
                            className={style.item}
                            placeholder="입력"
                            contentEditable
                            suppressContentEditableWarning
                          >
                            {headers[index]}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                </thead>
              </table>
            </div>
            <Button
              type="ghost"
              styles={{
                marginTop: "6px",
                height: "100%",
                borderRadius: "4px",
                boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
              }}
            >
              +
            </Button>

            <div className={style.controls}>
              <div className={style.title}>Body 설정</div>
            </div>
            <div className={style.table_container}>
              <table>
                <tbody>
                  <tr>
                    {columns?.map((value, index) => {
                      return (
                        <td
                          style={{
                            width: `${
                              (100 / columns.reduce((a, b) => a + b, 0)) * value
                            }%`,
                          }}
                          key={index}
                        >
                          <Autofill
                            options={[{ text: "asd", value: "sylabus" }]}
                          />
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
            <Button
              styles={{
                marginTop: "24px",
                height: "32px",
                borderRadius: "4px",
                boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
              }}
              onClick={() => {
                console.log(data);
              }}
            >
              저장
            </Button>
          </div>
        </Popup>
      )}
    </>
  );
};

export default DatatableMenu;
