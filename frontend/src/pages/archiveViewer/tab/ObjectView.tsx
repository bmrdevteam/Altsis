import { useAuth } from "contexts/authContext";
import style from "style/pages/archive.module.scss";
import { useEffect, useState } from "react";
import useApi from "hooks/useApi";
import { useParams, useNavigate } from "react-router-dom";

import Loading from "components/loading/Loading";

import _ from "lodash";

type Props = {};

const One = (props: Props) => {
  const { ArchiveApi, FileApi } = useApi();
  const { pid } = useParams(); // archive label ex) 인적 사항
  const navigate = useNavigate();

  const { currentSchool, currentRegistration } = useAuth();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [archiveId, setArchiveId] = useState<string>("");
  const [archiveData, setArchiveData] = useState<any>({});

  const [refresh, setRefresh] = useState<boolean>(false);

  useEffect(() => {
    if (isLoading && currentRegistration && pid) {
      ArchiveApi.RArchiveByRegistration({
        registrationId: currentRegistration?._id,
        label: pid,
      })
        .then((res) => {
          setArchiveId(res._id);
          setArchiveData(res.data[pid]);
        })
        .then(() => {
          setIsLoading(false);
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

  const fieldInput = (label: string, index: number) => {
    return (
      <div className={style.field} key={index}>
        <div className={style.label}>{label}</div>
        <textarea
          defaultValue={archiveData?.[label] || ""}
          className={style.input}
          rows={1}
          disabled
        />
      </div>
    );
  };

  const fieldFile = (label: string, index: number) => {
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
                    const { preSignedUrl } = await FileApi.SignFileArchive({
                      key: archiveData?.[label]?.key,
                      fileName: archiveData?.[label]?.originalName,
                      archive: archiveId,
                      label: pid ?? "",
                      fieldLabel: label,
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
          ></div>
        </div>
      </div>
    );
  };

  const fieldFileImage = (label: string, index: number) => {
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
                    await FileApi.SignFileArchive({
                      key: archiveData?.[label]?.key,
                      fileName: archiveData?.[label]?.originalName,
                      archive: archiveId,
                      label: pid ?? "",
                      fieldLabel: label,
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
                    const { preSignedUrl, expiryDate } =
                      await FileApi.SignFileArchive({
                        key: archiveData?.[label]?.key,
                        fileName: archiveData?.[label]?.originalName,
                        archive: archiveId,
                        label: pid ?? "",
                        fieldLabel: label,
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
          ></div>
        </div>
      </div>
    );
  };

  return !isLoading && !refresh ? (
    <>
      <div className={style.content} style={{ paddingBottom: "24px" }}>
        <div style={{ marginTop: "24px" }}>
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
    </>
  ) : (
    <Loading height={"calc(100vh - 55px)"} />
  );
};

export default One;
