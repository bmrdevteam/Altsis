import { useEffect, useState } from "react";
import { useAuth } from "contexts/authContext";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import { useAppNavigate } from "hooks/useAppNavigate";
import Popup from "components/popup/Popup";
import Button from "components/button/Button";
import Input from "components/input/Input";
import Select from "components/select/Select";
import Svg from "assets/svg/Svg";
import mergeStyle from "components/mergeFilter/mergeFilter.module.scss";
import { TBoard } from "types/board";
import { TSyllabus } from "types/syllabuses";
import { TSeason } from "types/seasons";
import _ from "lodash";

type Step = "name" | "done" | "link";

type Props = {
  sourceBoard: TBoard;
  setState: (open: boolean) => void;
  onSuccess?: (board: TBoard) => void;
};

/** 선택한 시즌의 보드 없는 담당/개설 수업 목록 */
export const useLinkableSyllabuses = (
  enabled: boolean,
  seasonId: string | undefined
) => {
  const { currentUser } = useAuth();
  const { SyllabusAPI } = useAPIv2();
  const [items, setItems] = useState<TSyllabus[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !seasonId || !currentUser?._id) {
      setItems([]);
      return;
    }
    setLoading(true);
    const load = async () => {
      try {
        // 관리자여도 본인이 개설·지도교사인 수업만 (전체 학교 수업 연결 방지)
        const [created, mentoring] = await Promise.all([
          SyllabusAPI.RSyllabuses({
            query: { season: seasonId, user: currentUser._id },
          }),
          SyllabusAPI.RSyllabuses({
            query: { season: seasonId, teacher: currentUser._id },
          }),
        ]);
        const list = _.uniqBy(
          [...(created.syllabuses || []), ...(mentoring.syllabuses || [])],
          "_id"
        );
        const linkable = list.filter((s) => !s.altBoard);
        setItems(_.sortBy(linkable, ["classTitle"]));
      } catch (err) {
        ALERT_ERROR(err);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [enabled, seasonId, currentUser?._id]);

  return { items, loading };
};

type LinkPickerProps = {
  boardId: string;
  onLinked: (board: TBoard, syllabus: TSyllabus) => void;
  onCancel: () => void;
};

export const BoardLinkSyllabusPicker = ({
  boardId,
  onLinked,
  onCancel,
}: LinkPickerProps) => {
  const { currentSchool, currentRegistration, currentSeason } = useAuth();
  const { SyllabusAPI, SeasonAPI } = useAPIv2();
  const defaultSeasonId =
    currentRegistration?.season || currentSeason?._id || "";
  const [seasons, setSeasons] = useState<TSeason[]>([]);
  const [seasonId, setSeasonId] = useState(defaultSeasonId);
  const { items, loading } = useLinkableSyllabuses(true, seasonId || undefined);
  const [selectedId, setSelectedId] = useState<string>("");
  const [keyword, setKeyword] = useState("");
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    if (!currentSchool?.school) return;
    SeasonAPI.RSeasons({ query: { school: currentSchool.school } })
      .then(({ seasons: list }) => {
        setSeasons(list || []);
        if (!seasonId && list?.[0]?._id) {
          setSeasonId(list[0]._id);
        }
      })
      .catch(ALERT_ERROR);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load seasons once per school
  }, [currentSchool?.school]);

  useEffect(() => {
    setSelectedId("");
    setKeyword("");
  }, [seasonId]);

  const seasonOptions = seasons.map((s) => ({
    text: `${s.year} ${s.term}`,
    value: s._id,
  }));

  const filteredItems = (() => {
    const kw = keyword.trim().toLowerCase();
    if (!kw) return items;
    return items.filter((s) => {
      const title = (s.classTitle || "").toLowerCase();
      const teacher = (s.userName || "").toLowerCase();
      const subject = (s.subject || []).join(" ").toLowerCase();
      return (
        title.includes(kw) || teacher.includes(kw) || subject.includes(kw)
      );
    });
  })();

  useEffect(() => {
    if (selectedId && !filteredItems.some((s) => s._id === selectedId)) {
      setSelectedId("");
    }
  }, [keyword, items, selectedId, filteredItems]);

  const handleLink = async () => {
    if (!selectedId) {
      alert("연결할 수업을 목록에서 선택한 뒤, 연결을 눌러주세요.");
      return;
    }
    if (!boardId) {
      alert("연결할 보드 정보가 없습니다. 팝업을 닫고 다시 시도해주세요.");
      return;
    }
    setLinking(true);
    try {
      const { board, syllabus } = await SyllabusAPI.LinkSyllabusAltBoard({
        params: { _id: selectedId },
        data: { board: boardId },
      });
      const syl =
        (syllabus as TSyllabus) || items.find((s) => s._id === selectedId)!;
      onLinked(board, syl);
    } catch (err) {
      ALERT_ERROR(err);
    } finally {
      setLinking(false);
    }
  };

  return (
    <div style={{ padding: "4px 0" }}>
      <p
        style={{
          fontSize: 13,
          color: "var(--text-color-2)",
          marginBottom: 12,
          lineHeight: 1.5,
        }}
      >
        보드가 없는 수업에 연결합니다. 내가 개설했거나 지도교사인 수업만
        보이며, 다른 쿼터도 선택할 수 있습니다. 연결 시 교사·수강생 멤버가
        맞춰집니다.
      </p>
      {seasonOptions.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <Select
            label="시즌(쿼터)"
            appearence="flat"
            options={seasonOptions}
            selectedValue={seasonId}
            onChange={(value: string) => setSeasonId(value)}
          />
        </div>
      )}
      {!loading && items.length > 0 && (
        <div className={mergeStyle.mergeSearchBar} style={{ marginBottom: 12 }}>
          <div className={mergeStyle.mergeSearchInputWrap}>
            <span className={mergeStyle.mergeSearchIcon}>
              <Svg type="search" width="18px" height="18px" />
            </span>
            <input
              className={mergeStyle.mergeSearchInput}
              type="search"
              placeholder="키워드 검색 (수업명, 교사, 교과)"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>
        </div>
      )}
      {loading ? (
        <div style={{ padding: 16, color: "var(--text-color-2)" }}>
          수업 목록 불러오는 중…
        </div>
      ) : items.length === 0 ? (
        <div style={{ padding: 16, color: "var(--text-color-2)" }}>
          선택한 시즌에 연결 가능한 수업이 없습니다. (개설·지도교사 수업이
          없거나 이미 보드가 있음)
        </div>
      ) : filteredItems.length === 0 ? (
        <div style={{ padding: 16, color: "var(--text-color-2)" }}>
          검색 조건에 맞는 수업이 없습니다.
        </div>
      ) : (
        <>
          {!selectedId && (
            <p
              style={{
                fontSize: 12,
                color: "var(--text-color-2)",
                marginBottom: 8,
              }}
            >
              목록에서 수업을 선택한 뒤 「연결」을 눌러주세요.
            </p>
          )}
          <div
            style={{
              maxHeight: 280,
              overflowY: "auto",
              border: "1px solid var(--border-color)",
              borderRadius: 8,
            }}
          >
            {filteredItems.map((s) => (
              <label
                key={s._id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  padding: "10px 12px",
                  cursor: "pointer",
                  borderBottom: "1px solid var(--border-color)",
                  background:
                    selectedId === s._id ? "var(--bg-color-2)" : "transparent",
                }}
              >
                <input
                  type="radio"
                  name="link-syllabus"
                  checked={selectedId === s._id}
                  onChange={() => setSelectedId(s._id)}
                  style={{ marginTop: 3 }}
                />
                <span>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>
                    {s.classTitle}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text-color-2)",
                      marginTop: 2,
                    }}
                  >
                    {s.year} {s.term}
                    {s.userName ? ` · ${s.userName}` : ""}
                  </div>
                </span>
              </label>
            ))}
          </div>
        </>
      )}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 8,
          marginTop: 16,
        }}
      >
        <Button type="ghost" onClick={onCancel} disabled={linking}>
          취소
        </Button>
        <Button
          type="ghost"
          onClick={handleLink}
          disabled={linking || filteredItems.length === 0}
        >
          {linking ? "연결 중..." : "연결"}
        </Button>
      </div>
    </div>
  );
};

/**
 * 보드 복제 → (선택) 수업 연결 플로우
 */
const BoardDuplicateFlow = ({ sourceBoard, setState, onSuccess }: Props) => {
  const { BoardAPI } = useAPIv2();
  const navigate = useAppNavigate();
  const [step, setStep] = useState<Step>("name");
  const [name, setName] = useState(`${sourceBoard.name} (복사)`);
  const [submitting, setSubmitting] = useState(false);
  const [cloned, setCloned] = useState<TBoard | null>(null);

  const handleDuplicate = async () => {
    if (!name.trim()) {
      alert("보드 이름을 입력해주세요.");
      return;
    }
    setSubmitting(true);
    try {
      const { board } = await BoardAPI.DuplicateBoard({
        params: { _id: sourceBoard._id },
        data: { name: name.trim() },
      });
      setCloned(board);
      setStep("done");
      // 연결 플로우가 끝날 때까지 onSuccess는 호출하지 않음 (중간 이탈/리다이렉트 방지)
    } catch (err) {
      ALERT_ERROR(err);
    } finally {
      setSubmitting(false);
    }
  };

  const finishWithoutLink = () => {
    if (cloned) onSuccess?.(cloned);
    setState(false);
  };

  if (step === "name") {
    return (
      <Popup
        title="보드 복제"
        setState={setState}
        closeBtn
        style={{ maxWidth: 440, width: "100%" }}
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button type="ghost" onClick={() => setState(false)} disabled={submitting}>
              취소
            </Button>
            <Button type="ghost" onClick={handleDuplicate} disabled={submitting}>
              {submitting ? "복제 중..." : "복제"}
            </Button>
          </div>
        }
      >
        <div style={{ padding: "4px 0" }}>
          <p
            style={{
              fontSize: 13,
              color: "var(--text-color-2)",
              marginBottom: 12,
              lineHeight: 1.5,
            }}
          >
            양식 구조와 문서만 복사합니다. 복제된 양식·문서는 비공개로
            저장됩니다. 응답·기록·채팅·수업 연결은 복사되지 않습니다.
          </p>
          <Input
            label="새 보드 이름"
            appearence="flat"
            defaultValue={name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setName(e.target.value)
            }
          />
        </div>
      </Popup>
    );
  }

  if (step === "done" && cloned) {
    return (
      <Popup
        title="복제 완료"
        setState={(open: boolean) => {
          if (!open) finishWithoutLink();
        }}
        closeBtn
        style={{ maxWidth: 440, width: "100%" }}
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button type="ghost" onClick={finishWithoutLink}>
              나중에
            </Button>
            <Button type="ghost" onClick={() => setStep("link")}>
              수업에 연결
            </Button>
          </div>
        }
      >
        <div style={{ padding: "8px 4px", lineHeight: 1.6 }}>
          <strong>{cloned.name}</strong> 보드가 만들어졌습니다.
          <br />
          <span style={{ fontSize: 13, color: "var(--text-color-2)" }}>
            지금 다른 쿼터 수업에도 연결할 수 있고, 나중에 보드 관리에서도
            연결할 수 있습니다.
          </span>
        </div>
      </Popup>
    );
  }

  if (step === "link" && cloned) {
    return (
      <Popup
        title="수업에 연결"
        setState={(open: boolean) => {
          if (!open) finishWithoutLink();
        }}
        closeBtn
        style={{ maxWidth: 480, width: "100%" }}
      >
        <BoardLinkSyllabusPicker
          boardId={cloned._id}
          onCancel={finishWithoutLink}
          onLinked={(board, syllabus) => {
            alert(`「${syllabus.classTitle}」 수업에 연결되었습니다.`);
            setState(false);
            // 수업 화면으로 이동 — 목록 새로고침용 onSuccess는 생략
            navigate(`/courses/mentoring/${syllabus._id}#활동`);
          }}
        />
      </Popup>
    );
  }

  return null;
};

export default BoardDuplicateFlow;
