import Button from "components/button/Button";
import Table from "components/tableV2/Table";
import { useAuth } from "contexts/authContext";
import _ from "lodash";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Loading from "components/loading/Loading";
import Popup from "components/popup/Popup";
import Progress from "components/progress/Progress";
import Callout from "components/callout/Callout";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";

type Props = {
  editable?: boolean;
};

const One = (props: Props) => {
  const { ArchiveAPI } = useAPIv2();
  const { pid } = useParams(); // archive label ex) 인적 사항

  const { currentSchool, currentRegistration } = useAuth();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [archiveId, setArchiveId] = useState<string>("");
  const [archiveData, setArchiveData] = useState<any[]>([]);
  const archiveDataRef = useRef<any[]>([]);

  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [isUpdatePopupActive, setIsUpdatePopupActive] =
    useState<boolean>(false);
  const [updatingRatio, setUpdatingRatio] = useState<number>(0);
  const [updatingLogs, setUpdatingLogs] = useState<string[]>([]);

  useEffect(() => {
    if (isLoading && currentRegistration && pid) {
      ArchiveAPI.RArchiveByRegistration({
        query: { registration: currentRegistration?._id, label: pid },
      })
        .then(({ archive }) => {
          setArchiveId(archive._id);
          setArchiveData(archive.data[pid] ?? []);
          archiveDataRef.current = archive.data[pid] ?? [];
        })
        .then(() => {
          setIsLoading(false);
        })
        .catch((err) => {
          ALERT_ERROR(err);
        });
    }
  }, [isLoading]);

  function formArchive() {
    return (
      currentSchool.formArchive?.filter((val: any) => {
        return val.label === pid;
      })[0] ?? { fields: [] }
    );
  }

  function archiveHeader() {
    let arr: any = [
      {
        text: "No",
        type: "text",
        key: "tableRowIndex",
        width: "48px",
        textAlign: "center",
      },
    ];
    formArchive().fields?.map((val: any) => {
      if (props.editable) {
        if (val.type === "select") {
          arr.push({
            text: val.label,
            whiteSpace: "pre",
            key: val.label,
            type: "select",
            option: val.options,
          });
        } else if (val.type === "input-number") {
          arr.push({
            text: val.label,
            whiteSpace: "pre",
            key: val.label,
            type: "input-number",
          });
        } else {
          arr.push({
            byteCalc: true,
            text: val.label,
            key: val.label,
            type: val.type,
          });
        }
      } else {
        arr.push({
          text: val.label,
          key: val.label,
        });
      }
    });
    if (props.editable) {
      arr.push({
        text: "수정",
        type: "rowEdit",
        width: "72px",
        textAlign: "center",
        fontSize: "12px",
        btnStyle: {
          round: true,
          border: true,
          padding: "4px",
          color: "red",
          background: "#FFF1F1",
        },
        fontWeight: "600",
      });
    }
    return arr;
  }

  const updateArchive = async () => {
    setUpdatingRatio(0);
    const updatingLogs: string[] = [];

    try {
      const data: any[] = [];
      for (let item of archiveDataRef.current) {
        const dataItem: { [key: string]: string } = {};
        for (let field of formArchive().fields ?? []) {
          dataItem[field.label] = item[field.label];
        }
        data.push(dataItem);
      }

      const { archive } = await ArchiveAPI.UArchiveByRegistration({
        params: { _id: archiveId },
        data: {
          label: pid ?? "",
          data,
          registration: currentRegistration?._id,
        },
      });
      setArchiveData(archive.data[pid!] ?? []);
      archiveDataRef.current = archive.data[pid!] ?? [];
      setUpdatingRatio(1);
    } catch (err) {
      updatingLogs.push("저장에 실패했습니다.");
      ALERT_ERROR(err);
    }

    setUpdatingLogs([...updatingLogs]);
  };

  useEffect(() => {
    if (isUpdating && pid) {
      setIsUpdatePopupActive(true);
      updateArchive().then(() => {
        setIsUpdating(false);
      });
    }
  }, [isUpdating]);

  return !isLoading ? (
    <>
      {props.editable && (
        <Button
          type="ghost"
          style={{ marginTop: "24px", borderColor: "gray" }}
          onClick={() => {
            setIsUpdating(true);
          }}
        >
          제출
        </Button>
      )}
      <div style={{ marginTop: "24px" }}>
        <Table
          defaultPageBy={200}
          control
          type="object-array"
          data={archiveData ?? []}
          header={archiveHeader()}
          {...(props.editable
            ? {
                onChange: (value: any[]) => {
                  archiveDataRef.current = value;
                },
              }
            : {})}
        />
      </div>
      {isUpdatePopupActive && (
        <Popup setState={setIsUpdatePopupActive} contentScroll closeBtn>
          <div>
            <p>
              {isUpdating
                ? "저장 중입니다."
                : `저장이 완료되었습니다.`}
            </p>
            <Progress
              value={updatingRatio ?? 0}
              style={{ margin: "12px 0px" }}
              showIconSuccess={!isUpdating && updatingLogs.length === 0}
              showIconError={!isUpdating && updatingLogs.length > 0}
            />
            {updatingLogs.length > 0 && (
              <Callout
                type="error"
                style={{ whiteSpace: "pre" }}
                title={"저장되지 않은 항목이 있습니다."}
                description={updatingLogs.join("\n")}
              />
            )}
          </div>
        </Popup>
      )}
    </>
  ) : (
    <Loading height={"calc(100vh - 55px)"} />
  );
};

export default One;
