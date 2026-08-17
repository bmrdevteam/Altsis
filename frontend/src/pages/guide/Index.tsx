import { MouseEvent, useLayoutEffect, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { MarkdownViewer } from "components/markdown";
import { useAuth } from "contexts/authContext";
import { GUIDE_DOCS } from "./guideDocs.generated";
import {
  allowedGuideSet,
  defaultGuidePath,
  docKeyFromSearch,
  guideBaseFromPathname,
  guideHref,
  isGuideInternalHref,
  parseGuideToc,
  queryByHashId,
  rewriteGuideMarkdownLinks,
} from "./guidePath";
import style from "./guide.module.scss";

const ALLOWED = allowedGuideSet(GUIDE_DOCS);

const Guide = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const bodyRef = useRef<HTMLDivElement>(null);
  const { currentUser } = useAuth();

  const guideBase = guideBaseFromPathname(location.pathname);
  const fallbackKey = defaultGuidePath(currentUser?.auth);
  const queried = docKeyFromSearch(location.search, ALLOWED);
  const requestedKey = queried.present ? queried.key : fallbackKey;
  const docKey =
    requestedKey && GUIDE_DOCS[requestedKey] ? requestedKey : null;

  const toc = useMemo(
    () => parseGuideToc(GUIDE_DOCS["INDEX.md"] || "", ALLOWED),
    []
  );

  const markdown = useMemo(() => {
    if (!docKey) return "";
    return rewriteGuideMarkdownLinks(
      GUIDE_DOCS[docKey],
      docKey,
      ALLOWED,
      guideBase
    );
  }, [docKey, guideBase]);

  const goTo = (key: string) => {
    navigate(guideHref(guideBase, key));
  };

  useLayoutEffect(() => {
    const root = bodyRef.current;
    if (!root) return;
    const target = queryByHashId(root, location.hash);
    if (target) {
      target.scrollIntoView({ block: "start" });
      return;
    }
    if (!location.hash) root.scrollTop = 0;
  }, [location.hash, markdown]);

  const onBodyClick = (event: MouseEvent<HTMLDivElement>) => {
    const anchor = (event.target as HTMLElement).closest("a");
    if (!anchor) return;
    const href = anchor.getAttribute("href") || "";
    if (href.startsWith("#")) {
      event.preventDefault();
      navigate(`${location.pathname}${location.search}${href}`);
      return;
    }
    if (!isGuideInternalHref(href, guideBase)) return;
    event.preventDefault();
    try {
      const url = new URL(href, window.location.origin);
      navigate(`${url.pathname}${url.search}${url.hash || ""}`);
    } catch {
      navigate(href);
    }
  };

  return (
    <div
      className={`${style.guide_page} ${
        currentUser ? "" : style.guide_page_full
      }`}
    >
      <nav className={style.toc} aria-label="Altsis 안내 목차">
        <span className={style.toc_title}>Altsis 안내</span>
        <button
          type="button"
          className={`${style.toc_home} ${
            docKey === "INDEX.md" ? style.toc_home_active : ""
          }`}
          onClick={() => goTo("INDEX.md")}
        >
          전체 목차
        </button>
        {toc.map((section) => (
          <div key={section.key} className={style.toc_section}>
            <button
              type="button"
              className={`${style.toc_section_btn} ${
                docKey === section.key ? style.toc_active : ""
              }`}
              onClick={() => goTo(section.key)}
            >
              {section.title}
            </button>
            {section.items.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`${style.toc_item} ${
                  docKey === item.key ? style.toc_active : ""
                }`}
                onClick={() => goTo(item.key)}
              >
                {item.title}
              </button>
            ))}
          </div>
        ))}
      </nav>
      <div ref={bodyRef} className={style.body} onClick={onBodyClick}>
        {docKey ? (
          <MarkdownViewer content={markdown} />
        ) : (
          <div className={style.missing}>
            <p>문서를 찾을 수 없습니다.</p>
            <button
              type="button"
              className={style.missing_btn}
              onClick={() => goTo(fallbackKey)}
            >
              안내 처음으로
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Guide;
