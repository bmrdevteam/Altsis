import { useEffect, useState } from "react";

import Table from "components/tableV2/Table";
import Loading from "components/loading/Loading";

import { unflattenObject } from "functions/functions";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";

import EditItemPopup from "./EditItemPopup";

import {
  TSchoolFormArchive,
  TSchoolFormArchiveItem,
  TDeletedSchoolFormArchive,
  authStudentTextMap,
  authTeacherTextMap,
  authManagerTextMap,
  getAuthStudent,
  getAuthStudentText,
  getAuthTeacher,
  getAuthTeacherText,
  getAuthManager,
  getAuthManagerText,
} from "types/schools";
import _ from "lodash";

const SUCCESS_MESSAGE = "저장되었습니다.";

type Props = { school: string };

type parsedItem = {
  label: string;
  dataType: "array" | "object" | "";
  authTeacherText: string;
  authStudentText: string;
  authManagerText: string;
};

type parsedDeletedItem = parsedItem & {
  deletedAt: string;
};

function Archive(props: Props) {
  const { SchoolAPI } = useAPIv2();

  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [formArchive, setFormArchive] = useState<TSchoolFormArchive>();
  const [formArchiveParsed, setFormArchiveParsed] = useState<parsedItem[]>([]);

  const [deletedFormArchive, setDeletedFormArchive] =
    useState<TDeletedSchoolFormArchive>([]);
  const [deletedFormArchiveParsed, setDeletedFormArchiveParsed] = useState<
    parsedDeletedItem[]
  >([]);

  const [editItemPopupActive, setEditItemPopupActive] =
    useState<boolean>(false);
  const [itemIdx, setItemIdx] = useState<number>(0);

  const updateFormArchive = async (
    e: {
      label: string;
      dataType: "object" | "array" | "";
      authTeacherText: string;
      authStudentText: string;
      authManagerText: string;
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
          authManager:
            getAuthManager(parsedItem.authManagerText) ?? "undefined",
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
    } catch (err: any) {
      if (err?.response?.data?.message === "FORM_LABEL_IN_TRASH") {
        alert(
          "휴지통에 같은 이름의 기록 양식이 있습니다. 복원하거나 완전 삭제 후 생성해주세요."
        );
      } else {
        ALERT_ERROR(err);
      }
      setIsLoading(true);
    }
  };

  const handleRestore = async (label: string) => {
    if (!window.confirm(`"${label}" 기록 양식을 복원하시겠습니까?`)) {
      return;
    }
    try {
      const { formArchive, deletedFormArchive } =
        await SchoolAPI.RestoreFormArchive({
          params: {
            _id: props.school,
            label,
          },
        });
      setFormArchive(formArchive);
      setDeletedFormArchive(deletedFormArchive);
      alert("복원되었습니다.");
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  const handlePermanentDelete = async (label: string) => {
    if (
      !window.confirm(
        `"${label}" 기록 양식을 완전히 삭제하시겠습니까?\n\n⚠️ 이 작업은 되돌릴 수 없으며, 해당 기록의 모든 학생 데이터도 함께 삭제됩니다.`
      )
    ) {
      return;
    }
    try {
      const { deletedFormArchive } = await SchoolAPI.RemoveFormArchive({
        params: {
          _id: props.school,
          label,
        },
      });
      setDeletedFormArchive(deletedFormArchive);
      alert("완전히 삭제되었습니다.");
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  useEffect(() => {
    if (isLoading && props.school) {
      SchoolAPI.RSchool({ params: { _id: props.school } })
        .then(({ school }) => {
          setFormArchive(school.formArchive);
          setDeletedFormArchive(school.deletedFormArchive || []);
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
            authManagerText: getAuthManagerText(formArchiveItem.authManager),
          };
        })
      );
    }
  }, [formArchive]);

  useEffect(() => {
    if (deletedFormArchive) {
      setDeletedFormArchiveParsed(
        deletedFormArchive.map((item) => {
          return {
            ...item,
            authTeacherText: getAuthTeacherText(item.authTeacher),
            authStudentText: getAuthStudentText(item.authStudent),
            authManagerText: getAuthManagerText(item.authManager),
            deletedAt: new Date(item.deletedAt).toLocaleDateString("ko-KR"),
          };
        })
      );
    }
  }, [deletedFormArchive]);

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
              width: "52px",
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
              width: "180px",
              type: "select",
              option: Array.from(authTeacherTextMap.values()),
            },
            {
              text: "학생 권한",
              key: "authStudentText",
              fontSize: "12px",
              fontWeight: "600",
              textAlign: "center",
              width: "120px",
              type: "select",
              option: Array.from(authStudentTextMap.values()),
            },
            {
              text: "관리자 권한",
              key: "authManagerText",
              fontSize: "12px",
              fontWeight: "600",
              textAlign: "center",
              width: "120px",
              type: "select",
              option: Array.from(authManagerTextMap.values()),
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

      {deletedFormArchiveParsed.length > 0 && (
        <div style={{ marginTop: "48px" }}>
          <h4 style={{ marginBottom: "16px", color: "#666" }}>
            휴지통 ({deletedFormArchiveParsed.length})
          </h4>
          <Table
            type="object-array"
            data={deletedFormArchiveParsed}
            header={[
              {
                text: "이름",
                key: "label",
                type: "text",
                textAlign: "center",
              },
              {
                text: "삭제일",
                key: "deletedAt",
                type: "text",
                fontSize: "12px",
                fontWeight: "600",
                textAlign: "center",
                width: "120px",
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
                text: "복원",
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
                  handleRestore(value.label);
                },
                width: "80px",
              },
              {
                text: "완전 삭제",
                type: "button",
                fontSize: "12px",
                fontWeight: "600",
                textAlign: "center",
                btnStyle: {
                  border: true,
                  color: "red",
                  padding: "4px",
                  round: true,
                },
                onClick: (value: any) => {
                  handlePermanentDelete(value.label);
                },
                width: "100px",
              },
            ]}
          />
        </div>
      )}

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
