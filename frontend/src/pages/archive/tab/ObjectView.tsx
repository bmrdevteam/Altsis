import Button from "components/button/Button";
import { useAuth } from "contexts/authContext";
import React from "react";
import style from "style/pages/archive.module.scss";
import { useRef, useEffect, useState } from "react";

import Loading from "components/loading/Loading";
import Popup from "components/popup/Popup";
import Progress from "components/progress/Progress";
import Callout from "components/callout/Callout";

import ExcelPopup from "./ExcelPopup";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";

type Props = {
  pid: string;
  registrationList: any[];
};

const ObjectView = (props: Props) => {
  const { ArchiveAPI, FileAPI } = useAPIv2();

  const { currentSchool } = useAuth();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [archiveList, setArchiveList] = useState<any[]>([]);
  const archiveListRef = useRef<any>([]);

  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [isUpdatePopupActive, setIsUpdatePopupActive] =
    useState<boolean>(false);
  const [updatingRatio, setUpdatingRatio] = useState<number>(0);
  const [updatingLogs, setUpdatingLogs] = useState<string[]>([]);

  const [isExcelPopupActive, setIsExcelPopupActive] = useState<boolean>(false);

  const fileInput: {
    [key: string]: any;
  } = {};

  const [refresh, setRefresh] = useState<boolean>(false);

  const findArchiveList = async () => {
    if (!props.pid || props.pid === "") return [];

    try {
      const rawArchiveList = (
        await Promise.all(
          props.registrationList.map(async (reg) =>
            ArchiveAPI.RArchiveByRegistration({
              query: { registration: reg._id, label: props.pid },
            })
          )
        )
      ).map(({ archive }) => archive);

      const archiveList = [];
      for (let i = 0; i < rawArchiveList.length; i++) {
        archiveList.push({
          ...(rawArchiveList[i].data[props.pid]
            ? rawArchiveList[i].data[props.pid]
            : {}),
          registration: props.registrationList[i]._id,
          user: props.registrationList[i].user,
          userId: props.registrationList[i].userId,
          userName: props.registrationList[i].userName,
          grade: props.registrationList[i].grade,
          _id: rawArchiveList[i]._id,
        });
      }
      return archiveList;
    } catch (err: any) {
      ALERT_ERROR(err);
      return [];
    }
  };

  useEffect(() => {
    if (!isLoading) {
      setIsLoading(true);
    }
  }, [props.registrationList, props.pid]);

  useEffect(() => {
    if (isLoading && props.pid) {
      findArchiveList()
        .then((archiveList) => {
          setArchiveList(archiveList);
          archiveListRef.current = archiveList;
        })
        .then(() => {
          setIsLoading(false);
        });
    }
  }, [isLoading]);

  useEffect(() => {
    if (isUpdating && props.pid) {
      setIsUpdatePopupActive(true);
      updateArchives()
        .then((archiveList) => {
          setArchiveList(archiveList);
          archiveListRef.current = archiveList;
          setRefresh(true);
        })
        .then(() => {
          setIsUpdating(false);
        });
    }
  }, [isUpdating]);

  useEffect(() => {
    if (refresh) setRefresh(false);
  }, [refresh]);

  function formArchive() {
    return (
      currentSchool.formArchive?.filter((val: any) => {
        return val.label === props.pid;
      })[0] ?? { fields: [] }
    );
  }

  const updateArchives = async () => {
    const archiveList = [];
    setUpdatingRatio(0);

    const updatingLogs: string[] = [];

    for (let i = 0; i < archiveListRef.current.length; i++) {
      try {
        const data: { [key: string]: string | number } = {};

        for (let field of formArchive().fields ?? []) {
          data[field.label] = archiveListRef.current[i][field.label];
        }

        const { archive } = await ArchiveAPI.UArchiveByRegistration({
          params: { _id: archiveListRef.current[i]._id },
          data: {
            label: props.pid ?? "",
            data,
            registration: archiveListRef.current[i].registration,
          },
        });
        archiveList.push({
          ...archiveListRef.current[i],
          ...archive,
        });
      } catch (err) {
        archiveList.push({ ...archiveListRef.current[i] });
        updatingLogs.push(
          `${archiveListRef.current[i].userName} (${archiveListRef.current[i].grade}/${archiveListRef.current[i].userId})`
        );
      } finally {
        setUpdatingRatio((i + 1) / archiveListRef.current.length);
      }
    }

    setUpdatingLogs([...updatingLogs]);
    return archiveList;
  };

  const fieldInput = (aIdx: number, label: string, index: number) => {
    return (
      <div className={style.field} key={index}>
        <div className={style.label}>{label}</div>
        <textarea
          defaultValue={archiveListRef.current[aIdx]?.[label] || ""}
          className={style.input}
          rows={1}
          onChange={(e: any) => {
            archiveListRef.current[aIdx][label] = e.target.value;
          }}
        />
      </div>
    );
  };

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

  const fieldFileImage = (aIdx: number, label: string, index: number) => {
    var inputElem = document.createElement("input");
    inputElem.type = "file";
    inputElem.value = "";

    fileInput[`${aIdx}-${label}`] = React.createRef();
    fileInput[`${aIdx}-${label}`].current = inputElem;

    /* if image is uploaded */
    if (archiveListRef.current[aIdx]?.[label]?.preSignedUrl) {
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
                src={archiveListRef.current[aIdx]?.[label]?.preSignedUrl}
                onError={async (e) => {
                  e.currentTarget.onerror = null;
                  const { preSignedUrl, expiryDate } =
                    await FileAPI.RSignedUrlArchive({
                      query: {
                        key: archiveListRef.current[aIdx]?.[label]?.key,
                        archive: archiveListRef.current[aIdx]?._id,
                        label: props.pid ?? "",
                        fieldLabel: label,
                        fileName:
                          archiveListRef.current[aIdx]?.[label]?.originalName,
                      },
                    });

                  archiveListRef.current[aIdx][label].preSignedUrl =
                    preSignedUrl;

                  archiveListRef.current[aIdx][label].expiryDate = expiryDate;

                  updateArchives();
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
                        key: archiveListRef.current[aIdx]?.[label]?.key,
                        archive: archiveListRef.current[aIdx]?._id,
                        label: props.pid ?? "",
                        fieldLabel: label,
                        fileName:
                          archiveListRef.current[aIdx]?.[label]?.originalName,
                      },
                    });

                    const anchor = document.createElement("a");
                    anchor.href = preSignedUrl;
                    anchor.download =
                      archiveListRef.current[aIdx]?.originalName;

                    anchor.click();
                  } catch (err) {
                    alert("Failed to download file; URL is expired");
                  }
                }}
              >
                {archiveListRef.current[aIdx][label]?.originalName ||
                  "untitled"}
              </span>
            </div>
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
                    fileInput[`${aIdx}-${label}`].current.click();
                  }}
                >
                  변경
                </Button>
                <input
                  className={`fileInput-${aIdx}-${label}`}
                  type="file"
                  ref={fileInput[`${aIdx}-${label}`]}
                  style={{ display: "none" }}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    handleFileImageChange(e).then((res) => {
                      archiveListRef.current[aIdx][label] = res;
                      updateArchives();
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
                  archiveListRef.current[aIdx][label] = undefined;
                  updateArchives();
                }}
              >
                삭제
              </Button>
            </div>
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
            <React.Fragment>
              <Button
                type={"ghost"}
                style={{
                  backgroundColor: "rgba(33,37,41,.64)",
                  color: "white",
                  border: "none",
                }}
                onClick={() => {
                  fileInput[`${aIdx}-${label}`].current.click();
                }}
              >
                업로드
              </Button>
              <input
                className={`fileInput-${aIdx}-${label}`}
                type="file"
                ref={fileInput[`${aIdx}-${label}`]}
                style={{ display: "none" }}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  handleFileImageChange(e).then((res) => {
                    archiveListRef.current[aIdx][label] = res;
                    updateArchives();
                  });
                }}
              />
            </React.Fragment>
          </div>
        </div>
      </div>
    );
  };

  const fieldFile = (aIdx: number, label: string, index: number) => {
    var inputElem = document.createElement("input");
    inputElem.type = "file";
    inputElem.value = "";

    fileInput[`${aIdx}-${label}`] = React.createRef();
    fileInput[`${aIdx}-${label}`].current = inputElem;

    /* if file is uploaded */
    if (archiveListRef.current[aIdx]?.[label]?.preSignedUrl) {
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
              <span
                style={{
                  color: "gray",
                  textDecorationLine: "underline",
                  cursor: "pointer",
                }}
                onClick={async () => {
                  try {
                    const { preSignedUrl, expiryDate } =
                      await await FileAPI.RSignedUrlArchive({
                        query: {
                          key: archiveListRef.current[aIdx]?.[label]?.key,
                          archive: archiveListRef.current[aIdx]?._id,
                          label: props.pid ?? "",
                          fieldLabel: label,
                          fileName:
                            archiveListRef.current[aIdx]?.[label]?.originalName,
                        },
                      });

                    const anchor = document.createElement("a");
                    anchor.href = preSignedUrl;
                    anchor.download =
                      archiveListRef.current[aIdx]?.originalName;

                    anchor.click();
                  } catch (err) {
                    alert("Failed to download file; URL is expired");
                  }
                }}
              >
                {archiveListRef.current[aIdx]?.[label]?.originalName ||
                  "untitled"}
              </span>
            </div>
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
                    fileInput[`${aIdx}-${label}`].current.click();
                  }}
                >
                  변경
                </Button>
                <input
                  className={`fileInput-${aIdx}-${label}`}
                  type="file"
                  ref={fileInput[`${aIdx}-${label}`]}
                  style={{ display: "none" }}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    handleFileChange(e).then((res) => {
                      archiveListRef.current[aIdx][label] = res;
                      updateArchives();
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
                  archiveListRef.current[aIdx][label] = undefined;
                  updateArchives();
                }}
              >
                삭제
              </Button>
            </div>
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
            <React.Fragment>
              <Button
                type={"ghost"}
                style={{
                  backgroundColor: "rgba(33,37,41,.64)",
                  color: "white",
                  border: "none",
                }}
                onClick={() => {
                  fileInput[`${aIdx}-${label}`].current.click();
                }}
              >
                업로드
              </Button>
              <input
                className={`fileInput-${aIdx}-${label}`}
                type="file"
                ref={fileInput[`${aIdx}-${label}`]}
                style={{ display: "none" }}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  handleFileChange(e).then((res) => {
                    archiveListRef.current[aIdx][label] = res;
                    updateArchives();
                  });
                }}
              />
            </React.Fragment>
          </div>
        </div>
      </div>
    );
  };

  return !isLoading && !refresh ? (
    <>
      {archiveList.length !== 0 && (
        <div>
          <Button
            type="ghost"
            style={{ marginTop: "24px", borderColor: "red" }}
            onClick={() => {
              setIsUpdating(true);
            }}
          >
            저장
          </Button>
          <Button
            type="ghost"
            style={{ marginTop: "24px", borderColor: "red" }}
            onClick={() => {
              setIsExcelPopupActive(true);
            }}
          >
            엑셀 파일로 수정
          </Button>
        </div>
      )}
      <div className={style.content} style={{ paddingBottom: "24px" }}>
        {archiveList.map((archive: any, aIdx: number) => {
          return (
            <div style={{ marginTop: "24px" }}>
              <div style={{ marginBottom: "12px" }}>
                <h3>{`${aIdx + 1}. ${archive.userName} (${archive.grade}/${
                  archive.userId
                })`}</h3>
              </div>
              {formArchive().fields?.map((val: any, index: number) => {
                if (
                  val.type === "input" ||
                  val.type === "input-number" ||
                  val.type === "select"
                ) {
                  return fieldInput(aIdx, val.label, index);
                }
                if (val.type === "file-image") {
                  return fieldFileImage(aIdx, val.label, index);
                }
                if (val.type === "file") {
                  return fieldFile(aIdx, val.label, index);
                }
              })}
            </div>
          );
        })}
      </div>
      {isUpdatePopupActive && (
        <Popup setState={setIsUpdatePopupActive} contentScroll closeBtn>
          <div>
            <p>
              {isUpdating
                ? "저장 중입니다."
                : `저장이 완료되었습니다 (성공: ${
                    archiveList.length - updatingLogs.length
                  }, 실패: ${updatingLogs.length})`}
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
      {isExcelPopupActive && (
        <ExcelPopup
          type="object"
          setPopupActive={setIsExcelPopupActive}
          fields={formArchive().fields}
          pid={props.pid ?? "data"}
          archiveListRef={archiveListRef}
          archiveList={archiveList}
          setIsUpdating={setIsUpdating}
        />
      )}
    </>
  ) : (
    <Loading height={"calc(100vh - 55px)"} />
  );
};

export default ObjectView;
