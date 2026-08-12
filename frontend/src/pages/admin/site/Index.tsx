import { useEffect, useMemo, useRef, useState } from "react";
import Button from "components/button/Button";
import Loading from "components/loading/Loading";
import Svg from "assets/svg/Svg";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import { useAuth } from "contexts/authContext";
import style from "./site.module.scss";
import {
  isSiteTextEditable,
  joinSitePath,
} from "./sitePaths";

type SiteEntry = {
  type: "folder" | "file";
  name: string;
  path: string;
  size?: number;
  lastModified?: string;
};

function formatBytes(n?: number) {
  if (n == null) return "-";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

const btnBase = {
  borderRadius: "4px",
  height: "32px",
  boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
} as const;

const btnSm = {
  borderRadius: "4px",
  height: "28px",
  padding: "0 8px",
  fontSize: "12px",
} as const;

const SiteAdmin = () => {
  const { SiteAPI } = useAPIv2();
  const { currentUser, currentSchool } = useAuth();
  const academyId = currentUser?.academyId || "";

  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [published, setPublished] = useState(false);
  const [prefix, setPrefix] = useState("");
  const [folders, setFolders] = useState<SiteEntry[]>([]);
  const [files, setFiles] = useState<SiteEntry[]>([]);
  const [editorPath, setEditorPath] = useState<string | null>(null);
  const [editorContent, setEditorContent] = useState("");
  const [editorDirty, setEditorDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const uploadInput = useRef<HTMLInputElement>(null);
  const zipInput = useRef<HTMLInputElement>(null);

  const publicUrl = useMemo(
    () => `${process.env.REACT_APP_SERVER_URL}/sites/${academyId}/`,
    [academyId]
  );

  const previewUrl = useMemo(
    () =>
      `${process.env.REACT_APP_SERVER_URL}/api/sites/${academyId}/preview/`,
    [academyId]
  );

  const featureEnabled =
    currentSchool?.academyFeatures?.sitePublishEnabled === true;

  const loadListing = async (nextPrefix: string) => {
    if (!academyId) return;
    const result = await SiteAPI.RSiteFiles({
      params: { academyId },
      query: nextPrefix ? { prefix: nextPrefix } : {},
    });
    setPrefix(result.prefix || "");
    setFolders(result.folders || []);
    setFiles(result.files || []);
  };

  useEffect(() => {
    if (!featureEnabled) {
      setLoading(false);
      setForbidden(true);
      return;
    }
    if (!academyId) return;

    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const meta = await SiteAPI.RSiteMeta({ params: { academyId } });
        if (cancelled) return;
        setPublished(!!meta.sitePublished);
        const result = await SiteAPI.RSiteFiles({
          params: { academyId },
          query: {},
        });
        if (cancelled) return;
        setPrefix(result.prefix || "");
        setFolders(result.folders || []);
        setFiles(result.files || []);
        setForbidden(false);
      } catch (err: any) {
        if (cancelled) return;
        if (err?.response?.status === 403 || err?.response?.status === 404) {
          setForbidden(true);
        } else {
          ALERT_ERROR(err);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bootstrap once per academy/feature
  }, [featureEnabled, academyId]);

  const crumbs = useMemo(() => {
    if (!prefix) return [];
    const parts = prefix.split("/");
    const acc: { label: string; path: string }[] = [];
    let cur = "";
    for (const part of parts) {
      cur = cur ? `${cur}/${part}` : part;
      acc.push({ label: part, path: cur });
    }
    return acc;
  }, [prefix]);

  const refresh = async () => {
    try {
      await loadListing(prefix);
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  const onTogglePublish = async () => {
    const next = !published;
    const msg = next
      ? "사이트를 외부에 공개하시겠습니까?"
      : "사이트 공개를 중단하시겠습니까?";
    if (!window.confirm(msg)) return;
    try {
      const result = await SiteAPI.USitePublished({
        params: { academyId },
        data: { sitePublished: next },
      });
      setPublished(!!result.sitePublished);
      alert(SUCCESS_MESSAGE);
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  const onCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      alert("공개 URL이 복사되었습니다.");
    } catch {
      window.prompt("URL을 복사하세요:", publicUrl);
    }
  };

  const onMkdir = async () => {
    const name = window.prompt("새 폴더 이름");
    if (!name) return;
    const path = joinSitePath(prefix, name.trim());
    try {
      await SiteAPI.CSiteMkdir({
        params: { academyId },
        data: { path },
      });
      await refresh();
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  const onUploadFiles = async (fileList: FileList | null) => {
    if (!fileList?.length) return;
    try {
      for (const file of Array.from(fileList)) {
        const path = joinSitePath(prefix, file.name);
        const form = new FormData();
        form.append("file", file);
        await SiteAPI.CSiteUpload({
          params: { academyId },
          query: { path },
          data: form,
        });
      }
      await refresh();
      alert(SUCCESS_MESSAGE);
    } catch (err) {
      ALERT_ERROR(err);
    } finally {
      if (uploadInput.current) uploadInput.current.value = "";
    }
  };

  const onImportZip = async (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file) return;
    if (
      !window.confirm(
        "ZIP을 가져오면 같은 경로의 기존 파일을 덮어씁니다. 계속할까요?"
      )
    ) {
      if (zipInput.current) zipInput.current.value = "";
      return;
    }
    try {
      const form = new FormData();
      form.append("file", file);
      const result = await SiteAPI.CSiteImportZip({
        params: { academyId },
        data: form,
      });
      await loadListing("");
      alert(`${result.imported || 0}개 파일을 가져왔습니다.`);
    } catch (err) {
      ALERT_ERROR(err);
    } finally {
      if (zipInput.current) zipInput.current.value = "";
    }
  };

  const onRename = async (entry: SiteEntry) => {
    if (entry.type !== "file") {
      alert("폴더 이름 변경은 지원하지 않습니다. 파일을 사용해 주세요.");
      return;
    }
    const nextName = window.prompt("새 파일 이름", entry.name);
    if (!nextName || nextName === entry.name) return;
    const parent = entry.path.includes("/")
      ? entry.path.slice(0, entry.path.lastIndexOf("/"))
      : "";
    const to = joinSitePath(parent, nextName.trim());
    try {
      await SiteAPI.USiteMove({
        params: { academyId },
        data: { from: entry.path, to },
      });
      if (editorPath === entry.path) {
        setEditorPath(to);
      }
      await refresh();
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  const onDelete = async (entry: SiteEntry) => {
    const label =
      entry.type === "folder"
        ? `폴더 "${entry.name}"와 하위 파일을 삭제할까요?`
        : `파일 "${entry.name}"을(를) 삭제할까요?`;
    if (!window.confirm(label)) return;
    try {
      await SiteAPI.DSiteFiles({
        params: { academyId },
        query: {
          path: entry.path,
          ...(entry.type === "folder" ? { recursive: true } : {}),
        },
      });
      if (editorPath === entry.path || editorPath?.startsWith(`${entry.path}/`)) {
        setEditorPath(null);
        setEditorContent("");
        setEditorDirty(false);
      }
      await refresh();
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  const openEditor = async (path: string) => {
    if (!isSiteTextEditable(path)) {
      alert("이 파일 형식은 인라인 편집을 지원하지 않습니다.");
      return;
    }
    if (editorDirty && !window.confirm("저장하지 않은 변경이 있습니다. 닫을까요?")) {
      return;
    }
    try {
      const result = await SiteAPI.RSiteContent({
        params: { academyId },
        query: { path },
      });
      setEditorPath(result.path);
      setEditorContent(result.content ?? "");
      setEditorDirty(false);
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  const saveEditor = async () => {
    if (!editorPath) return;
    setSaving(true);
    try {
      await SiteAPI.USiteContent({
        params: { academyId },
        data: { path: editorPath, content: editorContent },
      });
      setEditorDirty(false);
      alert(SUCCESS_MESSAGE);
      await refresh();
    } catch (err) {
      ALERT_ERROR(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading />;

  const isEmpty = folders.length === 0 && files.length === 0;
  const showEditorPanel = !!editorPath || !isEmpty;

  if (forbidden || !featureEnabled) {
    return (
      <div className={style.section}>
        <div className={style.title}>공개 웹사이트</div>
        <div className={style.disabledMsg}>
          공개 웹사이트 기능이 활성화되지 않았습니다. 소유자에게 권한을
          요청하세요.
        </div>
      </div>
    );
  }

  return (
    <div className={style.section}>
      <div className={style.header}>
        <div className={style.titleBlock}>
          <div className={style.title}>공개 웹사이트</div>
          <p className={style.hint}>
            정적 HTML/CSS/JS 사이트를 관리하고 외부에 공개합니다.
          </p>
        </div>
        <div className={style.actions}>
          <span
            className={`${style.statusBadge} ${
              published ? style.statusOn : style.statusOff
            }`}
          >
            {published ? "게시 중" : "비공개"}
          </span>
          {published ? (
            <Button type="ghost" style={btnBase} onClick={onTogglePublish}>
              게시 중단
            </Button>
          ) : (
            <Button style={btnBase} onClick={onTogglePublish}>
              게시하기
            </Button>
          )}
          <Button
            type="ghost"
            style={btnBase}
            onClick={() =>
              window.open(published ? publicUrl : previewUrl, "_blank")
            }
          >
            {published ? "공개 페이지" : "미리보기"}
          </Button>
        </div>
      </div>

      <div className={style.publicUrl}>
        <span className={style.publicUrlLabel}>공개 URL</span>
        <span className={style.publicUrlValue}>{publicUrl}</span>
        <Button type="ghost" style={btnSm} onClick={onCopyUrl}>
          복사
        </Button>
      </div>

      <input
        ref={uploadInput}
        className={style.hiddenInput}
        type="file"
        multiple
        onChange={(e) => onUploadFiles(e.target.files)}
      />
      <input
        ref={zipInput}
        className={style.hiddenInput}
        type="file"
        accept=".zip,application/zip"
        onChange={(e) => onImportZip(e.target.files)}
      />

      <div
        className={`${style.layout} ${
          showEditorPanel ? "" : style.layoutSolo
        }`}
      >
        <div className={style.panel}>
          <div className={style.panelHeader}>
            <div className={style.breadcrumb}>
              <span
                className={`${style.crumb} ${
                  !prefix ? style.crumbCurrent : ""
                }`}
                onClick={() => loadListing("")}
              >
                site
              </span>
              {crumbs.map((c, idx) => (
                <span key={c.path}>
                  <span className={style.crumbSep}>/</span>
                  <span
                    className={`${style.crumb} ${
                      idx === crumbs.length - 1 ? style.crumbCurrent : ""
                    }`}
                    onClick={() => loadListing(c.path)}
                  >
                    {c.label}
                  </span>
                </span>
              ))}
            </div>
            <div className={style.toolbarActions}>
              <Button type="ghost" style={btnSm} onClick={onMkdir}>
                + 폴더
              </Button>
              <Button style={btnSm} onClick={() => uploadInput.current?.click()}>
                업로드
              </Button>
              <Button
                type="ghost"
                style={btnSm}
                onClick={() => zipInput.current?.click()}
              >
                ZIP
              </Button>
            </div>
          </div>

          <div className={style.panelBody}>
            {isEmpty ? (
              <div className={style.empty}>
                <div className={style.emptyIcon}>
                  <Svg type="code" width="24px" height="24px" />
                </div>
                <div className={style.emptyTitle}>아직 파일이 없습니다</div>
                <p className={style.emptyText}>
                  파일을 업로드하거나 ZIP으로 가져오세요. 공개 진입점은{" "}
                  <code>index.html</code> 입니다.
                </p>
                <div className={style.emptyActions}>
                  <Button
                    style={btnBase}
                    onClick={() => uploadInput.current?.click()}
                  >
                    파일 업로드
                  </Button>
                  <Button
                    type="ghost"
                    style={btnBase}
                    onClick={() => zipInput.current?.click()}
                  >
                    ZIP 가져오기
                  </Button>
                </div>
                <p className={style.pathHint}>
                  자산은 <code>/sites/{academyId}/</code> 기준 상대 경로로
                  연결하세요. 예: <code>css/style.css</code>
                </p>
              </div>
            ) : (
              <table className={style.table}>
                <thead>
                  <tr>
                    <th>이름</th>
                    <th>크기</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {folders.map((folder) => (
                    <tr
                      key={`d-${folder.path}`}
                      className={style.rowClick}
                      onClick={() => loadListing(folder.path)}
                    >
                      <td>
                        <div className={style.nameCell}>
                          <span
                            className={`${style.kindTag} ${style.kindFolder}`}
                          >
                            <Svg
                              type="description"
                              width="14px"
                              height="14px"
                            />
                          </span>
                          {folder.name}
                        </div>
                      </td>
                      <td className={style.sizeCell}>-</td>
                      <td>
                        <div
                          className={style.rowActions}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            type="ghost"
                            onClick={() => onDelete(folder)}
                            style={btnSm}
                          >
                            삭제
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {files.map((file) => (
                    <tr
                      key={`f-${file.path}`}
                      className={`${style.rowClick} ${
                        editorPath === file.path ? style.rowActive : ""
                      }`}
                      onClick={() => openEditor(file.path)}
                    >
                      <td>
                        <div className={style.nameCell}>
                          <span className={style.kindTag}>
                            <Svg type="file" width="14px" height="14px" />
                          </span>
                          {file.name}
                        </div>
                      </td>
                      <td className={style.sizeCell}>
                        {formatBytes(file.size)}
                      </td>
                      <td>
                        <div
                          className={style.rowActions}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            type="ghost"
                            onClick={() => onRename(file)}
                            style={btnSm}
                          >
                            이름변경
                          </Button>
                          <Button
                            type="ghost"
                            onClick={() => onDelete(file)}
                            style={btnSm}
                          >
                            삭제
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {showEditorPanel && (
          <div className={style.panel}>
            {editorPath ? (
              <div className={style.editor}>
                <div className={style.editorHeader}>
                  <div>
                    <div className={style.editorPath}>{editorPath}</div>
                    <div className={style.editorMeta}>
                      <span className={style.editorHint}>
                        상대 경로로 자산 링크
                      </span>
                      {editorDirty && (
                        <span className={style.dirtyBadge}>수정됨</span>
                      )}
                    </div>
                  </div>
                  <div className={style.actions}>
                    <Button
                      style={btnSm}
                      disabled={saving || !editorDirty}
                      onClick={saveEditor}
                    >
                      저장
                    </Button>
                    <Button
                      type="ghost"
                      style={btnSm}
                      onClick={() => {
                        if (
                          editorDirty &&
                          !window.confirm("저장하지 않은 변경을 버릴까요?")
                        )
                          return;
                        setEditorPath(null);
                        setEditorContent("");
                        setEditorDirty(false);
                      }}
                    >
                      닫기
                    </Button>
                  </div>
                </div>
                <div className={style.editorBody}>
                  <textarea
                    className={style.textarea}
                    value={editorContent}
                    spellCheck={false}
                    onChange={(e) => {
                      setEditorContent(e.target.value);
                      setEditorDirty(true);
                    }}
                  />
                  <p className={style.pathHint}>
                    예: <code>&lt;link rel=&quot;stylesheet&quot; href=&quot;css/style.css&quot;&gt;</code>
                  </p>
                </div>
              </div>
            ) : (
              <div className={style.empty}>
                <div className={style.emptyIcon}>
                  <Svg type="code" width="24px" height="24px" />
                </div>
                <div className={style.emptyTitle}>파일 편집</div>
                <p className={style.emptyText}>
                  HTML/CSS/JS 등 텍스트 파일을 선택하면 여기서 편집할 수
                  있습니다.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SiteAdmin;
