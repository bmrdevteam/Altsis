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

import { TBoard, TBoardMembers, TMemberUser } from "types/board";
import { TPost, TPostAttachment } from "types/post";
import {
  TPostType,
  TReservationConfig,
} from "types/reservation";
import { TSurvey } from "types/survey";
import Popup from "components/popup/Popup";
import SurveyBuilderPopup from "./survey/SurveyBuilderPopup";
import SurveyImportPopup from "./survey/SurveyImportPopup";
import ReservationConfigPopup from "./reservation/ReservationConfigPopup";
import ReservationImportPopup from "./reservation/ReservationImportPopup";
import surveyStyle from "./survey/survey.module.scss";

const PostCreate = () => {
  const navigate = useAppNavigate();
  const { boardId, postId } = useParams<{
    boardId: string;
    postId?: string;
  }>();
  const { currentUser, currentSchool } = useAuth();
  const { BoardAPI, PostAPI, UserAPI, ChatAPI } = useAPIv2();

  const [board, setBoard] = useState<TBoard | null>(null);
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
  const [surveys, setSurveys] = useState<TSurvey[]>([]);
  const [editingSurveyIndex, setEditingSurveyIndex] = useState<number | null>(
    null
  );
  const [showSurveyBuilderPopup, setShowSurveyBuilderPopup] = useState(false);
  const [showSurveyImportPopup, setShowSurveyImportPopup] = useState(false);
  const [showSurveyMenu, setShowSurveyMenu] = useState(false);
  const surveyMenuRef = useRef<HTMLDivElement>(null);

  // 예약 설정 (첨부 방식)
  const [reservationConfig, setReservationConfig] =
    useState<TReservationConfig | null>(null);
  const [showReservationMenu, setShowReservationMenu] = useState(false);
  const [showReservationConfigPopup, setShowReservationConfigPopup] =
    useState(false);
  const [showReservationImportPopup, setShowReservationImportPopup] =
    useState(false);
  const reservationMenuRef = useRef<HTMLDivElement>(null);

  // postType 자동 결정
  const postType: TPostType = reservationConfig?.resource
    ? "reservation"
    : surveys.length > 0
    ? "survey"
    : "general";

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 첨부파일
  const [attachments, setAttachments] = useState<TPostAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // 첨부파일 미리보기 URL 캐시 (서명 URL)
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});

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
            // 설문 데이터 로드
            if (post.surveys && post.surveys.length > 0) {
              setSurveys(post.surveys);
            }
            // 예약 데이터 로드
            if (post.reservationConfig) {
              setReservationConfig({
                resource: post.reservationConfig.resource || "",
                resourceDescription:
                  post.reservationConfig.resourceDescription || "",
                slotMode: post.reservationConfig.slotMode || "time",
                defaultCapacity: post.reservationConfig.defaultCapacity || 1,
                requireApproval:
                  post.reservationConfig.requireApproval ?? true,
                maxReservationsPerUser:
                  post.reservationConfig.maxReservationsPerUser || 0,
                reservationOpenAt:
                  post.reservationConfig.reservationOpenAt || "",
                reservationCloseAt:
                  post.reservationConfig.reservationCloseAt || "",
                totalSlots: post.reservationConfig.totalSlots || 0,
                applicationForm:
                  post.reservationConfig.applicationForm || [],
                slotRuleTemplate:
                  post.reservationConfig.slotRuleTemplate || undefined,
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

  // 설문/예약 메뉴 외부 클릭 닫기
  useEffect(() => {
    if (!showSurveyMenu && !showReservationMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        showSurveyMenu &&
        surveyMenuRef.current &&
        !surveyMenuRef.current.contains(e.target as Node)
      ) {
        setShowSurveyMenu(false);
      }
      if (
        showReservationMenu &&
        reservationMenuRef.current &&
        !reservationMenuRef.current.contains(e.target as Node)
      ) {
        setShowReservationMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showSurveyMenu, showReservationMenu]);

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

  const handleRemoveAttachment = (key: string) => {
    setAttachments((prev) => prev.filter((a) => a.key !== key));
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

      // 예약 설정 데이터 구성
      const resConfig =
        reservationConfig?.resource
          ? {
              resource: reservationConfig.resource.trim(),
              resourceDescription:
                reservationConfig.resourceDescription?.trim() || "",
              slotMode: reservationConfig.slotMode,
              defaultCapacity: reservationConfig.defaultCapacity,
              requireApproval: reservationConfig.requireApproval,
              maxReservationsPerUser:
                reservationConfig.maxReservationsPerUser,
              ...(reservationConfig.reservationOpenAt
                ? { reservationOpenAt: reservationConfig.reservationOpenAt }
                : {}),
              ...(reservationConfig.reservationCloseAt
                ? { reservationCloseAt: reservationConfig.reservationCloseAt }
                : {}),
              ...(reservationConfig.slotRuleTemplate
                ? { slotRuleTemplate: reservationConfig.slotRuleTemplate }
                : {}),
            }
          : undefined;

      if (isEditMode && postId) {
        await PostAPI.UPost({
          params: { _id: postId },
          data: {
            title: title.trim(),
            content: content.trim(),
            attachments,
            permissionRead: useSpecificPermission ? permissionRead : null,
            surveys,
            ...(resConfig
              ? { reservationConfig: resConfig }
              : { reservationConfig: null }),
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
            surveys,
            postType,
            ...(resConfig && {
              reservationConfig: resConfig,
            }),
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
            <Input
              label="제목"
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
              fontSize: "13px",
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
          />
        </div>

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

          {/* 첨부된 항목 리스트 (파일 + 설문 + 예약 통합) */}
          {(attachments.length > 0 || surveys.length > 0 || reservationConfig) && (
            <div className={surveyStyle.attachList}>
              {attachments.map((file) => {
                const isImage = file.mimeType?.startsWith("image/");
                const imageUrl = isImage && file.key
                  ? (previewUrls[file.key] || `${process.env.REACT_APP_SERVER_URL}/api/posts/file/view?key=${encodeURIComponent(file.key)}`)
                  : null;
                return (
                  <div key={file.key} className={surveyStyle.attachItem}>
                    <div className={surveyStyle.attachItemThumbArea}>
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={file.fileName}
                          className={surveyStyle.attachItemThumb}
                        />
                      ) : (
                        <div className={surveyStyle.attachItemIconLarge}>
                          <Svg type="paperclip" width="24px" height="24px" />
                        </div>
                      )}
                    </div>
                    <div className={surveyStyle.attachItemBody}>
                      <div className={surveyStyle.attachItemInfo}>
                        <span className={surveyStyle.attachItemTitle}>
                          {file.fileName}
                        </span>
                        <span className={surveyStyle.attachItemMeta}>
                          {formatFileSize(file.fileSize)}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className={surveyStyle.attachItemClose}
                      onClick={() => handleRemoveAttachment(file.key!)}
                    >
                      ×
                    </button>
                  </div>
                );
              })}
              {surveys.map((s, idx) => (
                <div key={`survey-${idx}`} className={surveyStyle.attachItem}>
                  <div className={surveyStyle.attachItemThumbArea}>
                    <div className={surveyStyle.attachItemIconLarge}>
                      <Svg type="description" width="24px" height="24px" />
                    </div>
                  </div>
                  <div className={surveyStyle.attachItemBody}>
                    <div className={surveyStyle.attachItemInfo}>
                      <span className={surveyStyle.attachItemTitle}>
                        {s.title || `설문 ${idx + 1}`}
                      </span>
                      <span className={surveyStyle.attachItemMeta}>
                        {s.questions.length}개 질문
                        {s.settings.isAnonymous && " · 익명"}
                        {s.responseCount > 0 &&
                          ` · ${s.responseCount}명 응답`}
                      </span>
                    </div>
                    <div className={surveyStyle.attachItemActions}>
                      <button
                        type="button"
                        className={surveyStyle.attachItemBtn}
                        onClick={() => {
                          setEditingSurveyIndex(idx);
                          setShowSurveyBuilderPopup(true);
                        }}
                      >
                        편집
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    className={surveyStyle.attachItemClose}
                    onClick={() => {
                      if (
                        s.responseCount > 0 &&
                        !window.confirm(
                          "이 설문에 응답이 있습니다. 삭제하시겠습니까?"
                        )
                      ) {
                        return;
                      }
                      setSurveys((prev) =>
                        prev.filter((_, i) => i !== idx)
                      );
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
              {/* 예약 첨부 항목 */}
              {reservationConfig && (
                <div className={surveyStyle.attachItem}>
                  <div className={surveyStyle.attachItemThumbArea}>
                    <div className={surveyStyle.attachItemIconLarge}>
                      <Svg type="eventCalendar" width="24px" height="24px" />
                    </div>
                  </div>
                  <div className={surveyStyle.attachItemBody}>
                    <div className={surveyStyle.attachItemInfo}>
                      <span className={surveyStyle.attachItemTitle}>
                        {reservationConfig.resource || "예약"}
                      </span>
                      <span className={surveyStyle.attachItemMeta}>
                        {reservationConfig.slotMode === "time"
                          ? "시간 모드"
                          : "라벨 모드"}
                        {" · "}정원 {reservationConfig.defaultCapacity}명
                        {reservationConfig.requireApproval
                          ? " · 승인 필요"
                          : " · 즉시 확정"}
                      </span>
                    </div>
                    <div className={surveyStyle.attachItemActions}>
                      <button
                        type="button"
                        className={surveyStyle.attachItemBtn}
                        onClick={() => setShowReservationConfigPopup(true)}
                      >
                        편집
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    className={surveyStyle.attachItemClose}
                    onClick={() => {
                      if (
                        isEditMode &&
                        !window.confirm(
                          "예약 설정을 제거하면 관련 슬롯과 예약이 모두 삭제됩니다. 계속하시겠습니까?"
                        )
                      ) {
                        return;
                      }
                      setReservationConfig(null);
                    }}
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 아이콘 카드 그리드 (Google Classroom 스타일) */}
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
            {/* Alt Board에서는 설문/예약 첨부 숨김 (자체 양식 시스템 사용) */}
            {board?.boardMode !== "alt" && (
              <>
                <div className={surveyStyle.attachCardWrapper} ref={surveyMenuRef}>
                  <button
                    type="button"
                    className={surveyStyle.attachCard}
                    onClick={() => setShowSurveyMenu((prev) => !prev)}
                  >
                    <Svg type="postAdd" width="24px" height="24px" />
                    <span>설문</span>
                  </button>
                  {showSurveyMenu && (
                    <div className={surveyStyle.attachCardMenu}>
                      <button
                        type="button"
                        className={surveyStyle.attachCardMenuItem}
                        onClick={() => {
                          setShowSurveyMenu(false);
                          const newSurvey: TSurvey = {
                            title: "",
                            description: "",
                            questions: [],
                            settings: {
                              isAnonymous: false,
                              showResults: "afterResponse",
                              deadline: null,
                              allowModify: false,
                            },
                            responseCount: 0,
                          };
                          setSurveys((prev) => [...prev, newSurvey]);
                          setEditingSurveyIndex(surveys.length);
                          setShowSurveyBuilderPopup(true);
                        }}
                      >
                        새로 만들기
                      </button>
                      <button
                        type="button"
                        className={surveyStyle.attachCardMenuItem}
                        onClick={() => {
                          setShowSurveyMenu(false);
                          setShowSurveyImportPopup(true);
                        }}
                      >
                        가져오기
                      </button>
                    </div>
                  )}
                </div>
                {!reservationConfig && (
                  <div
                    className={surveyStyle.attachCardWrapper}
                    ref={reservationMenuRef}
                  >
                    <button
                      type="button"
                      className={surveyStyle.attachCard}
                      onClick={() => setShowReservationMenu((prev) => !prev)}
                    >
                      <Svg type="eventCalendar" width="24px" height="24px" />
                      <span>예약</span>
                    </button>
                    {showReservationMenu && (
                      <div className={surveyStyle.attachCardMenu}>
                        <button
                          type="button"
                          className={surveyStyle.attachCardMenuItem}
                          onClick={() => {
                            setShowReservationMenu(false);
                            setShowReservationConfigPopup(true);
                          }}
                        >
                          새로 만들기
                        </button>
                        <button
                          type="button"
                          className={surveyStyle.attachCardMenuItem}
                          onClick={() => {
                            setShowReservationMenu(false);
                            setShowReservationImportPopup(true);
                          }}
                        >
                          가져오기
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
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

      {showSurveyBuilderPopup && editingSurveyIndex !== null && (
        <SurveyBuilderPopup
          setState={(open) => {
            setShowSurveyBuilderPopup(open);
            if (!open) setEditingSurveyIndex(null);
          }}
          survey={surveys[editingSurveyIndex] ?? null}
          onChange={(updated) => {
            if (updated && editingSurveyIndex !== null) {
              setSurveys((prev) =>
                prev.map((s, i) => (i === editingSurveyIndex ? updated : s))
              );
            }
          }}
          postId={postId}
        />
      )}
      {showSurveyImportPopup && (
        <SurveyImportPopup
          setState={setShowSurveyImportPopup}
          onImport={(imported) => {
            setSurveys((prev) => [...prev, imported]);
          }}
        />
      )}
      {showReservationConfigPopup && (
        <ReservationConfigPopup
          setState={setShowReservationConfigPopup}
          config={reservationConfig}
          onChange={(config) => setReservationConfig(config)}
          isEditMode={isEditMode}
        />
      )}
      {showReservationImportPopup && (
        <ReservationImportPopup
          setState={setShowReservationImportPopup}
          onImport={(config) => setReservationConfig(config)}
        />
      )}
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
    </>
  );
};

export default PostCreate;
