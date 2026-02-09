import Button from "components/button/Button";
import Table from "components/tableV2/Table";
import { useAuth } from "contexts/authContext";
import _ from "lodash";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useAppNavigate } from "hooks/useAppNavigate";
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
  const initialArchiveDataRef = useRef<any[]>([]);

  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [isUpdatePopupActive, setIsUpdatePopupActive] =
    useState<boolean>(false);
  const [updatingRatio, setUpdatingRatio] = useState<number>(0);
  const [updatingLogs, setUpdatingLogs] = useState<string[]>([]);
  const [hasChanges, setHasChanges] = useState<boolean>(false);

  useEffect(() => {
    if (isLoading && currentRegistration && pid) {
      ArchiveAPI.RArchiveByRegistration({
        query: { registration: currentRegistration?._id, label: pid },
      })
        .then(({ archive }) => {
          setArchiveId(archive._id);
          setArchiveData(archive.data[pid] ?? []);
          archiveDataRef.current = archive.data[pid] ?? [];
          initialArchiveDataRef.current = JSON.parse(
            JSON.stringify(archive.data[pid] ?? [])
          );
          setHasChanges(false);
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

  const autoSave = async () => {
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
      initialArchiveDataRef.current = JSON.parse(
        JSON.stringify(archive.data[pid!] ?? [])
      );
      setHasChanges(false);
    } catch (err) {
      ALERT_ERROR(err);
      setIsLoading(true);
    }
  };

  const checkForChanges = () => {
    const fields = formArchive().fields ?? [];

    // Build current data for comparison
    const currentData: any[] = [];
    for (const item of archiveDataRef.current) {
      const dataItem: { [key: string]: string } = {};
      for (const field of fields) {
        dataItem[field.label] = item[field.label];
      }
      currentData.push(dataItem);
    }

    // Build initial data for comparison
    const initialData: any[] = [];
    for (const item of initialArchiveDataRef.current) {
      const dataItem: { [key: string]: string } = {};
      for (const field of fields) {
        dataItem[field.label] = item[field.label];
      }
      initialData.push(dataItem);
    }

    setHasChanges(!_.isEqual(currentData, initialData));
  };

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
      initialArchiveDataRef.current = JSON.parse(
        JSON.stringify(archive.data[pid!] ?? [])
      );
      setHasChanges(false);
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
      {props.editable && hasChanges && (
        <Button
          type="solid"
          style={{
            marginTop: "24px",
            backgroundColor: "#2563eb",
            color: "white",
            fontWeight: 600,
            padding: "0 20px",
            boxShadow: "0 2px 8px rgba(37, 99, 235, 0.3)",
          }}
          onClick={() => {
            setIsUpdating(true);
          }}
        >
          변경 사항 저장
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
                  const prevLength = initialArchiveDataRef.current.length;
                  archiveDataRef.current = value;
                  if (value.length !== prevLength) {
                    autoSave();
                  } else {
                    checkForChanges();
                  }
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
