/**
 * @file Seasons Page Tab Item - Form - EditEvaluationTable
 *
 * @author jessie129j <jessie129j@gmail.com>
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
import { useEffect, useRef, useState } from "react";
import useApi from "hooks/useApi";

// components
import Button from "components/button/Button";
import Table from "components/tableV2/Table";

import style from "style/pages/admin/schools.module.scss";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import { TFormEvaluation, TSeason } from "types/seasons";
import { TTableHeader } from "components/tableV2/Table";
import Popup from "components/popup/Popup";
import { unflattenObject } from "functions/functions";

type Props = {
  _id: string;
  formEvaluation: TFormEvaluation;
  setPopupActive: React.Dispatch<React.SetStateAction<boolean>>;
  updateFormData: (seasonData: TSeason) => void;
  isActivatedFirst: boolean;
};

const Index = (props: Props) => {
  const { SeasonAPI } = useAPIv2();

  const [refresh, setRefresh] = useState<boolean>(false);

  const [formEvaluation, setFormEvaluation] = useState<TFormEvaluation>(
    props.formEvaluation
  );

  const [selectedItemIdx, setSelectedItemIdx] = useState<number>(-1);
  const [ItemOptionPopupActive, setItemOptionPopupActive] =
    useState<boolean>(false);

  const updateHandler = async (formEvaluation: TFormEvaluation) => {
    try {
      const { season } = await SeasonAPI.USeasonFormEvaluation({
        params: { _id: props._id },
        data: { formEvaluation },
      });
      alert(SUCCESS_MESSAGE);
      props.updateFormData(season);
      setFormEvaluation(season.formEvaluation);
    } catch (err) {
      ALERT_ERROR(err);
      setRefresh(true);
    }
  };

  const getHeader = () => {
    const header: TTableHeader[] = [
      {
        type: "text",
        text: "평가 항목",
        key: "label",
      },
      {
        text: "유형",
        key: "type",
        fontSize: "12px",
        fontWeight: "600",
        type: "status",
        status: {
          input: {
            text: "텍스트",
            color: "#B33F00",
          },
          "input-number": {
            text: "숫자",
            color: "#00B3AD",
          },
          select: {
            text: "선택 +",
            color: "#8657ff",
            onClick: (row: any) => {
              setSelectedItemIdx(row.tableRowIndex - 1);
              setItemOptionPopupActive(true);
            },
          },
        },
        width: "80px",
        textAlign: "center",
      },
      {
        text: "평가자",
        key: "authOption",
        fontSize: "12px",
        fontWeight: "600",
        type: "status",
        status: {
          editByTeacher: {
            text: "선생님",
            color: "red",
          },
          editByStudent: {
            text: "학생",
            color: "blue",
          },
          editByTeacherAndStudentCanView: {
            text: "선생님(학생 조회 가능)",
            color: "purple",
          },
        },
        width: "180px",
        textAlign: "center",
      },
      {
        text: "평가단위",
        key: "combineBy",
        fontSize: "12px",
        fontWeight: "600",
        type: "status",
        status: {
          term: {
            text: "학기",
            color: "green",
          },
          year: {
            text: "학년도",
            color: "gray",
          },
        },
        width: "100px",
        textAlign: "center",
      },
    ];
    if (!props.isActivatedFirst) {
      header.push({
        text: "수정",
        type: "rowEdit",
        fontSize: "12px",
        fontWeight: "600",
        textAlign: "center",
        width: "80px",
      });
    }
    return header;
  };

  const getOptionHeader = () => {
    const header: TTableHeader[] = [
      {
        type: "text",
        key: "0",
        text: "옵션",
      },
    ];
    if (!props.isActivatedFirst) {
      header.push({
        text: "수정",
        type: "rowEdit",
        fontSize: "12px",
        fontWeight: "600",
        textAlign: "center",
        width: "80px",
      });
    }
    return header;
  };

  useEffect(() => {
    if (refresh) {
      setFormEvaluation(props.formEvaluation);
      setRefresh(false);
    }

    return () => {};
  }, [refresh]);

  return (
    <>
      <Table
        type="object-array"
        data={!refresh ? formEvaluation : []}
        onChange={(e: any[]) => {
          const formEvaluation: TFormEvaluation = e.map((_rawItem) => {
            const _item = unflattenObject(_rawItem);
            const item = {
              label: _item.label ?? "",
              type: _item.type !== "" ? _item.type : "input",
              options: _item.options ?? [],
              combineBy: _item.combineBy !== "" ? _item.combineBy : "term",
              authOption:
                _item.authOption !== "" ? _item.authOption : "editByTeacher",
              auth: {
                edit: {
                  student: false,
                  teacher: false,
                },
                view: {
                  student: false,
                  teacher: true,
                },
              },
            };
            switch (item.authOption) {
              case "editByStudent":
                item.auth.edit.student = true;
                item.auth.view.student = true;
                break;
              case "editByTeacher":
                item.auth.edit.teacher = true;
                break;
              case "editByTeacherAndStudentCanView":
                item.auth.edit.teacher = true;
                item.auth.view.student = true;
                break;
            }
            return item;
          });
          updateHandler(formEvaluation);
        }}
        header={getHeader()}
      />
      {ItemOptionPopupActive && selectedItemIdx !== -1 && (
        <Popup
          title={`${formEvaluation[selectedItemIdx].label} 옵션 설정`}
          setState={() => {
            setSelectedItemIdx(-1);
            setItemOptionPopupActive(false);
          }}
          closeBtn
          contentScroll
        >
          <Table
            type="string-array"
            data={!refresh ? formEvaluation[selectedItemIdx].options : []}
            header={getOptionHeader()}
            onChange={(e) => {
              formEvaluation[selectedItemIdx].options = e.map((row) =>
                row["0"]?.trim()
              );
              updateHandler(formEvaluation);
            }}
          />
        </Popup>
      )}
    </>
  );
};

export default Index;
