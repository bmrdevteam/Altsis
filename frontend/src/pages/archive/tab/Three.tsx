import Button from "components/button/Button";
import Table from "components/tableV2/Table";
import { useAuth } from "contexts/authContext";
import _ from "lodash";
import React from "react";
import style from "style/pages/archive.module.scss";
import useDatabase from "hooks/useDatabase";
import { useRef, useEffect, useState } from "react";
import useApi from "hooks/useApi";

type Props = {
  users: any[];
  archive?: string;
  formData?: React.MutableRefObject<any>;
  setUserId: React.Dispatch<React.SetStateAction<string>>;
  userId: string;
  userArchiveData: any;
};

const One = (props: Props) => {
  const database = useDatabase();
  const { ArchiveApi } = useApi();

  const { currentSchool } = useAuth();

  const dataRef = useRef<any>();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingFile, setIsLoadingFile] = useState<string>("");

  useEffect(() => {
    setIsLoading(true);
    return () => {};
  }, [props.userArchiveData]);

  useEffect(() => {
    if (isLoading) {
      dataRef.current = props.userArchiveData || {};

      if (archiveData().dataType === "object") {
        archiveData().fields?.map((val: any, index: number) => {
          if (val.type === "file-image" || val.type === "file") {
            var inputElem = document.createElement("input");
            inputElem.type = "file";
            inputElem.value = "";

            fileInputList.current[val.label] = React.createRef();
            fileInputList.current[val.label].current = inputElem;
          }
        });
      }
      setIsLoading(false);
    }

    return () => {};
  }, [isLoading]);

  useEffect(() => {
    console.log("isLoadingFile = ", isLoadingFile);
    if (isLoadingFile !== "") {
      setIsLoadingFile("");
    }
    return () => {};
  }, [isLoadingFile]);

  // const data = useRef;
  function archiveData() {
    return (
      currentSchool.formArchive?.filter((val: any) => {
        return val.label === props.archive;
      })[0] ?? { fields: [] }
    );
  }

  function archiveHeader() {
    let arr: any = [];
    archiveData().fields?.map((val: any) => {
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
    });
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
    return arr;
  }

  const fileInputList = React.useRef<any>({});

  const correntFormFileImage = /(jpeg|jpg|webp|png)$/;
  const correntFormFile =
    /(pdf|hwp|octet-stream|zip|sheet|document|pptx|jpeg|jpg|webp|png)$/;

  const handleFileImageChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!e.target.files || e.target.files?.length === 0) return;
    console.log("handleFileChange - e.target.files[0]", e.target.files[0]);
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
    console.log("file is ", e.target.files[0]);
    return await database
      .C({
        location: "files/archive",
        data: formData,
      })
      .then((res) => {
        console.log("handleFileCHange.res = ", res);

        return res;
        // updateUserProfile(res?.data.profile);
      })
      .catch((error) => {
        alert(error);
      });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files?.length === 0) return;
    console.log("handleFileChange - e.target.files[0]", e.target.files[0]);
    if (!e.target.files[0].type.match(correntFormFile)) {
      alert("지원되지 않는 파일 형식입니다.");
      return;
    }
    if (e.target.files[0].size > 5 * 1024 * 1024) {
      alert("크기가 5MB 이하인 파일만 등록할 수 있습니다.");
      return;
    }

    const formData = new FormData();
    formData.append("file", e.target.files[0]);
    console.log("file is ", e.target.files[0]);
    return await database
      .C({
        location: "files/archive",
        data: formData,
      })
      .then((res) => {
        console.log("handleFileCHange.res = ", res);

        return res;
        // updateUserProfile(res?.data.profile);
      })
      .catch((error) => {
        alert(error);
      });
  };

  const updatePreSignedUrl = async (label: string) => {
    try {
      const { preSignedUrl, expiryDate } = await database.R({
        location: `files/signed?key=${dataRef.current[label].key}`,
      });
      dataRef.current[label].preSignedUrl = preSignedUrl;
      dataRef.current[label].expiryDate = expiryDate;
    } catch (err) {
      console.log(err);
    }
  };

  const handleFileDownload = async (label: string) => {
    try {
      if (dataRef.current[label]?.expiryDate < new Date().toString()) {
        updatePreSignedUrl(label);
      }
      const anchor = document.createElement("a");
      anchor.href = dataRef.current[label]?.preSignedUrl;
      // anchor.target = "_blank";
      // anchor.rel = "noopener noreferrer";
      anchor.download = dataRef.current[label]?.originalName;
      anchor.click();
    } catch (err) {
      console.log(err);
    }
  };

  return !isLoading && archiveData().dataType === "object" ? (
    <>
      <Button
        type="ghost"
        onClick={() => {
          if (props.archive) {
            ArchiveApi.UArchive({
              _id: props.formData?.current._id,
              data: { [props.archive]: dataRef.current },
            }).then((res: any) => {
              alert("success");
            });
          }
        }}
      >
        저장
      </Button>
      <div className={style.content} style={{ paddingBottom: "24px" }}>
        {archiveData().fields?.map((val: any, index: number) => {
          if (val.type === "file-image") {
            if (
              isLoadingFile !== val.label &&
              dataRef.current &&
              dataRef.current[val.label]
            ) {
              return (
                <div className={style.field} key={index}>
                  <div className={style.label}>{val.label}</div>
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
                        src={dataRef.current[val.label].preSignedUrl}
                        onError={async (e) => {
                          console.log("onError");
                          e.currentTarget.onerror = null;
                          const { preSignedUrl, expiryDate } = await database.R(
                            {
                              location: `files/signed?key=${
                                dataRef.current[val.label].key
                              }&fileName=${
                                dataRef.current[val.label].originalName
                              }`,
                            }
                          );
                          dataRef.current[val.label].preSignedUrl =
                            preSignedUrl;
                          dataRef.current[val.label].expiryDate = expiryDate;
                          setIsLoadingFile(val.label);
                        }}
                        alt="profile"
                      />

                      <span
                        style={{
                          color: "gray",
                          textDecorationLine: "underline",
                          cursor: "pointer",
                        }}
                      >
                        <a
                          href={dataRef.current[val.label]?.preSignedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {dataRef.current[val.label]?.originalName ||
                            "untitled"}
                        </a>
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
                            fileInputList.current[val.label].current.click();
                          }}
                        >
                          변경
                        </Button>
                        <input
                          className={`fileInput-${val.label}`}
                          type="file"
                          ref={fileInputList.current[val.label]}
                          style={{ display: "none" }}
                          onChange={(
                            e: React.ChangeEvent<HTMLInputElement>
                          ) => {
                            handleFileImageChange(e).then((res) => {
                              dataRef.current[val.label] = res;
                              setIsLoadingFile(val.label);
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
                          dataRef.current[val.label] = undefined;
                          setIsLoadingFile(val.label);
                        }}
                      >
                        삭제
                      </Button>
                    </div>
                  </div>
                </div>
              );
            }
            return (
              <div className={style.field} key={index}>
                <div className={style.label}>{val.label}</div>
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
                          fileInputList.current[val.label].current.click();
                        }}
                      >
                        업로드
                      </Button>
                      <input
                        className={`fileInput-${val.label}`}
                        type="file"
                        ref={fileInputList.current[val.label]}
                        style={{ display: "none" }}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          handleFileImageChange(e).then((res) => {
                            dataRef.current[val.label] = res;
                            setIsLoadingFile(val.label);
                          });
                        }}
                      />
                    </React.Fragment>
                  </div>
                </div>
              </div>
            );
          }

          if (val.type === "file") {
            if (isLoadingFile !== val.label && dataRef.current[val.label]) {
              return (
                <div className={style.field} key={index}>
                  <div className={style.label}>{val.label}</div>
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
                        width: "240px",
                        margin: "12px",
                      }}
                    >
                      <span
                        style={{
                          color: "gray",
                          textDecorationLine: "underline",
                          cursor: "pointer",
                        }}
                        onClick={() => handleFileDownload(val.label)}
                      >
                        {dataRef.current[val.label]?.originalName || "untitled"}
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
                            fileInputList.current[val.label].current.click();
                          }}
                        >
                          변경
                        </Button>
                        <input
                          className={`fileInput-${val.label}`}
                          type="file"
                          ref={fileInputList.current[val.label]}
                          style={{ display: "none" }}
                          onChange={(
                            e: React.ChangeEvent<HTMLInputElement>
                          ) => {
                            handleFileChange(e).then((res) => {
                              dataRef.current[val.label] = res;
                              setIsLoadingFile(val.label);
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
                          dataRef.current[val.label] = undefined;
                          setIsLoadingFile(val.label);
                        }}
                      >
                        삭제
                      </Button>
                    </div>
                  </div>
                </div>
              );
            }
            return (
              <div className={style.field} key={index}>
                <div className={style.label}>{val.label}</div>
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
                          fileInputList.current[val.label].current.click();
                        }}
                      >
                        업로드
                      </Button>
                      <input
                        className={`fileInput-${val.label}`}
                        type="file"
                        ref={fileInputList.current[val.label]}
                        style={{ display: "none" }}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          handleFileChange(e).then((res) => {
                            dataRef.current[val.label] = res;
                            setIsLoadingFile(val.label);
                          });
                        }}
                      />
                    </React.Fragment>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div className={style.field} key={index}>
              <div className={style.label}>{val.label}</div>
              <textarea
                defaultValue={dataRef.current[val.label]}
                className={style.input}
                rows={1}
                onChange={(e: any) => {
                  dataRef.current[val.label] = e.target.value;
                }}
              />
            </div>
          );
        })}
      </div>
    </>
  ) : (
    <>
      {props.formData?.current && (
        <>
          <Button
            type="ghost"
            style={{ borderColor: "red" }}
            onClick={() => {
              if (props.archive) {
                ArchiveApi.UArchive({
                  _id: props.formData?.current._id,
                  data: { [props.archive]: dataRef.current },
                }).then((res: any) => {
                  alert("success");
                });
              }
            }}
          >
            저장
          </Button>
          <div style={{ marginTop: "24px" }}>
            <Table
              onChange={(value) => {
                dataRef.current = value;
                console.log(value);
              }}
              type="object-array"
              data={props.userArchiveData ?? []}
              header={archiveHeader()}
            />
          </div>
        </>
      )}
    </>
  );
};

export default One;
