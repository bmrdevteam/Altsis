import { useEffect, useState } from "react";

import Popup from "components/popup/Popup";
import Table from "components/tableV2/Table";
import Loading from "components/loading/Loading";

import { unflattenObject } from "functions/functions";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import { TSchoolFormArchive } from "types/schools";
import _ from "lodash";

type Props = {
  school: string;
  setPopupActive: React.Dispatch<React.SetStateAction<boolean>>;
  formArchive: TSchoolFormArchive;
  setFormArchive: React.Dispatch<
    React.SetStateAction<TSchoolFormArchive | undefined>
  >;
  itemIdx: number;
};

function Index(props: Props) {
  const { SchoolAPI } = useAPIv2();

  const [formArchiveItemFields, setFormArchiveItemFields] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [editFieldsPopupActive, setEditFieldsPopupActive] =
    useState<boolean>(false);
  const [fieldIdx, setFieldIdx] = useState<number>(0);

  const updateItemFields = async (e: any) => {
    try {
      if (e.length > formArchiveItemFields.length) {
        if (e[e.length - 1].label === "") {
          setIsLoading(true);
          return alert("라벨을 입력해주세요");
        }
        if (
          _.find(
            formArchiveItemFields,
            (exField) => exField.label === e[e.length - 1].label
          )
        ) {
          setIsLoading(true);
          return alert("중복된 라벨입니다");
        }
      }
      const newFormArchive = [...props.formArchive];
      newFormArchive[props.itemIdx].fields = e
        .map((o: any) => unflattenObject(o))
        .map((field: any) => {
          if (field.type === "") field.type = undefined;
          if (field.total === "") field.total = false;
          if (field.runningTotal === "") field.runningTotal = false;
          return field;
        });

      const { formArchive } = await SchoolAPI.USchoolFormArchive({
        params: {
          _id: props.school,
        },
        data: { formArchive: newFormArchive },
      });
      alert(SUCCESS_MESSAGE);
      props.setFormArchive(formArchive);
    } catch (err) {
      ALERT_ERROR(err);
      setIsLoading(true);
    }
  };

  const updateItemFieldOptions = async (options: any[]) => {
    try {
      const newFormArchive = [...props.formArchive];
      newFormArchive[props.itemIdx].fields[fieldIdx].options = options;

      const { formArchive } = await SchoolAPI.USchoolFormArchive({
        params: {
          _id: props.school,
        },
        data: { formArchive: newFormArchive },
      });
      alert(SUCCESS_MESSAGE);
      props.setFormArchive(formArchive);
    } catch (err) {
      ALERT_ERROR(err);
      setIsLoading(true);
    }
  };
  useEffect(() => {
    if (isLoading) {
      setFormArchiveItemFields(props.formArchive[props.itemIdx].fields);
      setIsLoading(false);
    }
  }, [isLoading]);

  return !isLoading ? (
    <>
      <Popup
        closeBtn
        contentScroll
        style={{ width: "800px" }}
        setState={props.setPopupActive}
        title={`${props.formArchive[props.itemIdx].label}`}
      >
        <Table
          type="object-array"
          data={formArchiveItemFields}
          onChange={updateItemFields}
          header={
            props.formArchive[props.itemIdx].dataType === "array"
              ? [
                  {
                    text: "필드명",
                    key: "label",
                    type: "text",
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
                      select: {
                        text: "선택 +",
                        color: "#8657ff",
                        onClick: (row) => {
                          const idx = _.findIndex(
                            formArchiveItemFields,
                            (field) => field.label === row.label
                          );
                          if (idx !== -1) {
                            setFieldIdx(idx);
                            setEditFieldsPopupActive(true);
                          }
                        },
                      },
                      "input-number": {
                        text: "숫자",
                        color: "#00B3AD",
                      },
                    },
                    width: "80px",
                    textAlign: "center",
                  },
                  {
                    text: "합산",
                    key: "total",
                    textAlign: "center",
                    width: "80px",
                    type: "toggle",
                  },
                  {
                    text: "누계합산",
                    key: "runningTotal",
                    textAlign: "center",
                    width: "80px",
                    type: "toggle",
                  },
                  {
                    text: "수정",
                    fontSize: "12px",
                    fontWeight: "600",
                    type: "rowEdit",
                    width: "80px",
                    textAlign: "center",
                  },
                ]
              : [
                  {
                    text: "필드명",
                    key: "label",
                    type: "text",
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
                      file: {
                        text: "파일",
                        color: "#8657ff",
                      },
                      "file-image": {
                        text: "사진",
                        color: "#00B3AD",
                      },
                    },
                    width: "80px",
                    textAlign: "center",
                  },

                  {
                    text: "수정",
                    fontSize: "12px",
                    fontWeight: "600",
                    type: "rowEdit",
                    width: "80px",
                    textAlign: "center",
                  },
                ]
          }
        />
      </Popup>
      {editFieldsPopupActive && (
        <Popup
          contentScroll
          style={{ width: "600px", borderRadius: "4px" }}
          closeBtn
          setState={setEditFieldsPopupActive}
          title={`${formArchiveItemFields[fieldIdx].label}`}
        >
          <Table
            type="string-array"
            data={formArchiveItemFields[fieldIdx].options ?? []}
            onChange={(e) => {
              const _data: string[] = e.map((o) => o["0"]);
              updateItemFieldOptions(_data);
            }}
            header={[
              {
                text: "옵션",
                key: "0",
                type: "text",
              },
              {
                text: "수정",
                fontSize: "12px",
                fontWeight: "600",
                type: "rowEdit",
                width: "80px",
                textAlign: "center",
              },
            ]}
          />
        </Popup>
      )}
    </>
  ) : (
    <Loading height={"calc(100vh - 55px)"} />
  );
}

export default Index;
