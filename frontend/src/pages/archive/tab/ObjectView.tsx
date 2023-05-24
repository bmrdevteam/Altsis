import Button from "components/button/Button";
import { useAuth } from "contexts/authContext";
import React from "react";
import style from "style/pages/archive.module.scss";
import { useRef, useEffect, useState } from "react";
import useApi from "hooks/useApi";
import { useParams } from "react-router-dom";

import Loading from "components/loading/Loading";
import Popup from "components/popup/Popup";
import Progress from "components/progress/Progress";
import Callout from "components/callout/Callout";

type Props = {
  registrationList: any[];
};

const ObjectView = (props: Props) => {
  const { ArchiveApi, FileApi } = useApi();
  const { pid } = useParams(); // archive label ex) 인적 사항

  const { currentSchool } = useAuth();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [archiveList, setArchiveList] = useState<any[]>([]);
  const archiveListRef = useRef<any>([]);

  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [isUpdatePopupActive, setIsUpdatePopupActive] =
    useState<boolean>(false);
  const [updatingRatio, setUpdatingRatio] = useState<number>(0);
  const [updatingLogs, setUpdatingLogs] = useState<string[]>([]);

  const fileInput: {
    [key: string]: any;
  } = {};

  const [refresh, setRefresh] = useState<boolean>(false);

  useEffect(() => {
    if (pid) {
      setIsLoading(true);
    }
  }, [props.registrationList, pid]);

  const findArchiveList = async () => {
    if (!pid || pid === "") return [];
    const archiveList = [];
    for (let idx = 0; idx < props.registrationList.length; idx++) {
      const reg = props.registrationList[idx];
      try {
        const archive = await ArchiveApi.RArchiveByRegistration({
          registrationId: reg._id,
          label: pid,
        });
        archiveList.push({
          ...(archive.data[pid] ? archive.data[pid] : {}),
          registration: reg._id,
          user: reg.user,
          userId: reg.userId,
          userName: reg.userName,
          grade: reg.grade,
          _id: archive._id,
        });
      } catch (err) {
        console.error(err);
      }
    }
    return archiveList;
  };

  useEffect(() => {
    if (isLoading && pid) {
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
    if (isUpdating && pid) {
      setIsUpdatePopupActive(true);
      updateArchives()
        .then((archiveList) => {
          setArchiveList(archiveList);
          archiveListRef.current = archiveList;
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
        return val.label === pid;
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

        const { archive } = await ArchiveApi.UArchiveByRegistration({
          _id: archiveListRef.current[i]._id,
          label: pid ?? "",
          data,
          registration: archiveListRef.current[i].registration,
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
    return await FileApi.UploadFileArchive({ data: formData })
      .then((res) => {
        return res;
      })
      .catch((error) => {
        alert(error);
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
    return await FileApi.UploadFileArchive({ data: formData })
      .then((res) => {
        return res;
      })
      .catch((error) => {
        alert(error);
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
                    await FileApi.SignFileArchive({
                      key: archiveListRef.current[aIdx]?.[label]?.key,
                      fileName:
                        archiveListRef.current[aIdx]?.[label]?.originalName,
                      archive: archiveListRef.current[aIdx]?._id,
                      label: pid ?? "",
                      fieldLabel: label,
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
                    const { preSignedUrl } = await FileApi.SignFileArchive({
                      key: archiveListRef.current[aIdx]?.[label]?.key,
                      fileName:
                        archiveListRef.current[aIdx]?.[label]?.originalName,
                      archive: archiveListRef.current[aIdx]?._id,
                      label: pid ?? "",
                      fieldLabel: label,
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
                      await await FileApi.SignFileArchive({
                        key: archiveListRef.current[aIdx]?.[label]?.key,
                        fileName:
                          archiveListRef.current[aIdx]?.[label]?.originalName,
                        archive: archiveListRef.current[aIdx]?._id,
                        label: pid ?? "",
                        fieldLabel: label,
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
        <Button
          type="ghost"
          style={{ marginTop: "24px", borderColor: "red" }}
          onClick={() => {
            setIsUpdating(true);
          }}
        >
          저장
        </Button>
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
        <Popup
          setState={setIsUpdatePopupActive}
          style={{ borderRadius: "8px" }}
          contentScroll
          closeBtn
        >
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
    </>
  ) : (
    <Loading height={"calc(100vh - 55px)"} />
  );
};

export default ObjectView;
