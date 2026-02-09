import Button from "components/button/Button";
import { useAuth } from "contexts/authContext";
import style from "style/pages/archive.module.scss";
import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";

import Loading from "components/loading/Loading";
import Popup from "components/popup/Popup";
import Progress from "components/progress/Progress";
import Callout from "components/callout/Callout";

import _ from "lodash";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";

type Props = {
  editable?: boolean;
};

const One = (props: Props) => {
  const { ArchiveAPI, FileAPI } = useAPIv2();
  const { pid } = useParams(); // archive label ex) 인적 사항

  const { currentSchool, currentRegistration } = useAuth();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [archiveId, setArchiveId] = useState<string>("");
  const [archiveData, setArchiveData] = useState<any>({});
  const archiveDataRef = useRef<any>({});
  const initialArchiveDataRef = useRef<any>({});

  const [refresh, setRefresh] = useState<boolean>(false);

  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [isUpdatePopupActive, setIsUpdatePopupActive] =
    useState<boolean>(false);
  const [updatingRatio, setUpdatingRatio] = useState<number>(0);
  const [updatingLogs, setUpdatingLogs] = useState<string[]>([]);
  const [hasChanges, setHasChanges] = useState<boolean>(false);

  const fileInput: { [key: string]: any } = {};

  useEffect(() => {
    if (isLoading && currentRegistration && pid) {
      ArchiveAPI.RArchiveByRegistration({
        query: { registration: currentRegistration?._id, label: pid },
      })
        .then(({ archive }) => {
          setArchiveId(archive._id);
          setArchiveData(archive.data[pid]);
          archiveDataRef.current = archive.data[pid] ?? {};
          initialArchiveDataRef.current = JSON.parse(
            JSON.stringify(archive.data[pid] ?? {})
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

  useEffect(() => {
    if (refresh) setRefresh(false);
  }, [refresh]);

  function formArchive() {
    return (
      currentSchool.formArchive?.filter((val: any) => {
        return val.label === pid;
      })[0] ?? { fields: [] }
    );
  }

  const checkForChanges = () => {
    const fields = formArchive().fields ?? [];
    for (const field of fields) {
      const current = archiveDataRef.current?.[field.label];
      const initial = initialArchiveDataRef.current?.[field.label];
      if (!_.isEqual(current, initial)) {
        setHasChanges(true);
        return;
      }
    }
    setHasChanges(false);
  };

  const updateArchive = async () => {
    setUpdatingRatio(0);
    const updatingLogs: string[] = [];

    try {
      const data: { [key: string]: any } = {};
      for (let field of formArchive().fields ?? []) {
        data[field.label] = archiveDataRef.current?.[field.label];
      }

      const { archive } = await ArchiveAPI.UArchiveByRegistration({
        params: { _id: archiveId },
        data: {
          label: pid ?? "",
          data,
          registration: currentRegistration?._id,
        },
      });
      setArchiveData(archive.data[pid!]);
      archiveDataRef.current = archive.data[pid!] ?? {};
      initialArchiveDataRef.current = JSON.parse(
        JSON.stringify(archive.data[pid!] ?? {})
      );
      setHasChanges(false);
      setUpdatingRatio(1);
      setRefresh(true);
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

  const correntFormFileImage = /(jpeg|jpg|webp|png)$/;
  const correctFormFile =
    /(pdf|hwp|octet-stream|zip|sheet|document|pptx|jpeg|jpg|webp|png)$/;

  const handleFileImageChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!e.target.files || e.target.files?.length === 0) return;
    if (!e.target.files[0].type.match(correntFormFileImage)) {
      alert("지원되지 않는 파일 형식입니다.");
      return;
    }
    if (e.target.files[0].size > 5 * 1024 * 1024) {
      alert("크기가 5MB 이하인 파일만 등록할 수 있습니다.");
      return;
    }

    const formData = new FormData();
    formData.append("file", e.target.files[0]);
    return await FileAPI.CUploadFileArchive({ data: formData })
      .then((res) => {
        return res;
      })
      .catch((err) => {
        ALERT_ERROR(err);
      });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files?.length === 0) return;
    if (!e.target.files[0].type.match(correctFormFile)) {
      alert("지원되지 않는 파일 형식입니다.");
      return;
    }
    if (e.target.files[0].size > 5 * 1024 * 1024) {
      alert("크기가 5MB 이하인 파일만 등록할 수 있습니다.");
      return;
    }

    const formData = new FormData();
    formData.append("file", e.target.files[0]);
    return await FileAPI.CUploadFileArchive({ data: formData })
      .then((res) => {
        return res;
      })
      .catch((err) => {
        ALERT_ERROR(err);
      });
  };

  const fieldInput = (label: string, index: number) => {
    return (
      <div className={style.field} key={index}>
        <div className={style.label}>{label}</div>
        <textarea
          defaultValue={archiveData?.[label] || ""}
          className={style.input}
          rows={1}
          disabled={!props.editable}
          onChange={
            props.editable
              ? (e: any) => {
                  archiveDataRef.current[label] = e.target.value;
                  checkForChanges();
                }
              : undefined
          }
        />
      </div>
    );
  };

  const fieldFile = (label: string, index: number) => {
    if (props.editable) {
      var inputElem = document.createElement("input");
      inputElem.type = "file";
      inputElem.value = "";
      fileInput[label] = React.createRef();
      fileInput[label].current = inputElem;
    }

    /* if file is uploaded */
    if (archiveData?.[label]?.preSignedUrl) {
      return (
        <div className={style.field} key={index}>
          <div className={style.label}>{label}</div>
          <div
            style={{
              marginLeft: "24px",
              marginRight: "24px",
              display: "flex",
              flex: "auto",
            }}
          >
            <div
              style={{
                flex: "auto",
                display: "flex",
                alignItems: "center",
                flexDirection: "column",
                margin: "12px",
              }}
            >
              <span
                style={{
                  color: "gray",
                  textDecorationLine: "underline",
                  cursor: "pointer",
                }}
                onClick={async () => {
                  try {
                    const { preSignedUrl } = await FileAPI.RSignedUrlArchive({
                      query: {
                        key: archiveData?.[label]?.key,
                        archive: archiveId,
                        label: pid ?? "",
                        fieldLabel: label,
                        fileName: archiveData?.[label]?.originalName,
                      },
                    });

                    const anchor = document.createElement("a");
                    anchor.href = preSignedUrl;
                    anchor.download = archiveData?.originalName;

                    anchor.click();
                  } catch (err) {
                    alert("Failed to download file; URL is expired");
                  }
                }}
              >
                {archiveData?.[label]?.originalName || "untitled"}
              </span>
            </div>
            {props.editable && (
              <div
                style={{
                  flex: "auto",
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "12px",
                  marginTop: "12px",
                  marginBottom: "12px",
                  alignItems: "center",
                }}
              >
                <React.Fragment>
                  <Button
                    type={"ghost"}
                    style={{
                      backgroundColor: "rgba(33,37,41,.64)",
                      color: "white",
                      border: "none",
                    }}
                    onClick={() => {
                      fileInput[label].current.click();
                    }}
                  >
                    변경
                  </Button>
                  <input
                    type="file"
                    ref={fileInput[label]}
                    style={{ display: "none" }}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      handleFileChange(e).then((res) => {
                        archiveDataRef.current[label] = res;
                        setIsUpdating(true);
                      });
                    }}
                  />
                </React.Fragment>
                <Button
                  type={"ghost"}
                  style={{
                    backgroundColor: "rgba(33,37,41,.64)",
                    color: "white",
                    border: "none",
                  }}
                  onClick={() => {
                    archiveDataRef.current[label] = undefined;
                    setIsUpdating(true);
                  }}
                >
                  삭제
                </Button>
              </div>
            )}
          </div>
        </div>
      );
    }
    /* if file is not uploaded */
    return (
      <div className={style.field} key={index}>
        <div className={style.label}>{label}</div>
        <div
          style={{
            marginLeft: "24px",
            marginRight: "24px",
            display: "flex",
            flex: "auto",
          }}
        >
          <div
            style={{
              flex: "auto",
              display: "flex",
              justifyContent: "flex-end",
              gap: "12px",
              marginTop: "12px",
              marginBottom: "12px",
            }}
          >
            {props.editable && (
              <React.Fragment>
                <Button
                  type={"ghost"}
                  style={{
                    backgroundColor: "rgba(33,37,41,.64)",
                    color: "white",
                    border: "none",
                  }}
                  onClick={() => {
                    fileInput[label].current.click();
                  }}
                >
                  업로드
                </Button>
                <input
                  type="file"
                  ref={fileInput[label]}
                  style={{ display: "none" }}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    handleFileChange(e).then((res) => {
                      archiveDataRef.current[label] = res;
                      setIsUpdating(true);
                    });
                  }}
                />
              </React.Fragment>
            )}
          </div>
        </div>
      </div>
    );
  };

  const fieldFileImage = (label: string, index: number) => {
    if (props.editable) {
      var inputElem = document.createElement("input");
      inputElem.type = "file";
      inputElem.value = "";
      fileInput[label] = React.createRef();
      fileInput[label].current = inputElem;
    }

    /* if image is uploaded */
    if (archiveData?.[label]?.preSignedUrl) {
      return (
        <div className={style.field} key={index}>
          <div className={style.label}>{label}</div>
          <div
            style={{
              marginLeft: "24px",
              marginRight: "24px",
              display: "flex",
              flex: "auto",
            }}
          >
            <div
              style={{
                flex: "auto",
                display: "flex",
                alignItems: "center",
                flexDirection: "column",
                maxWidth: "240px",
                margin: "12px",
              }}
            >
              <img
                src={archiveData?.[label]?.preSignedUrl}
                onError={async (e) => {
                  e.currentTarget.onerror = null;
                  const { preSignedUrl, expiryDate } =
                    await FileAPI.RSignedUrlArchive({
                      query: {
                        key: archiveData?.[label]?.key,
                        archive: archiveId,
                        label: pid ?? "",
                        fieldLabel: label,
                        fileName: archiveData?.[label]?.originalName,
                      },
                    });

                  archiveData[label].preSignedUrl = preSignedUrl;
                  archiveData[label].expiryDate = expiryDate;

                  setRefresh(true);
                }}
                alt="profile"
              />

              <span
                style={{
                  color: "gray",
                  textDecorationLine: "underline",
                  cursor: "pointer",
                }}
                onClick={async () => {
                  try {
                    const { preSignedUrl } = await FileAPI.RSignedUrlArchive({
                      query: {
                        key: archiveData?.[label]?.key,
                        archive: archiveId,
                        label: pid ?? "",
                        fieldLabel: label,
                        fileName: archiveData?.[label]?.originalName,
                      },
                    });

                    const anchor = document.createElement("a");
                    anchor.href = preSignedUrl;
                    anchor.download = archiveData[label]?.originalName;

                    anchor.click();
                  } catch (err) {
                    alert("Failed to download file; URL is expired");
                  }
                }}
              >
                {archiveData[label]?.originalName || "untitled"}
              </span>
            </div>
            {props.editable && (
              <div
                style={{
                  flex: "auto",
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "12px",
                  marginTop: "12px",
                  marginBottom: "12px",
                  alignItems: "center",
                }}
              >
                <React.Fragment>
                  <Button
                    type={"ghost"}
                    style={{
                      backgroundColor: "rgba(33,37,41,.64)",
                      color: "white",
                      border: "none",
                    }}
                    onClick={() => {
                      fileInput[label].current.click();
                    }}
                  >
                    변경
                  </Button>
                  <input
                    type="file"
                    ref={fileInput[label]}
                    style={{ display: "none" }}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      handleFileImageChange(e).then((res) => {
                        archiveDataRef.current[label] = res;
                        setIsUpdating(true);
                      });
                    }}
                  />
                </React.Fragment>
                <Button
                  type={"ghost"}
                  style={{
                    backgroundColor: "rgba(33,37,41,.64)",
                    color: "white",
                    border: "none",
                  }}
                  onClick={() => {
                    archiveDataRef.current[label] = undefined;
                    setIsUpdating(true);
                  }}
                >
                  삭제
                </Button>
              </div>
            )}
          </div>
        </div>
      );
    }
    /* if image is not uploaded */
    return (
      <div className={style.field} key={index}>
        <div className={style.label}>{label}</div>
        <div
          style={{
            marginLeft: "24px",
            marginRight: "24px",
            display: "flex",
            flex: "auto",
          }}
        >
          <div
            style={{
              flex: "auto",
              display: "flex",
              justifyContent: "flex-end",
              gap: "12px",
              marginTop: "12px",
              marginBottom: "12px",
            }}
          >
            {props.editable && (
              <React.Fragment>
                <Button
                  type={"ghost"}
                  style={{
                    backgroundColor: "rgba(33,37,41,.64)",
                    color: "white",
                    border: "none",
                  }}
                  onClick={() => {
                    fileInput[label].current.click();
                  }}
                >
                  업로드
                </Button>
                <input
                  type="file"
                  ref={fileInput[label]}
                  style={{ display: "none" }}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    handleFileImageChange(e).then((res) => {
                      archiveDataRef.current[label] = res;
                      setIsUpdating(true);
                    });
                  }}
                />
              </React.Fragment>
            )}
          </div>
        </div>
      </div>
    );
  };

  return !isLoading && !refresh ? (
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
      <div className={style.content} style={{ paddingBottom: "24px" }}>
        <div>
          {formArchive().fields?.map((val: any, index: number) => {
            if (
              val.type === "input" ||
              val.type === "input-number" ||
              val.type === "select"
            ) {
              return fieldInput(val.label, index);
            }
            if (val.type === "file-image") {
              return fieldFileImage(val.label, index);
            }
            if (val.type === "file") {
              return fieldFile(val.label, index);
            }
          })}
        </div>
      </div>
      {isUpdatePopupActive && (
        <Popup setState={setIsUpdatePopupActive} contentScroll closeBtn>
          <div>
            <p>
              {isUpdating ? "저장 중입니다." : `저장이 완료되었습니다.`}
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
