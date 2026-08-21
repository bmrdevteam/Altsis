/**
 * 검색된 안내 문서 → 화면/안내 바로가기 (모델이 URL을 만들지 않음)
 */

/** 안내 문서 키 → /guide?doc= 경로 */
export const guideDocPath = (key) => {
  let p = String(key || "").replace(/\.md$/i, "");
  if (!p || p === "INDEX" || p === "README") return "/guide";
  if (p.endsWith("/README")) p = p.slice(0, -"/README".length);
  if (!p) return "/guide";
  return `/guide?doc=${encodeURIComponent(p)}`;
};

export const isSafeAppPath = (path) => {
  const p = String(path || "");
  if (!p.startsWith("/") || p.startsWith("//")) return false;
  if (p.includes("://") || p.includes("\\") || p.includes("\0")) return false;
  return p.length <= 200;
};

/**
 * @typedef {{ pagePath?: string, pageTitle?: string, guideTitle: string }} GuideLinkSpec
 */

/** @type {Record<string, GuideLinkSpec>} */
export const GUIDE_LINK_MAP = {
  "INDEX.md": { guideTitle: "안내 목차" },
  "user-guide/README.md": { guideTitle: "안내: 사용자 가이드" },
  "user-guide/docs.md": {
    pagePath: "/docs",
    pageTitle: "문서",
    guideTitle: "안내: 문서",
  },
  "user-guide/boards.md": {
    pagePath: "/boards",
    pageTitle: "보드",
    guideTitle: "안내: 보드",
  },
  "user-guide/archive.md": {
    pagePath: "/archive",
    pageTitle: "기록",
    guideTitle: "안내: 기록",
  },
  "user-guide/evaluation.md": {
    pagePath: "/courses",
    pageTitle: "수업",
    guideTitle: "안내: 평가",
  },
  "user-guide/calendar.md": {
    pagePath: "/",
    pageTitle: "일정",
    guideTitle: "안내: 일정",
  },
  "user-guide/goals.md": {
    pagePath: "/goals",
    pageTitle: "목표",
    guideTitle: "안내: 목표",
  },
  "user-guide/courses.md": {
    pagePath: "/courses",
    pageTitle: "수업",
    guideTitle: "안내: 수업",
  },
  "user-guide/chat.md": { guideTitle: "안내: 채팅" },
  "user-guide/notifications.md": { guideTitle: "안내: 알림" },
  "user-guide/settings.md": {
    pagePath: "/settings",
    pageTitle: "설정",
    guideTitle: "안내: 설정",
  },
  "admin-guide/README.md": { guideTitle: "안내: 관리자 가이드" },
  "admin-guide/form-management.md": {
    pagePath: "/forms",
    pageTitle: "양식",
    guideTitle: "안내: 양식 관리",
  },
  "admin-guide/school-management.md": {
    pagePath: "/admin/schools/list",
    pageTitle: "학교 관리",
    guideTitle: "안내: 학교 관리",
  },
  "admin-guide/user-management.md": {
    pagePath: "/admin/users",
    pageTitle: "사용자",
    guideTitle: "안내: 사용자 관리",
  },
  "admin-guide/academy-management.md": {
    pagePath: "/admin/schools/list",
    pageTitle: "아카데미 관리",
    guideTitle: "안내: 아카데미",
  },
  "admin-guide/season-management.md": {
    pagePath: "/admin/schools/list",
    pageTitle: "학기 관리",
    guideTitle: "안내: 학기",
  },
  "admin-guide/permission-settings.md": {
    pagePath: "/admin/schools/list",
    pageTitle: "권한 설정",
    guideTitle: "안내: 권한",
  },
  "getting-started/README.md": { guideTitle: "안내: 시작하기" },
  "getting-started/requirements.md": { guideTitle: "안내: 요구사항" },
  "getting-started/installation.md": { guideTitle: "안내: 설치" },
  "getting-started/initial-setup.md": { guideTitle: "안내: 초기 설정" },
  "getting-started/quick-start.md": { guideTitle: "안내: 빠른 시작" },
};

const MAX_LINKS = 4;

const canSeePage = (pagePath, { user, school, registration } = {}) => {
  const auth = user?.auth;
  const role = registration?.role;
  const hasReg = !!registration;
  if (auth === "owner") return false;

  if (pagePath === "/docs" || pagePath.startsWith("/courses")) {
    if (!hasReg) return false;
  }
  if (pagePath === "/archive" || pagePath === "/myArchive") {
    if (!hasReg) return false;
  }
  if (pagePath === "/boards") {
    if (
      school?.boardEnabled === false ||
      school?.academyFeatures?.boardEnabled === false
    ) {
      return false;
    }
  }
  if (pagePath === "/goals") {
    if (school?.goalsEnabled === false) {
      return auth === "admin" || auth === "manager";
    }
  }
  if (pagePath === "/courses/design") {
    if (role === "student") return false;
    if (auth !== "admin" && auth !== "manager" && !registration?.permissionSyllabusV2) {
      return false;
    }
  }
  if (
    pagePath === "/forms" ||
    pagePath.startsWith("/admin/")
  ) {
    if (auth !== "admin" && auth !== "manager") return false;
  }
  return true;
};

const pagePathForKey = (key, message) => {
  const spec = GUIDE_LINK_MAP[key];
  if (!spec?.pagePath) return null;
  if (
    key === "user-guide/courses.md" &&
    /(개설|강의계획서)/.test(String(message || ""))
  ) {
    return "/courses/design";
  }
  if (key === "user-guide/archive.md") {
    return null;
  }
  return spec.pagePath;
};

const archivePagePath = (registration) =>
  registration?.role === "student" ? "/myArchive" : "/archive";

/**
 * @param {Array<{ key?: string }>} hits
 * @param {{ user?: object, school?: object, registration?: object, message?: string }} [ctx]
 * @returns {Array<{ kind: "page"|"guide", title: string, path: string }>}
 */
export const buildAlterGuideLinks = (hits, ctx = {}) => {
  const keys = [];
  for (const hit of Array.isArray(hits) ? hits : []) {
    const key = String(hit?.key || "");
    if (!key || keys.includes(key)) continue;
    keys.push(key);
  }

  const { user, school, registration, message } = ctx;
  const out = [];
  const seen = new Set();

  const push = (kind, title, path) => {
    if (!isSafeAppPath(path)) return;
    const id = `${kind}:${path}`;
    if (seen.has(id)) return;
    seen.add(id);
    out.push({
      kind,
      title: String(title || "").slice(0, 40),
      path,
    });
  };

  for (const key of keys) {
    if (out.length >= MAX_LINKS) break;
    const spec = GUIDE_LINK_MAP[key] || {
      guideTitle: "안내",
    };
    let pagePath = pagePathForKey(key, message);
    let pageTitle = spec.pageTitle;
    if (key === "user-guide/archive.md") {
      pagePath = archivePagePath(registration);
      pageTitle = "기록";
    }
    if (pagePath === "/courses/design") pageTitle = "수업 개설";
    if (pagePath === "/goals" && school?.goalsEnabled === false) {
      const schoolId = school?._id ? String(school._id) : "";
      if (schoolId && (user?.auth === "admin" || user?.auth === "manager")) {
        pagePath = `/admin/schools/${schoolId}#목표`;
        pageTitle = "목표 설정";
      }
    }
    if (pagePath && canSeePage(pagePath, ctx)) {
      push("page", pageTitle || "화면", pagePath);
    }
    push("guide", spec.guideTitle || "안내", guideDocPath(key));
  }

  return out.slice(0, MAX_LINKS);
};

/**
 * 저장·응답용 링크 정규화
 * @param {unknown} links
 */
export const normalizeAlterGuideLinks = (links) => {
  const rows = Array.isArray(links) ? links : [];
  const out = [];
  const seen = new Set();
  for (const row of rows) {
    const kind = row?.kind === "page" || row?.kind === "guide" ? row.kind : "";
    const title = String(row?.title || "").trim().slice(0, 40);
    const path = String(row?.path || "").trim();
    if (!kind || !title || !isSafeAppPath(path)) continue;
    const id = `${kind}:${path}`;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ kind, title, path });
    if (out.length >= MAX_LINKS) break;
  }
  return out;
};
