import Button from "components/button/Button";
import { useAuth } from "contexts/authContext";
import React from "react";
import style from "style/pages/archive.module.scss";
import { useRef, useEffect, useState } from "react";
import useApi from "hooks/useApi";
import { useParams } from "react-router-dom";

import Loading from "components/loading/Loading";

type Props = {
  registrationList: any[];
};

const One = (props: Props) => {
  const { ArchiveApi, FileApi } = useApi();
  const { pid } = useParams(); // archive label ex) 인적 사항

  const { currentSchool } = useAuth();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [archiveList, setArchiveList] = useState<any[]>([]);
  const archiveListRef = useRef<any>([]);

  const fileInput: {
    [key: string]: any;
  } = {};

  const [refresh, setRefresh] = useState<boolean>(false);

  useEffect(() => {
    if (pid) {
      setIsLoading(true);
    }
  }, [props.registrationList, pid]);

  useEffect(() => {
    if (isLoading && pid) {
      if (props.registrationList.length > 0) {
        ArchiveApi.RArchivesByRegistrations({
          registrationIds: props.registrationList.map(
            (registration: any) => registration._id
          ),
          label: pid,
        })
          .then((res) => {
            const archiveList = [];
            for (let i = 0; i < res.length; i++) {
              const archive = res[i];
              archiveList.push({
                ...(archive.data[pid] ? archive.data[pid] : {}),
                _id: archive._id,
                userName: archive.userName,
              });
            }

            setArchiveList(archiveList);
            archiveListRef.current = archiveList;
          })
          .then(() => {
            setIsLoading(false);
          });
      } else {
        setArchiveList([]);
        archiveListRef.current = [];
        setIsLoading(false);
      }
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

  const update = async (activateAlert: boolean = true) => {
    if (archiveListRef.current.length > 0 && pid) {
      const archiveById: { [key: string]: any } = {};
      for (let _archive of archiveListRef.current) {
        if (!archiveById[_archive._id]) archiveById[_archive._id] = {};
        const archive: { [key: string]: string | number } = {};
        formArchive().fields?.map((val: any) => {
          archive[val.label] = _archive[val.label];
        });
        archiveById[_archive._id] = archive;
      }
      const archives: { _id: string; data: any[] }[] = Object.keys(
        archiveById
      ).map((_id: string) => {
        return {
          _id,
          data: archiveById[_id],
        };
      });
      ArchiveApi.UArchives({ label: pid, archives }).then((res) => {
        setIsLoading(true);
        if (activateAlert) {
          alert(SUCCESS_MESSAGE);
        }
      });
    }
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

                  update(false);
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
                      update();
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
                  update();
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
                    update();
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
                      update();
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
                  update();
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
                    update();
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
            update();
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
                <h3>
                  {aIdx + 1}. {archive.userName}
                </h3>
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
    </>
  ) : (
    <Loading height={"calc(100vh - 55px)"} />
  );
};

export default One;
