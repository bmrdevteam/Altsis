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
import { TPostType, TSlotMode, TApplicationFormField } from "types/reservation";
import { TSurvey } from "types/survey";
import SurveyBuilderPopup from "./survey/SurveyBuilderPopup";
import surveyStyle from "./survey/survey.module.scss";
import resStyle from "./reservation/reservation.module.scss";

const PostCreate = () => {
  const navigate = useAppNavigate();
  const { boardId, postId } = useParams<{
    boardId: string;
    postId?: string;
  }>();
  const { currentUser, currentSchool } = useAuth();
  const { BoardAPI, PostAPI, UserAPI } = useAPIv2();

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
  const [survey, setSurvey] = useState<TSurvey | null>(null);
  const [showSurveyBuilderPopup, setShowSurveyBuilderPopup] = useState(false);

  // 게시글 유형 (일반/예약)
  const [postType, setPostType] = useState<TPostType>("general");
  const [reservationConfig, setReservationConfig] = useState<{
    resource: string;
    resourceDescription: string;
    slotMode: TSlotMode;
    defaultCapacity: number;
    requireApproval: boolean;
    maxReservationsPerUser: number;
    reservationOpenAt: string;
    reservationCloseAt: string;
    applicationForm: TApplicationFormField[];
  }>({
    resource: "",
    resourceDescription: "",
    slotMode: "time",
    defaultCapacity: 1,
    requireApproval: true,
    maxReservationsPerUser: 0,
    reservationOpenAt: "",
    reservationCloseAt: "",
    applicationForm: [],
  });

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

  // postType이 "survey"로 변경되면 설문 자동 초기화
  useEffect(() => {
    if (postType === "survey" && !survey) {
      setSurvey({
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
      });
    }
  }, [postType]);

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
                groups: {
                  manager: loadedBoard.members?.groups?.manager ?? true,
                  teacher: loadedBoard.members?.groups?.teacher ?? true,
                  student: loadedBoard.members?.groups?.student ?? true,
                },
                users: [],
              });
            }
            // 설문 데이터 로드
            if (post.survey) {
              setSurvey(post.survey);
            }
            // 설문 게시글 데이터 로드
            if (post.postType === "survey") {
              setPostType("survey");
            }
            // 예약 데이터 로드
            if (post.postType === "reservation") {
              setPostType("reservation");
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
                  applicationForm:
                    post.reservationConfig.applicationForm || [],
                });
              }
            }
          } else {
            // 신규 작성: 보드 멤버 그룹으로 기본값
            setPermissionRead({
              groups: {
                manager: loadedBoard.members?.groups?.manager ?? true,
                teacher: loadedBoard.members?.groups?.teacher ?? true,
                student: loadedBoard.members?.groups?.student ?? true,
              },
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
    if (
      useSpecificPermission &&
      !permissionRead.groups.manager &&
      !permissionRead.groups.teacher &&
      !permissionRead.groups.student &&
      permissionRead.users.length === 0
    ) {
      alert("읽기 권한 대상을 한 명 이상 선택해주세요.");
      return;
    }

    // 예약 게시글 유효성 검증
    if (postType === "reservation" && !reservationConfig.resource.trim()) {
      alert("예약 대상(자원)을 입력해주세요.");
      return;
    }

    // 설문 게시글 유효성 검증
    if (postType === "survey") {
      if (!survey || survey.questions.length === 0) {
        alert("설문 게시글은 최소 1개의 질문이 필요합니다.");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const postPermissionRead = useSpecificPermission ? permissionRead : undefined;

      // 예약 설정 데이터 구성
      const resConfig =
        postType === "reservation"
          ? {
              resource: reservationConfig.resource.trim(),
              resourceDescription:
                reservationConfig.resourceDescription.trim(),
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
            survey,
            ...(postType === "reservation" && {
              reservationConfig: resConfig,
            }),
          },
        });
        alert("수정되었습니다.");
        navigate(`/boards/${boardId}/post/${postId}`);
      } else {
        const { post } = await PostAPI.CPost({
          data: {
            board: boardId!,
            title: title.trim(),
            content: content.trim(),
            attachments,
            permissionRead: postPermissionRead,
            survey,
            postType,
            ...(postType === "reservation" && {
              reservationConfig: resConfig,
            }),
          },
        });
        alert("작성되었습니다.");
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

        <div style={{ marginBottom: "16px" }}>
          <Input
            label="제목"
            placeholder="제목을 입력하세요"
            value={title}
            onChange={(e: any) => setTitle(e.target.value)}
          />
        </div>

        {/* 게시글 유형 선택 (신규 작성 시만) */}
        {!isEditMode && (
          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "block",
                fontSize: "14px",
                fontWeight: 500,
                marginBottom: "8px",
              }}
            >
              게시글 유형
            </label>
            <div className={resStyle.postTypeSelector}>
              <button
                className={`${resStyle.postTypeOption} ${
                  postType === "general" ? resStyle.postTypeActive : ""
                }`}
                onClick={() => setPostType("general")}
              >
                일반
              </button>
              <button
                className={`${resStyle.postTypeOption} ${
                  postType === "reservation" ? resStyle.postTypeActive : ""
                }`}
                onClick={() => setPostType("reservation")}
              >
                예약
              </button>
              <button
                className={`${resStyle.postTypeOption} ${
                  postType === "survey" ? resStyle.postTypeActive : ""
                }`}
                onClick={() => setPostType("survey")}
              >
                설문
              </button>
            </div>
          </div>
        )}

        {/* 예약 설정 */}
        {postType === "reservation" && (
          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "block",
                fontSize: "14px",
                fontWeight: 500,
                marginBottom: "8px",
              }}
            >
              예약 설정
            </label>
            <div className={resStyle.configSection}>
              <div className={resStyle.configRow}>
                <label>예약 대상 *</label>
                <input
                  className={resStyle.configInput}
                  placeholder="예: 상담실, 회의실, 음악실"
                  value={reservationConfig.resource}
                  onChange={(e) =>
                    setReservationConfig((prev) => ({
                      ...prev,
                      resource: e.target.value,
                    }))
                  }
                />
              </div>

              <div className={resStyle.configRow}>
                <label>설명</label>
                <input
                  className={resStyle.configInput}
                  placeholder="예약 대상에 대한 설명 (선택)"
                  value={reservationConfig.resourceDescription}
                  onChange={(e) =>
                    setReservationConfig((prev) => ({
                      ...prev,
                      resourceDescription: e.target.value,
                    }))
                  }
                />
              </div>

              <div className={resStyle.configRow}>
                <label>슬롯 모드</label>
                <select
                  className={resStyle.configSelect}
                  value={reservationConfig.slotMode}
                  onChange={(e) =>
                    setReservationConfig((prev) => ({
                      ...prev,
                      slotMode: e.target.value as TSlotMode,
                    }))
                  }
                  disabled={isEditMode}
                >
                  <option value="time">시간 (09:00~10:00)</option>
                  <option value="label">라벨 (1교시, 2교시 등)</option>
                </select>
              </div>

              <div className={resStyle.configRow}>
                <label>기본 정원</label>
                <input
                  type="number"
                  className={resStyle.configNumberInput}
                  min={1}
                  value={reservationConfig.defaultCapacity}
                  onChange={(e) =>
                    setReservationConfig((prev) => ({
                      ...prev,
                      defaultCapacity: parseInt(e.target.value) || 1,
                    }))
                  }
                />
              </div>

              <div className={resStyle.configToggleRow}>
                <label style={{ fontSize: "13px", fontWeight: 500 }}>
                  승인 필요
                </label>
                <ToggleSwitch
                  defaultChecked={reservationConfig.requireApproval}
                  onChange={(checked: boolean) =>
                    setReservationConfig((prev) => ({
                      ...prev,
                      requireApproval: checked,
                    }))
                  }
                />
              </div>
              <p className={resStyle.configHint}>
                {reservationConfig.requireApproval
                  ? "관리자 승인 후 예약이 확정됩니다."
                  : "신청 즉시 예약이 확정됩니다."}
              </p>

              <div className={resStyle.configRow}>
                <label>최대 예약</label>
                <input
                  type="number"
                  className={resStyle.configNumberInput}
                  min={0}
                  value={reservationConfig.maxReservationsPerUser}
                  onChange={(e) =>
                    setReservationConfig((prev) => ({
                      ...prev,
                      maxReservationsPerUser: parseInt(e.target.value) || 0,
                    }))
                  }
                />
                <span
                  style={{ fontSize: "12px", color: "var(--text-color-2)" }}
                >
                  0 = 무제한
                </span>
              </div>

              <div className={resStyle.configRow}>
                <label>예약 기간</label>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    flex: 1,
                  }}
                >
                  <input
                    type="datetime-local"
                    className={resStyle.configDateInput}
                    value={reservationConfig.reservationOpenAt}
                    onChange={(e) =>
                      setReservationConfig((prev) => ({
                        ...prev,
                        reservationOpenAt: e.target.value,
                      }))
                    }
                  />
                  <span style={{ color: "var(--text-color-2)" }}>~</span>
                  <input
                    type="datetime-local"
                    className={resStyle.configDateInput}
                    value={reservationConfig.reservationCloseAt}
                    onChange={(e) =>
                      setReservationConfig((prev) => ({
                        ...prev,
                        reservationCloseAt: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <p className={resStyle.configHint}>
                비워두면 기간 제한 없이 예약 가능합니다.
              </p>
            </div>
          </div>
        )}

        {/* 읽기 권한 설정 */}
        <div style={{ marginBottom: "16px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "8px",
            }}
          >
            <label
              style={{
                fontSize: "14px",
                fontWeight: 500,
              }}
            >
              읽기 권한 지정
            </label>
            <ToggleSwitch
              defaultChecked={useSpecificPermission}
              onChange={(checked: boolean) => {
                setUseSpecificPermission(checked);
                if (!checked) {
                  // 해제 시 보드 멤버 전체로 초기화
                  setPermissionRead({
                    groups: {
                      manager: board?.members?.groups?.manager ?? true,
                      teacher: board?.members?.groups?.teacher ?? true,
                      student: board?.members?.groups?.student ?? true,
                    },
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
              {/* 역할 그룹 토글 (보드 멤버에서 활성화된 그룹만 표시) */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                {board.members?.groups?.manager && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ fontSize: "14px" }}>관리자</span>
                    <ToggleSwitch
                      defaultChecked={permissionRead.groups.manager}
                      onChange={(checked: boolean) =>
                        setPermissionRead((prev) => ({
                          ...prev,
                          groups: { ...prev.groups, manager: checked },
                        }))
                      }
                    />
                  </div>
                )}
                {board.members?.groups?.teacher && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ fontSize: "14px" }}>교사</span>
                    <ToggleSwitch
                      defaultChecked={permissionRead.groups.teacher}
                      onChange={(checked: boolean) =>
                        setPermissionRead((prev) => ({
                          ...prev,
                          groups: { ...prev.groups, teacher: checked },
                        }))
                      }
                    />
                  </div>
                )}
                {board.members?.groups?.student && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ fontSize: "14px" }}>학생</span>
                    <ToggleSwitch
                      defaultChecked={permissionRead.groups.student}
                      onChange={(checked: boolean) =>
                        setPermissionRead((prev) => ({
                          ...prev,
                          groups: { ...prev.groups, student: checked },
                        }))
                      }
                    />
                  </div>
                )}
              </div>

              {/* 개별 사용자 선택 */}
              <div style={{ marginTop: "12px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: 500,
                    marginBottom: "6px",
                  }}
                >
                  개별 사용자 지정
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
          />
        </div>

        {/* 첨부파일 */}
        <div style={{ marginBottom: "24px" }}>
          <label
            style={{
              display: "block",
              marginBottom: "8px",
              fontSize: "14px",
              fontWeight: 500,
            }}
          >
            첨부파일
          </label>

          {/* 첨부 목록 */}
          {attachments.length > 0 && (
            <div
              style={{
                marginBottom: "12px",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
              }}
            >
              {attachments.map((file) => {
                const isImage = file.mimeType?.startsWith("image/");
                return (
                  <div
                    key={file.key}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      backgroundColor: "var(--background-color-2)",
                      fontSize: "13px",
                    }}
                  >
                    {isImage && previewUrls[file.key!] ? (
                      <img
                        src={previewUrls[file.key!]}
                        alt={file.fileName}
                        style={{
                          width: "40px",
                          height: "40px",
                          objectFit: "cover",
                          borderRadius: "4px",
                          flexShrink: 0,
                        }}
                      />
                    ) : (
                      <Svg
                        type="paperclip"
                        width="16px"
                        height="16px"
                        style={{ flexShrink: 0 }}
                      />
                    )}
                    <span
                      style={{
                        flex: 1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {file.fileName}
                    </span>
                    <span
                      style={{
                        fontSize: "12px",
                        color: "var(--text-color-2)",
                        flexShrink: 0,
                      }}
                    >
                      {formatFileSize(file.fileSize)}
                    </span>
                    <button
                      onClick={() => handleRemoveAttachment(file.key!)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--text-color-2)",
                        fontSize: "18px",
                        padding: "0 4px",
                        lineHeight: 1,
                        flexShrink: 0,
                      }}
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* 업로드 영역 */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            style={{ display: "none" }}
            onChange={(e) => handleFileSelect(e.target.files)}
          />
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !isUploading && fileInputRef.current?.click()}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              padding: "20px",
              border: `2px dashed ${
                isDragging ? "var(--accent-1)" : "var(--border-color)"
              }`,
              borderRadius: "8px",
              cursor: isUploading ? "default" : "pointer",
              backgroundColor: isDragging
                ? "var(--background-hover-color)"
                : "transparent",
              transition: "all 0.2s",
            }}
          >
            <Svg type="upload" width="24px" height="24px" />
            <span style={{ fontSize: "13px", color: "var(--text-color-2)" }}>
              {isUploading
                ? "업로드 중..."
                : "파일을 드래그하거나 클릭하여 첨부"}
            </span>
            <span style={{ fontSize: "11px", color: "var(--text-color-2)" }}>
              최대 20MB
            </span>
          </div>
        </div>

        {/* 설문 설정 */}
        <div style={{ marginBottom: "24px" }}>
          {/* 일반/예약 게시글일 때만 토글 표시 (설문 게시글은 설문 필수) */}
          {postType !== "survey" && (
            <div className={surveyStyle.surveyToggle}>
              <ToggleSwitch
                checked={!!survey}
                onChange={(checked: boolean) => {
                  if (checked) {
                    setSurvey({
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
                    });
                  } else {
                    setSurvey(null);
                  }
                }}
              />
              <span className={surveyStyle.surveyToggleLabel}>설문 추가</span>
            </div>
          )}

          {postType === "survey" && (
            <label
              style={{
                display: "block",
                fontSize: "14px",
                fontWeight: 500,
                marginBottom: "8px",
              }}
            >
              설문 설정 (필수)
            </label>
          )}

          {survey && (
            <div className={surveyStyle.surveyBuilderCard}>
              <div className={surveyStyle.surveyBuilderInfo}>
                <span>
                  {survey.title
                    ? `${survey.title} · ${survey.questions.length}개 질문`
                    : survey.questions.length > 0
                    ? `${survey.questions.length}개 질문 구성됨`
                    : "질문을 추가해주세요"}
                </span>
                {survey.settings.isAnonymous && (
                  <span className={surveyStyle.anonymousBadge}>익명</span>
                )}
                {survey.settings.deadline && (
                  <span className={surveyStyle.deadlineText}>
                    마감:{" "}
                    {new Date(survey.settings.deadline).toLocaleDateString(
                      "ko-KR"
                    )}
                  </span>
                )}
              </div>
              <Button
                type="ghost"
                onClick={() => setShowSurveyBuilderPopup(true)}
              >
                설문 편집
              </Button>
            </div>
          )}
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

      {showSurveyBuilderPopup && (
        <SurveyBuilderPopup
          setState={setShowSurveyBuilderPopup}
          survey={survey}
          onChange={setSurvey}
          postId={postId}
        />
      )}
    </>
  );
};

export default PostCreate;
