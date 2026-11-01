import { useEffect, useId, useRef, useState } from "react";
import style from "./altBoard.module.scss";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";

type TReusableAltForm = {
  _id: string;
  title: string;
  description: string;
  boardId: string;
  boardName: string;
  isMine: boolean;
  isDraft: boolean;
};

type Props = {
  boardId: string;
  excludeFormId?: string;
  seasonId?: string;
  onReused: (formId: string) => void;
};

const FormReusePicker = ({
  boardId,
  excludeFormId,
  seasonId,
  onReused,
}: Props) => {
  const { AltFormAPI } = useAPIv2();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const requestSeq = useRef(0);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [truncated, setTruncated] = useState(false);
  const [results, setResults] = useState<TReusableAltForm[]>([]);
  const [selected, setSelected] = useState<TReusableAltForm | null>(null);
  const [reusing, setReusing] = useState(false);

  useEffect(() => {
    if (!open) return;
    const seq = ++requestSeq.current;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      setLoading(true);
      AltFormAPI.RReusableAltForms({
        query: {
          board: boardId,
          ...(query.trim() ? { q: query.trim() } : {}),
          ...(excludeFormId ? { exclude: excludeFormId } : {}),
        },
      })
        .then(({ forms, truncated: more }) => {
          if (cancelled || requestSeq.current !== seq) return;
          setResults(forms);
          setTruncated(more);
        })
        .catch((err) => {
          if (cancelled || requestSeq.current !== seq) return;
          setResults([]);
          setTruncated(false);
          ALERT_ERROR(err);
        })
        .finally(() => {
          if (!cancelled && requestSeq.current === seq) setLoading(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // AltFormAPI는 렌더마다 새 객체라 의존성에서 뺀다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, query, boardId, excludeFormId]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const reuseSelected = async () => {
    if (!selected || reusing) return;
    setReusing(true);
    try {
      const { form } = await AltFormAPI.CReuseAltForm({
        params: { _id: selected._id },
        data: {
          board: boardId,
          ...(seasonId ? { season: seasonId } : {}),
        },
      });
      onReused(form._id);
    } catch (err) {
      ALERT_ERROR(err);
    } finally {
      setReusing(false);
    }
  };

  const statusText = loading
    ? "검색 중"
    : results.length === 0
      ? "검색 결과가 없습니다."
      : truncated
        ? `양식 ${results.length}개. 더 구체적으로 검색해 주세요.`
        : `양식 ${results.length}개`;

  return (
    <div className={`${style.formReuse} ${style.noPrint}`} ref={rootRef}>
      <label className={style.formReuseLabel} htmlFor={`${listId}-input`}>
        양식 검색
      </label>
      <div className={style.formReuseField}>
        <input
          id={`${listId}-input`}
          className={style.textInput}
          type="search"
          placeholder="내 양식, 공유된 양식"
          value={query}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
          }}
        />
        {open && (
          <ul id={listId} className={style.formReuseList} role="listbox">
            {results.map((form) => {
              const meta = [
                form.isMine ? "내 양식" : "공유",
                form.isDraft ? "비공개" : "",
                form.boardName,
              ]
                .filter(Boolean)
                .join(" · ");
              return (
                <li key={form._id} role="presentation">
                  <button
                    type="button"
                    className={style.formReuseOption}
                    role="option"
                    aria-selected={selected?._id === form._id}
                    onClick={() => {
                      setSelected(form);
                      setOpen(false);
                    }}
                  >
                    <span className={style.formReuseTitle}>{form.title}</span>
                    <span className={style.formReuseMeta}>{meta}</span>
                  </button>
                </li>
              );
            })}
            <li className={style.formReuseStatus} role="status">
              {statusText}
            </li>
          </ul>
        )}
      </div>
      {selected && (
        <p className={style.formReuseMeta}>
          선택: {selected.title}
          {selected.boardName ? ` · ${selected.boardName}` : ""}
        </p>
      )}
      <button
        type="button"
        className={`${style.reviewReuseBtn} ${style.reviewReuseBtnPrimary} ${style.formReuseApply}`}
        disabled={!selected || reusing}
        onClick={reuseSelected}
      >
        {reusing ? "만드는 중..." : "이 양식으로 새로 작성"}
      </button>
    </div>
  );
};

export default FormReusePicker;
