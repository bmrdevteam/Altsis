/**
 * @file Post Create/Edit Page
 *
 * @author
 *
 * -------------------------------------------------------
 *
 * IN PRODUCTION
 *
 * -------------------------------------------------------
 */

import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useAppNavigate } from "hooks/useAppNavigate";
import { useAuth } from "contexts/authContext";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import _ from "lodash";

import style from "style/pages/enrollment.module.scss";

import Input from "components/input/Input";
import Button from "components/button/Button";
import Svg from "assets/svg/Svg";
import Autofill from "components/input/Autofill";
import ToggleSwitch from "components/toggleSwitch/ToggleSwitch";
import { MarkdownEditor } from "components/markdown";
import EmbedDialog from "components/markdown/EmbedDialog";

import { TBoard, TBoardMembers, TMemberUser } from "types/board";
import { TAltForm } from "types/altForm";
import { TPost, TPostAttachment } from "types/post";
import Popup from "components/popup/Popup";
import surveyStyle from "./survey/survey.module.scss";

const PostCreate = () => {
  const navigate = useAppNavigate();
  const { boardId, postId } = useParams<{
    boardId: string;
    postId?: string;
  }>();
  const { currentUser, currentSchool } = useAuth();
  const { BoardAPI, PostAPI, UserAPI, ChatAPI, AltFormAPI } = useAPIv2();

  const [board, setBoard] = useState<TBoard | null>(null);
  const [altForms, setAltForms] = useState<TAltForm[]>([]);
  const [showTemplateGuide, setShowTemplateGuide] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  // 읽기 권한: 특정 대상만 설정 여부
  const [useSpecificPermission, setUseSpecificPermission] = useState(false);
  const [permissionRead, setPermissionRead] = useState<TBoardMembers>({
    groups: { manager: true, teacher: true, student: true },
    users: [],
  });

  const [userList, setUserList] = useState<any[]>([]);
  const [showPermissionPopup, setShowPermissionPopup] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 첨부파일
  const [attachments, setAttachments] = useState<TPostAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mdFileInputRef = useRef<HTMLInputElement>(null);
  // 첨부파일 미리보기 URL 캐시 (서명 URL)
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  // OG 이미지 로드 실패 추적
  const [brokenOgImages, setBrokenOgImages] = useState<Set<number>>(new Set());
  // 링크/YouTube/HTML 임베드 첨부 팝업
  const [showLinkPopup, setShowLinkPopup] = useState(false);
  const [showYoutubePopup, setShowYoutubePopup] = useState(false);
  const [showHtmlEmbedPopup, setShowHtmlEmbedPopup] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [isFetchingOg, setIsFetchingOg] = useState(false);

  const isEditMode = !!postId;

  useEffect(() => {
    if (isLoading && boardId) {
      const promises: Promise<any>[] = [
        BoardAPI.RBoard({ params: { _id: boardId } }),
        UserAPI.RUsers({ query: { sid: currentSchool?.school } }),
      ];

      if (postId) {
        promises.push(PostAPI.RPost({ params: { _id: postId } }));
      }

      Promise.all(promises)
        .then(([boardRes, usersRes, postRes]) => {
          const loadedBoard: TBoard = boardRes.board;
          setBoard(loadedBoard);
          setUserList(usersRes.users || []);

          if (postRes?.post) {
            const post: TPost = postRes.post;
            setTitle(post.title);
            // S3 서명 URL → 만료되지 않는 리다이렉트 URL로 변환
            const fixedContent = post.content.replace(
              /https?:\/\/[^/\s)]*\.s3\.[^/\s)]*\.amazonaws\.com\/([^?\s)]+\/posts\/[^?\s)]+)\?[^\s)]*/g,
              (_match: string, key: string) =>
                `${process.env.REACT_APP_SERVER_URL}/api/posts/file/view?key=${encodeURIComponent(key)}`
            );
            setContent(fixedContent);

            // 첨부파일 로드 + 이미지 미리보기 URL 설정
            if (post.attachments && post.attachments.length > 0) {
              setAttachments(post.attachments);
              // 이미지 미리보기용 리다이렉트 URL 생성
              const imageUrls: Record<string, string> = {};
              post.attachments.forEach((file) => {
                if (file.key && file.mimeType?.startsWith("image/")) {
                  imageUrls[file.key] = `${process.env.REACT_APP_SERVER_URL}/api/posts/file/view?key=${encodeURIComponent(file.key)}`;
                }
              });
              setPreviewUrls(imageUrls);
            }

            // 새 구조: permissionRead
            if (post.permissionRead?.groups) {
              setUseSpecificPermission(true);
              setPermissionRead(post.permissionRead);
            }
            // 레거시 폴백: targetAudience → permissionRead 변환
            else if (
              post.targetAudience?.type &&
              post.targetAudience.type !== "all"
            ) {
              setUseSpecificPermission(true);
              const ta = post.targetAudience;
              if (ta.type === "custom" && ta.users) {
                setPermissionRead({
                  groups: { manager: false, teacher: false, student: false },
                  users: ta.users.map((u) => ({
                    user: u.user,
                    userId: u.userId,
                    userName: u.userName,
                  })),
                });
              } else {
                setPermissionRead({
                  groups: {
                    manager: ta.type === "manager",
                    teacher: ta.type === "teacher",
                    student: ta.type === "student",
                  },
                  users: [],
                });
              }
            } else {
              // 전체 공개
              setUseSpecificPermission(false);
              setPermissionRead({
                groups: { manager: false, teacher: false, student: false },
                users: [],
              });
            }
          } else {
            // 신규 작성: 전체 멤버 대상 (기본값)
            setPermissionRead({
              groups: { manager: false, teacher: false, student: false },
              users: [],
            });
          }

          setIsLoading(false);
        })
        .catch((err) => {
          ALERT_ERROR(err);
          setIsLoading(false);
        });
    }
  }, [isLoading, boardId, postId]);

  // Alt Board: 양식 목록 로드 (템플릿 변수 안내용)
  useEffect(() => {
    if (board?.boardMode === "alt" && boardId) {
      AltFormAPI.RAltForms({ query: { board: boardId } })
        .then(({ forms }) => setAltForms(forms))
        .catch(() => {});
    }
  }, [board]);

  // 첨부파일 업로드
  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (file.size > 20 * 1024 * 1024) {
        alert(`${file.name}: 파일 크기는 20MB 이하여야 합니다.`);
        continue;
      }

      try {
        const formData = new FormData();
        formData.append("file", file);

        const result = await PostAPI.CUploadPostFile({ data: formData });

        setAttachments((prev) => [
          ...prev,
          {
            url: result.url,
            fileName: result.fileName,
            fileSize: result.fileSize,
            mimeType: result.mimeType,
            key: result.key,
          },
        ]);

        // 이미지 미리보기 URL 저장 (리다이렉트 URL 사용)
        if (result.mimeType?.startsWith("image/")) {
          setPreviewUrls((prev) => ({
            ...prev,
            [result.key]: `${process.env.REACT_APP_SERVER_URL}/api/posts/file/view?key=${encodeURIComponent(result.key)}`,
          }));
        }
      } catch (err) {
        ALERT_ERROR(err);
      }
    }

    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // 에디터 이미지 업로드 콜백
  const handleEditorImageUpload = async (
    file: File
  ): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const result = await PostAPI.CUploadPostFile({ data: formData });

      // 첨부파일 목록에도 추가
      setAttachments((prev) => [
        ...prev,
        {
          url: result.url,
          fileName: result.fileName,
          fileSize: result.fileSize,
          mimeType: result.mimeType,
          key: result.key,
        },
      ]);

      // 이미지 미리보기 URL 저장 (프록시 URL 사용)
      if (result.mimeType?.startsWith("image/")) {
        setPreviewUrls((prev) => ({
          ...prev,
          [result.key]: `${process.env.REACT_APP_SERVER_URL}/api/posts/file/view?key=${encodeURIComponent(result.key)}`,
        }));
      }

      // 만료되지 않는 프록시 URL 반환
      return `${process.env.REACT_APP_SERVER_URL}/api/posts/file/view?key=${encodeURIComponent(result.key)}`;
    } catch (err) {
      ALERT_ERROR(err);
      return null;
    }
  };

  // 드래그앤드롭
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  // YouTube 영상 ID 추출
  const extractYoutubeVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  // 링크 첨부 추가
  const handleAddLink = async () => {
    if (!linkUrl.trim()) return;

    let url = linkUrl.trim();
    if (!/^https?:\/\//i.test(url)) {
      url = "https://" + url;
    }

    try {
      new URL(url);
    } catch {
      alert("올바른 URL을 입력해주세요.");
      return;
    }

    setIsFetchingOg(true);
    try {
      const ogData = await PostAPI.RPostOgMeta({ query: { url } });
      setAttachments((prev) => [
        ...prev,
        {
          type: "link",
          url,
          fileName: ogData.ogTitle || url,
          fileSize: 0,
          mimeType: "text/html",
          ogTitle: ogData.ogTitle || undefined,
          ogDescription: ogData.ogDescription || undefined,
          ogImage: ogData.ogImage || undefined,
        },
      ]);
    } catch {
      setAttachments((prev) => [
        ...prev,
        {
          type: "link",
          url,
          fileName: url,
          fileSize: 0,
          mimeType: "text/html",
        },
      ]);
    }
    setIsFetchingOg(false);
    setLinkUrl("");
    setShowLinkPopup(false);
  };

  // YouTube 첨부 추가
  const handleAddYoutube = async () => {
    if (!youtubeUrl.trim()) return;

    const videoId = extractYoutubeVideoId(youtubeUrl.trim());
    if (!videoId) {
      alert("올바른 YouTube URL을 입력해주세요.");
      return;
    }

    const cleanUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const thumbnail = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;

    // noembed oEmbed API로 제목 가져오기 (YouTube OG는 봇 차단됨)
    let videoTitle = "";
    setIsFetchingOg(true);
    try {
      const resp = await fetch(
        `https://noembed.com/embed?url=${encodeURIComponent(cleanUrl)}`
      );
      if (resp.ok) {
        const data = await resp.json();
        videoTitle = data.title || "";
      }
    } catch {
      // 실패해도 진행
    }
    setIsFetchingOg(false);

    setAttachments((prev) => [
      ...prev,
      {
        type: "youtube",
        url: cleanUrl,
        fileName: videoTitle || `YouTube: ${videoId}`,
        fileSize: 0,
        mimeType: "video/youtube",
        ogTitle: videoTitle || undefined,
        ogImage: thumbnail,
        youtubeVideoId: videoId,
      },
    ]);

    setYoutubeUrl("");
    setShowYoutubePopup(false);
  };

  // HTML에서 메타데이터 추출 (title, description, og:image)
  const extractHtmlMeta = (html: string) => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");

      const title =
        doc.querySelector("title")?.textContent?.trim() || "";
      const description =
        doc
          .querySelector('meta[property="og:description"]')
          ?.getAttribute("content") ||
        doc
          .querySelector('meta[name="description"]')
          ?.getAttribute("content") ||
        "";
      const ogImage =
        doc
          .querySelector('meta[property="og:image"]')
          ?.getAttribute("content") ||
        "";

      return { title, description, ogImage };
    } catch {
      return { title: "", description: "", ogImage: "" };
    }
  };

  // HTML 임베드 첨부 추가
  const handleAddHtmlEmbed = async (
    embedType: "code" | "url",
    content: string
  ) => {
    const isCode = embedType === "code";
    const size = new Blob([content]).size;

    if (isCode) {
      const meta = extractHtmlMeta(content);
      setAttachments((prev) => [
        ...prev,
        {
          type: "htmlEmbed",
          embedType,
          htmlContent: content,
          url: "",
          fileName: meta.title || "HTML 임베드",
          fileSize: size,
          mimeType: "text/html",
          ogTitle: meta.title || undefined,
          ogDescription: meta.description || undefined,
          ogImage: meta.ogImage || undefined,
        },
      ]);
    } else {
      // URL 타입: OG 메타데이터 가져오기
      setIsFetchingOg(true);
      try {
        const ogData = await PostAPI.RPostOgMeta({
          query: { url: content },
        });
        setAttachments((prev) => [
          ...prev,
          {
            type: "htmlEmbed",
            embedType,
            url: content,
            fileName: ogData.ogTitle || content,
            fileSize: 0,
            mimeType: "text/html",
            ogTitle: ogData.ogTitle || undefined,
            ogDescription: ogData.ogDescription || undefined,
            ogImage: ogData.ogImage || undefined,
          },
        ]);
      } catch {
        setAttachments((prev) => [
          ...prev,
          {
            type: "htmlEmbed",
            embedType,
            url: content,
            fileName: content,
            fileSize: 0,
            mimeType: "text/html",
          },
        ]);
      }
      setIsFetchingOg(false);
    }

    setShowHtmlEmbedPopup(false);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      alert("제목을 입력해주세요.");
      return;
    }
    if (!content.trim()) {
      alert("내용을 입력해주세요.");
      return;
    }
    if (useSpecificPermission && permissionRead.users.length === 0) {
      alert("읽기 권한 대상을 한 명 이상 선택해주세요.");
      return;
    }

    setIsSubmitting(true);

    try {
      const postPermissionRead = useSpecificPermission ? permissionRead : undefined;

      if (isEditMode && postId) {
        await PostAPI.UPost({
          params: { _id: postId },
          data: {
            title: title.trim(),
            content: content.trim(),
            attachments,
            permissionRead: useSpecificPermission ? permissionRead : null,
          },
        });
        alert("수정되었습니다.");
        // 드래프트 클리어
        if (boardId) {
          localStorage.removeItem(`editor-draft-${boardId}-${postId || "new"}`);
        }
        navigate(`/boards/${boardId}/post/${postId}`);
      } else {
        const { post } = await PostAPI.CPost({
          data: {
            board: boardId!,
            title: title.trim(),
            content: content.trim(),
            attachments,
            permissionRead: postPermissionRead,
          },
        });
        alert("작성되었습니다.");
        // 드래프트 클리어
        if (boardId) {
          localStorage.removeItem(`editor-draft-${boardId}-new`);
        }
        navigate(`/boards/${boardId}/post/${post._id}`);
      }
    } catch (err) {
      ALERT_ERROR(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddUser = (userJson: string) => {
    const parsed: TMemberUser = JSON.parse(userJson);
    setPermissionRead((prev) => ({
      ...prev,
      users: _.uniqBy([...prev.users, parsed], (u) => u.userId),
    }));
  };

  const handleRemoveUser = (userId: string) => {
    setPermissionRead((prev) => ({
      ...prev,
      users: prev.users.filter((u) => u.userId !== userId),
    }));
  };

  const getUserOptions = () => {
    const existingIds = new Set(permissionRead.users.map((u) => u.userId));
    return userList
      .filter((u: any) => !existingIds.has(u.userId))
      .map((u: any) => ({
        text: `${u.userName}(${u.userId})`,
        value: JSON.stringify({
          user: u._id,
          userId: u.userId,
          userName: u.userName,
        }),
      }));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  return (
    <>
      <div className={style.section}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
            }}
            onClick={() => navigate(`/boards/${boardId}`)}
          >
            <Svg type="chevronLeft" width="24px" height="24px" />
          </div>
          <div className={style.title} style={{ margin: 0 }}>
            {board?.name} - {isEditMode ? "글 수정" : "글 작성"}
          </div>
        </div>

        <div
          style={{
            marginBottom: "16px",
            display: "flex",
            alignItems: "flex-end",
            gap: "8px",
          }}
        >
          <div style={{ flex: 1 }}>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "14px",
                fontWeight: 500,
              }}
            >
              제목
            </label>
            <Input
              placeholder="제목을 입력하세요"
              value={title}
              onChange={(e: any) => setTitle(e.target.value)}
            />
          </div>
          <button
            type="button"
            onClick={() => setShowPermissionPopup(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 12px",
              border: "1px solid var(--border-color)",
              borderRadius: "8px",
              background: useSpecificPermission
                ? "var(--status-info-bg)"
                : "var(--background-color-2)",
              cursor: "pointer",
              fontSize: "14px",
              color: "var(--accent-1)",
              whiteSpace: "nowrap",
              height: "38px",
            }}
            title="대상 설정"
          >
            <Svg type="profileList" width="18px" height="18px" />
            <span>대상</span>
            {useSpecificPermission && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: "20px",
                  height: "20px",
                  padding: "0 6px",
                  borderRadius: "10px",
                  backgroundColor: "var(--btn-color-1)",
                  color: "#fff",
                  fontSize: "11px",
                  fontWeight: 600,
                }}
              >
                {permissionRead.users.length}
              </span>
            )}
          </button>
        </div>

        <div style={{ marginBottom: "24px" }}>
          <label
            style={{
              display: "block",
              marginBottom: "8px",
              fontSize: "14px",
              fontWeight: 500,
            }}
          >
            내용
          </label>
          <MarkdownEditor
            value={content}
            onChange={setContent}
            placeholder="마크다운 형식으로 작성할 수 있습니다."
            minHeight="400px"
            onImageUpload={handleEditorImageUpload}
            onFileDrop={(files) => {
              const dt = new DataTransfer();
              files.forEach((f) => dt.items.add(f));
              handleFileSelect(dt.files);
            }}
            draftKey={boardId ? `${boardId}-${postId || "new"}` : undefined}
            title={title}
            onDraftRestore={(data) => {
              setContent(data.content);
              if (data.title) setTitle(data.title);
            }}
            searchMentionUsers={async (query: string) => {
              try {
                const { users } = await ChatAPI.RChatUsers({
                  query: {
                    q: query,
                    sid: currentSchool?.school,
                  },
                });
                return users?.slice(0, 8) || [];
              } catch {
                return [];
              }
            }}
            toolbarExtra={
              <>
                <span
                  style={{
                    display: "inline-block",
                    width: 1,
                    height: 20,
                    margin: "0 4px",
                    backgroundColor: "var(--border-default-color)",
                  }}
                />
                <input
                  ref={mdFileInputRef}
                  type="file"
                  accept=".md,.markdown,.txt"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      const text = ev.target?.result;
                      if (typeof text === "string") {
                        setContent(text);
                      }
                    };
                    reader.readAsText(file);
                    e.target.value = "";
                  }}
                />
                <button
                  type="button"
                  title="마크다운 파일 가져오기 (.md)"
                  onClick={() => mdFileInputRef.current?.click()}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 32,
                    height: 32,
                    padding: 0,
                    background: "none",
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                    color: "var(--accent-3)",
                  }}
                >
                  <Svg type="upload" width="18px" height="18px" />
                </button>
                {board?.boardMode === "alt" && altForms.length > 0 && (
                  <button
                    type="button"
                    title="시트 데이터 연결 (템플릿 변수)"
                    onClick={() => setShowTemplateGuide(true)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 32,
                      height: 32,
                      padding: 0,
                      background: "none",
                      border: "none",
                      borderRadius: 6,
                      cursor: "pointer",
                      color: "var(--accent-3)",
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: 20 }}
                    >
                      data_object
                    </span>
                  </button>
                )}
              </>
            }
          />
        </div>

        {/* 템플릿 변수 안내 모달 */}
        {showTemplateGuide && (
          <Popup
            title="시트 데이터 연결 (템플릿 변수)"
            setState={setShowTemplateGuide}
            closeBtn
            contentScroll
            style={{ maxWidth: "640px", width: "100%" }}
          >
            <div style={{ padding: "20px", fontSize: "13px", lineHeight: 1.8 }}>
              <p style={{ marginBottom: "16px", color: "var(--text-color-2)" }}>
                문서 내용에 아래 문법을 사용하면 시트 데이터가 자동으로 삽입됩니다.
              </p>

              <div style={{ marginBottom: "16px" }}>
                <strong>1. 시트 선언</strong>
                <span style={{ fontSize: "12px", color: "var(--text-color-2)", marginLeft: 8 }}>문서 상단에 작성</span>
                <pre
                  style={{
                    padding: "8px 12px",
                    background: "var(--background-color-2)",
                    borderRadius: "6px",
                    fontSize: "12px",
                    margin: "6px 0",
                    overflow: "auto",
                  }}
                >
                  {`{{#sheet 양식이름}}`}
                </pre>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <strong>2. 변수 삽입</strong>
                <pre
                  style={{
                    padding: "8px 12px",
                    background: "var(--background-color-2)",
                    borderRadius: "6px",
                    fontSize: "12px",
                    margin: "6px 0",
                    overflow: "auto",
                  }}
                >
{`{{필드이름}}              — 필드 값
{{필드|date:YYYY.MM.DD}} — 날짜 포맷
{{필드|number:,}}        — 숫자 천 단위 쉼표
{{_respondentName}}      — 응답자 이름
{{_respondentId}}        — 응답자 ID
{{_submittedAt}}         — 제출일
{{_count}}               — 전체 응답 수`}
                </pre>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <strong>3. 반복/테이블</strong>
                <pre
                  style={{
                    padding: "8px 12px",
                    background: "var(--background-color-2)",
                    borderRadius: "6px",
                    fontSize: "12px",
                    margin: "6px 0",
                    overflow: "auto",
                  }}
                >
{`{{#each}}
  {{_index}}. {{이름}}: {{점수}}점
{{/each}}

{{#table _index, 이름, 점수, 상태}}`}
                </pre>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <strong>4. 필터/정렬</strong>
                <pre
                  style={{
                    padding: "8px 12px",
                    background: "var(--background-color-2)",
                    borderRadius: "6px",
                    fontSize: "12px",
                    margin: "6px 0",
                    overflow: "auto",
                  }}
                >
{`{{#filter 학년 == "10학년"}}
{{#filter 점수 > 80}}
{{#sort 이름 asc}}
{{#sort 점수 desc}}`}
                </pre>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <strong>5. 집계</strong>
                <pre
                  style={{
                    padding: "8px 12px",
                    background: "var(--background-color-2)",
                    borderRadius: "6px",
                    fontSize: "12px",
                    margin: "6px 0",
                    overflow: "auto",
                  }}
                >
{`{{#sum 필드}}   — 합계
{{#avg 필드}}   — 평균
{{#min 필드}}   — 최솟값
{{#max 필드}}   — 최댓값
{{#unique 필드}} — 고유값 목록`}
                </pre>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <strong>6. 조건부 표시</strong>
                <pre
                  style={{
                    padding: "8px 12px",
                    background: "var(--background-color-2)",
                    borderRadius: "6px",
                    fontSize: "12px",
                    margin: "6px 0",
                    overflow: "auto",
                  }}
                >
{`{{#if 상태 == "승인"}}승인됨{{#else}}미승인{{/if}}

연산자: == != > < >= <= contains isEmpty isNotEmpty`}
                </pre>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <strong>7. 그룹핑</strong>
                <pre
                  style={{
                    padding: "8px 12px",
                    background: "var(--background-color-2)",
                    borderRadius: "6px",
                    fontSize: "12px",
                    margin: "6px 0",
                    overflow: "auto",
                  }}
                >
{`{{#group 학년}}
### {{_groupValue}} ({{_groupCount}}명)
{{#table 이름, 점수}}
{{/group}}`}
                </pre>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <strong>{`8. 입력 문서 ({{#form}})`}</strong>
                <span style={{ fontSize: "12px", color: "var(--text-color-2)", marginLeft: 8 }}>
                  문서에서 직접 입력받기
                </span>
                <pre
                  style={{
                    padding: "8px 12px",
                    background: "var(--background-color-2)",
                    borderRadius: "6px",
                    fontSize: "12px",
                    margin: "6px 0",
                    overflow: "auto",
                  }}
                >
{`{{#form 양식이름}}          — 입력 문서 선언 ({{#sheet}} 대신 사용)
{{#input 필드이름}}          — 밑줄 스타일 입력 필드

예:
{{#form 결석계}}
본인 {{#input 이름}} 은(는) {{#input 날짜}} 에
{{#input 사유}} 의 사유로 결석합니다.`}
                </pre>
                <div style={{ fontSize: "11px", color: "var(--text-color-2)", marginTop: "4px" }}>
                  모든 사용자에게 입력 필드 표시 / 관리자는 "전체 응답 보기"로 전환 가능
                </div>
              </div>

              {/* 양식별 사용 가능한 변수 목록 */}
              <div
                style={{
                  marginTop: "20px",
                  paddingTop: "16px",
                  borderTop: "1px solid var(--border-color)",
                }}
              >
                <strong>사용 가능한 양식/필드</strong>
                <span style={{ fontSize: "12px", color: "var(--text-color-2)", marginLeft: 8 }}>
                  클릭하여 복사
                </span>
                {altForms.map((form) => (
                  <div
                    key={form._id}
                    style={{
                      marginTop: "10px",
                      padding: "10px 12px",
                      background: "var(--background-color-2)",
                      borderRadius: "6px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        fontWeight: 600,
                        marginBottom: "6px",
                        fontSize: "12px",
                        color: "var(--text-color-2)",
                      }}
                    >
                      <span
                        style={{ cursor: "pointer" }}
                        onClick={() => navigator.clipboard.writeText(`{{#sheet ${form.title}}}`)}
                        title="읽기 전용 머지 문서"
                      >
                        {`{{#sheet ${form.title}}}`}
                      </span>
                      <span style={{ color: "var(--border-color)" }}>|</span>
                      <span
                        style={{ cursor: "pointer", color: "var(--primary-color, #3b82f6)" }}
                        onClick={() => navigator.clipboard.writeText(`{{#form ${form.title}}}`)}
                        title="입력 문서"
                      >
                        {`{{#form ${form.title}}}`}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "4px",
                      }}
                    >
                      {form.fields.map((f) => (
                        <span key={f._id} style={{ display: "inline-flex", gap: "2px" }}>
                          <span
                            onClick={() => {
                              navigator.clipboard.writeText(`{{${f.label}}}`);
                            }}
                            style={{
                              padding: "3px 10px",
                              background: "var(--background-color-1)",
                              border: "1px solid var(--border-color)",
                              borderRadius: "4px 0 0 4px",
                              fontSize: "12px",
                              cursor: "pointer",
                              color: "var(--text-color-1)",
                              transition: "background 0.15s",
                            }}
                            title={`{{${f.label}}} 복사 (읽기 전용)`}
                          >
                            {`{{${f.label}}}`}
                          </span>
                          <span
                            onClick={() => {
                              navigator.clipboard.writeText(`{{#input ${f.label}}}`);
                            }}
                            style={{
                              padding: "3px 6px",
                              background: "var(--status-info-bg, #e0f2fe)",
                              border: "1px solid var(--border-color)",
                              borderLeft: "none",
                              borderRadius: "0 4px 4px 0",
                              fontSize: "11px",
                              cursor: "pointer",
                              color: "var(--primary-color, #3b82f6)",
                              transition: "background 0.15s",
                            }}
                            title={`{{#input ${f.label}}} 복사 (입력 필드)`}
                          >
                            입력
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Popup>
        )}

        {/* 첨부 */}
        <div style={{ marginBottom: "24px" }}>
          <label
            style={{
              display: "block",
              marginBottom: "8px",
              fontSize: "14px",
              fontWeight: 500,
            }}
          >
            첨부
          </label>

          {/* 첨부된 파일 리스트 */}
          {attachments.length > 0 && (
            <div className={surveyStyle.attachList}>
              {attachments.map((file, idx) => {
                const attachType = file.type || "file";
                const isImage =
                  attachType === "file" &&
                  file.mimeType?.startsWith("image/");
                const isLink = attachType === "link";
                const isYoutube = attachType === "youtube";
                const isHtmlEmbed = attachType === "htmlEmbed";

                // 썸네일 결정
                const ogImageOk =
                  (isYoutube || isLink || isHtmlEmbed) &&
                  file.ogImage &&
                  !brokenOgImages.has(idx);

                let thumbnailContent: React.ReactNode;
                if (ogImageOk) {
                  thumbnailContent = (
                    <img
                      src={file.ogImage}
                      alt=""
                      className={surveyStyle.attachItemThumb}
                      onError={() =>
                        setBrokenOgImages((prev) => new Set(prev).add(idx))
                      }
                    />
                  );
                } else if (isImage && file.key) {
                  const imageUrl =
                    previewUrls[file.key] ||
                    `${process.env.REACT_APP_SERVER_URL}/api/posts/file/view?key=${encodeURIComponent(file.key)}`;
                  thumbnailContent = (
                    <img
                      src={imageUrl}
                      alt={file.fileName}
                      className={surveyStyle.attachItemThumb}
                    />
                  );
                } else {
                  const iconType = isHtmlEmbed
                    ? "htmlEmbed"
                    : isYoutube
                    ? "youtube"
                    : isLink
                    ? "link"
                    : "paperclip";
                  thumbnailContent = (
                    <div className={surveyStyle.attachItemIconLarge}>
                      <Svg type={iconType} width="24px" height="24px" />
                    </div>
                  );
                }

                // 제목 및 메타 정보
                const displayTitle = isHtmlEmbed
                  ? file.ogTitle || file.fileName || "HTML 임베드"
                  : isLink
                  ? file.ogTitle || file.url
                  : isYoutube
                  ? file.ogTitle || file.fileName
                  : file.fileName;

                let displayMeta: string;
                if (isHtmlEmbed) {
                  if (file.ogDescription) {
                    displayMeta = file.ogDescription;
                  } else if (file.embedType === "code") {
                    displayMeta = `HTML 코드 (${formatFileSize(file.fileSize)})`;
                  } else {
                    displayMeta = file.url || "HTML URL";
                  }
                } else if (isLink) {
                  try {
                    displayMeta =
                      file.ogDescription || new URL(file.url).hostname;
                  } catch {
                    displayMeta = file.url;
                  }
                } else if (isYoutube) {
                  displayMeta = "YouTube";
                } else {
                  displayMeta = formatFileSize(file.fileSize);
                }

                return (
                  <div
                    key={`${file.url}-${idx}`}
                    className={surveyStyle.attachItem}
                  >
                    <div className={surveyStyle.attachItemThumbArea}>
                      {thumbnailContent}
                    </div>
                    <div className={surveyStyle.attachItemBody}>
                      <div className={surveyStyle.attachItemInfo}>
                        <span className={surveyStyle.attachItemTitle}>
                          {displayTitle}
                        </span>
                        <span className={surveyStyle.attachItemMeta}>
                          {displayMeta}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className={surveyStyle.attachItemClose}
                      onClick={() => handleRemoveAttachment(idx)}
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* 업로드 버튼 */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            style={{ display: "none" }}
            onChange={(e) => handleFileSelect(e.target.files)}
          />
          <div
            className={`${surveyStyle.attachCardGrid} ${
              isDragging ? surveyStyle.attachCardGridDragging : ""
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <button
              type="button"
              className={surveyStyle.attachCard}
              onClick={() => !isUploading && fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <Svg type="upload" width="24px" height="24px" />
              <span>{isUploading ? "업로드 중..." : "업로드"}</span>
            </button>
            <button
              type="button"
              className={surveyStyle.attachCard}
              onClick={() => setShowLinkPopup(true)}
            >
              <Svg type="link" width="24px" height="24px" />
              <span>링크 추가</span>
            </button>
            <button
              type="button"
              className={surveyStyle.attachCard}
              onClick={() => setShowYoutubePopup(true)}
            >
              <Svg type="youtube" width="24px" height="24px" />
              <span>YouTube</span>
            </button>
            <button
              type="button"
              className={surveyStyle.attachCard}
              onClick={() => setShowHtmlEmbedPopup(true)}
            >
              <Svg type="htmlEmbed" width="24px" height="24px" />
              <span>HTML 삽입</span>
            </button>
          </div>
        </div>

        <div style={{ display: "flex", gap: "12px" }}>
          <Button type="ghost" onClick={() => navigate(`/boards/${boardId}`)}>
            취소
          </Button>
          <Button type="ghost" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting
              ? "처리 중..."
              : isEditMode
              ? "수정 완료"
              : "작성 완료"}
          </Button>
        </div>
      </div>

      {showPermissionPopup && (
        <Popup
          setState={setShowPermissionPopup}
          title="대상"
          closeBtn
          contentScroll
          style={{ maxWidth: "480px", width: "100%" }}
          footer={
            <Button
              type="ghost"
              onClick={() => setShowPermissionPopup(false)}
            >
              완료
            </Button>
          }
        >
          <div style={{ padding: "16px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "8px",
              }}
            >
              <label style={{ fontSize: "14px", fontWeight: 500 }}>
                읽기 권한 지정
              </label>
              <ToggleSwitch
                defaultChecked={useSpecificPermission}
                onChange={(checked: boolean) => {
                  setUseSpecificPermission(checked);
                  if (!checked) {
                    setPermissionRead({
                      groups: { manager: false, teacher: false, student: false },
                      users: [],
                    });
                  }
                }}
              />
            </div>
            <p
              style={{
                fontSize: "12px",
                color: "var(--text-color-2)",
                marginBottom: useSpecificPermission ? "12px" : "0",
              }}
            >
              {useSpecificPermission
                ? "선택한 대상만 이 게시글을 볼 수 있으며 알림을 받습니다."
                : "보드 멤버 전체가 이 게시글을 볼 수 있으며 알림을 받습니다."}
            </p>

            {useSpecificPermission && board && (
              <div
                style={{
                  padding: "12px",
                  border: "1px solid var(--border-color)",
                  borderRadius: "8px",
                  backgroundColor: "var(--background-color-2)",
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "13px",
                      fontWeight: 500,
                      marginBottom: "6px",
                    }}
                  >
                    대상 사용자 지정
                  </label>
                  <Autofill
                    appearence="flat"
                    placeholder="이름 또는 아이디로 검색"
                    options={getUserOptions()}
                    setState={(val: string) => handleAddUser(val)}
                    resetOnClick
                  />
                  {permissionRead.users.length > 0 && (
                    <div
                      style={{
                        marginTop: "8px",
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "8px",
                      }}
                    >
                      {permissionRead.users.map((u) => (
                        <div
                          key={u.userId}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "4px 10px",
                            backgroundColor: "var(--component-color)",
                            borderRadius: "16px",
                            fontSize: "13px",
                          }}
                        >
                          <span>
                            {u.userName}({u.userId})
                          </span>
                          <button
                            onClick={() => handleRemoveUser(u.userId)}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              padding: "0",
                              fontSize: "14px",
                              color: "var(--text-color-2)",
                              lineHeight: 1,
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </Popup>
      )}

      {showLinkPopup && (
        <Popup
          setState={setShowLinkPopup}
          title="링크 추가"
          closeBtn
          style={{ maxWidth: "480px", width: "100%" }}
          footer={
            <div style={{ display: "flex", gap: "8px" }}>
              <Button type="ghost" onClick={() => setShowLinkPopup(false)}>
                취소
              </Button>
              <Button
                type="ghost"
                onClick={handleAddLink}
                disabled={!linkUrl.trim() || isFetchingOg}
              >
                {isFetchingOg ? "불러오는 중..." : "추가"}
              </Button>
            </div>
          }
        >
          <div style={{ padding: "20px" }}>
            <Input
              placeholder="https://example.com"
              value={linkUrl}
              onChange={(e: any) => setLinkUrl(e.target.value)}
              onKeyDown={(e: any) => {
                if (e.key === "Enter" && !isFetchingOg) handleAddLink();
              }}
              label="URL"
            />
            <p
              style={{
                fontSize: "12px",
                color: "var(--text-color-2)",
                marginTop: "8px",
              }}
            >
              웹 페이지의 제목과 설명이 자동으로 가져와집니다.
            </p>
          </div>
        </Popup>
      )}

      {showYoutubePopup && (
        <Popup
          setState={setShowYoutubePopup}
          title="YouTube 추가"
          closeBtn
          style={{ maxWidth: "480px", width: "100%" }}
          footer={
            <div style={{ display: "flex", gap: "8px" }}>
              <Button type="ghost" onClick={() => setShowYoutubePopup(false)}>
                취소
              </Button>
              <Button
                type="ghost"
                onClick={handleAddYoutube}
                disabled={!youtubeUrl.trim() || isFetchingOg}
              >
                {isFetchingOg ? "불러오는 중..." : "추가"}
              </Button>
            </div>
          }
        >
          <div style={{ padding: "20px" }}>
            <Input
              placeholder="https://www.youtube.com/watch?v=..."
              value={youtubeUrl}
              onChange={(e: any) => setYoutubeUrl(e.target.value)}
              onKeyDown={(e: any) => {
                if (e.key === "Enter") handleAddYoutube();
              }}
              label="YouTube URL"
            />
            <p
              style={{
                fontSize: "12px",
                color: "var(--text-color-2)",
                marginTop: "8px",
              }}
            >
              YouTube 영상 URL을 입력하세요. (일반 영상, Shorts 지원)
            </p>
          </div>
        </Popup>
      )}

      {showHtmlEmbedPopup && (
        <EmbedDialog
          onSubmit={handleAddHtmlEmbed}
          onClose={() => setShowHtmlEmbedPopup(false)}
        />
      )}
    </>
  );
};

export default PostCreate;
