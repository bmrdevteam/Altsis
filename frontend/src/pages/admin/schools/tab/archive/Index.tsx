import { useEffect, useState } from "react";

import Table from "components/tableV2/Table";
import Loading from "components/loading/Loading";

import { unflattenObject } from "functions/functions";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";

import EditItemPopup from "./EditItemPopup";

import {
  TSchoolFormArchive,
  TSchoolFormArchiveItem,
  authStudentTextMap,
  authTeacherTextMap,
  getAuthStudent,
  getAuthStudentText,
  getAuthTeacher,
  getAuthTeacherText,
} from "types/schools";
import _ from "lodash";
type Props = { school: string };

type parsedItem = {
  label: string;
  dataType: "array" | "object" | "";
  authTeacherText: string;
  authStudentText: string;
};

function Archive(props: Props) {
  const { SchoolAPI } = useAPIv2();

  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [formArchive, setFormArchive] = useState<TSchoolFormArchive>();
  const [formArchiveParsed, setFormArchiveParsed] = useState<parsedItem[]>([]);

  const [editItemPopupActive, setEditItemPopupActive] =
    useState<boolean>(false);
  const [itemIdx, setItemIdx] = useState<number>(0);

  const updateFormArchive = async (
    e: {
      label: string;
      dataType: "object" | "array" | "";
      authTeacherText: string;
      authStudentText: string;
    }[]
  ) => {
    try {
      const newFormArchive: TSchoolFormArchiveItem[] = [];

      if (e.length > formArchiveParsed.length) {
        if (e[e.length - 1].label === "") {
          setFormArchiveParsed([...formArchiveParsed]);
          return alert("라벨을 입력해주세요");
        }
      }
      for (let _parsedItem of e) {
        const parsedItem = unflattenObject(_parsedItem);
        newFormArchive.push({
          label: parsedItem.label,
          dataType: parsedItem.dataType !== "" ? parsedItem.dataType : "array",
          authTeacher:
            getAuthTeacher(parsedItem.authTeacherText) ?? "undefined",
          authStudent:
            getAuthStudent(parsedItem.authStudentText) ?? "undefined",
          fields: parsedItem.fields ?? [],
        });
      }
      const { formArchive } = await SchoolAPI.USchoolFormArchive({
        params: {
          _id: props.school,
        },
        data: {
          formArchive: newFormArchive,
        },
      });
      alert(SUCCESS_MESSAGE);
      setFormArchive(formArchive);
    } catch (err) {
      ALERT_ERROR(err);
      setIsLoading(true);
    }
  };

  useEffect(() => {
    if (isLoading && props.school) {
      SchoolAPI.RSchool({ params: { _id: props.school } })
        .then(({ school }) => {
          setFormArchive(school.formArchive);
        })
        .then(() => {
          setIsLoading(false);
        })
        .catch((err: any) => {
          alert("Failed to load data");
        });
    }
  }, [isLoading]);

  useEffect(() => {
    if (formArchive) {
      setFormArchiveParsed(
        formArchive.map((formArchiveItem) => {
          return {
            ...formArchiveItem,
            authTeacherText: getAuthTeacherText(formArchiveItem.authTeacher),
            authStudentText: getAuthStudentText(formArchiveItem.authStudent),
          };
        })
      );
    }
  }, [formArchive]);

  return !isLoading ? (
    <>
      <div style={{ marginTop: "24px" }}>
        <div style={{ marginTop: "24px" }}></div>
        <Table
          type="object-array"
          data={formArchiveParsed}
          onChange={updateFormArchive}
          header={[
            {
              text: "순서",
              fontSize: "12px",
              fontWeight: "600",
              type: "rowOrder",
              width: "80px",
              textAlign: "center",
            },
            {
              text: "이름",
              key: "label",
              type: "text",
            },
            {
              text: "선생님 권한",
              key: "authTeacherText",
              fontSize: "12px",
              fontWeight: "600",
              textAlign: "center",
              width: "200px",
              type: "select",
              option: Array.from(authTeacherTextMap.values()),
            },
            {
              text: "학생 권한",
              key: "authStudentText",
              fontSize: "12px",
              fontWeight: "600",
              textAlign: "center",
              width: "200px",
              type: "select",
              option: Array.from(authStudentTextMap.values()),
            },
            {
              text: "데이터 형식",
              key: "dataType",
              fontSize: "12px",
              fontWeight: "600",
              type: "status",
              textAlign: "center",
              width: "120px",
              status: {
                object: {
                  text: "단일",
                  color: "#3a44b5",
                },
                array: {
                  text: "누적",
                  color: "#c95636",
                },
              },
            },

            {
              text: "자세히",
              type: "button",
              fontSize: "12px",
              fontWeight: "600",
              textAlign: "center",
              btnStyle: {
                border: true,
                color: "green",
                padding: "4px",
                round: true,
              },
              onClick: (value: any) => {
                const itemIdx = _.findIndex(
                  formArchive,
                  (item) => item.label === value.label
                );
                if (itemIdx !== -1) {
                  setItemIdx(itemIdx);
                  setEditItemPopupActive(true);
                }
              },
              width: "80px",
            },
            {
              text: "수정",
              type: "rowEdit",
              fontSize: "12px",
              fontWeight: "600",
              textAlign: "center",
              width: "80px",
            },
          ]}
        />
      </div>
      {editItemPopupActive && formArchive && (
        <EditItemPopup
          school={props.school}
          setPopupActive={setEditItemPopupActive}
          formArchive={formArchive}
          setFormArchive={setFormArchive}
          itemIdx={itemIdx}
        />
      )}
    </>
  ) : (
    <Loading height={"calc(100vh - 55px)"} />
  );
}

export default Archive;
