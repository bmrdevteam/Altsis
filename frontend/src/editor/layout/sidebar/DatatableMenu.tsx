import React, { useEffect, useRef, useState } from "react";
import Button from "../../../components/button/Button";
import Popup from "../../../components/popup/Popup";
import Menu from "./Menu";
import style from "../../editor.module.scss";
import { useEditor } from "../../functions/editorContext";
import { isArray } from "lodash";
import Select from "../../../components/select/Select";
import useDatabase from "../../../hooks/useDatabase";
import Tab from "../../../components/tab/Tab";
import { useNavigate } from "react-router-dom";

type Props = {};

const DatatableMenu = (props: Props) => {
  const { getCurrentBlock, changeCurrentBlockData } = useEditor();
  const [dataTableMenuOpen, setDataTableMenuOpen] = useState<boolean>(false);
  const [columns, setColumns] = useState<number[]>([1, 1]);
  const [headers, setHeaders] = useState<any[]>([]);
  const [body, setBody] = useState<any[]>([]);

  const [headerRows, setHeaderRows] = useState<any[]>([]);

  const database = useDatabase();

  const [data, setData] = useState<any>();
  const [dataFrom, setDataFrom] = useState();
  const navigate = useNavigate();

  useEffect(() => {
    if (isArray(getCurrentBlock().data?.dataTableHeader)) {
      setHeaders(getCurrentBlock().data?.dataTableHeader);
    } else {
      setHeaders(["", ""]);
    }

    database.R({ location: "enrollments/list" }).then((res) => {
      setData(res);
    });

    return () => {
      navigate("#");
    };
  }, []);

  function save() {
    console.log(dataFrom);
    console.log(columns);
    console.log(headers);
    console.log(body);

    changeCurrentBlockData({
      dataTableFrom: dataFrom,
      dataTableColumns: [1, 1, 1, 1],
      dataTableHeaders: ["1", "2", "3", "4"],
      dataTableBody: ["point", "classTitle",'',''],
    });
  }
  /**
   *
   * @returns
   */

  const DataSettings = () => {
    return (
      <>
        <div className={style.controls}>
          <div className={style.title}>Data 설정</div>
        </div>
        <Select
          appearence="flat"
          options={[{ text: "수강 Data", value: "enrollments" }]}
          setValue={setDataFrom}
          selectedValue={dataFrom}
          onChangeWithClick={(value: any) => {
            changeCurrentBlockData({ dataTableFrom: value });
          }}
        />
      </>
    );
  };

  const ColumnSettings = () => {
    return (
      <>
        <div className={style.controls}>
          <div className={style.title}>Column 설정</div>
          <div style={{ flex: "1 1 0" }}></div>
          <Button
            type="ghost"
            style={{
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
      </>
    );
  };
  const HeaderSettings = () => {
    return (
      <>
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
          style={{
            marginTop: "6px",
            height: "100%",
            borderRadius: "4px",
            boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
          }}
        >
          +
        </Button>
      </>
    );
  };
  /**
   * settings
   */

  const ENROLLMENT_ARRAY_OPTIONS = [
    { text: "강의명", value: "classTitle" },
    { text: "학점", value: "point" },
  ];

  /**
   *
   * @returns
   */
  const BodySettings = () => {
    return (
      <>
        <div className={style.controls}>
          <div className={style.title}>Body 설정</div>
        </div>
        <div style={{ display: "flex", gap: "4px" }}>
          {columns?.map((value, index) => {
            return (
              <Select
                appearence="flat"
                style={{ flex: `${value} 1 0%` }}
                key={index}
                selectedValue={body[index]}
                onChangeWithClick={(val: any) => {
                  setBody((prev: any[]) => [
                    ...prev.slice(0, index),
                    val,
                    ...prev.slice(index + 1, prev.length),
                  ]);
                }}
                options={ENROLLMENT_ARRAY_OPTIONS}
              />
            );
          })}
        </div>
      </>
    );
  };
  return (
    <>
      <Menu name="Data 테이블">
        <Button
          type="ghost"
          style={{
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
          style={{ maxWidth: "800px", width: "100%", borderRadius: "8px" }}
          title="Data 테이블 편집"
          closeBtn
          setState={setDataTableMenuOpen}
        >
          <div className={style.popup_container}>
            <Tab
              items={{
                data: <DataSettings />,
                column: <ColumnSettings />,
                header: <HeaderSettings />,
                body: <BodySettings />,
              }}
            />
            <div style={{ marginTop: "24px" }}>
              <Button
                type="ghost"
                style={{ borderRadius: "4px" }}
                onClick={() => {
                  save();
                  // setDataTableMenuOpen(false);
                }}
              >
                저장
              </Button>
            </div>
          </div>
        </Popup>
      )}
    </>
  );
};

export default DatatableMenu;
