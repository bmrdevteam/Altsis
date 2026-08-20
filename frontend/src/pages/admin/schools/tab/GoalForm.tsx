/**
 * 학교 관리 — 목표 표시: 역할별 섹션 + 개별 항목 + 목표 숫자 + 표시 순서
 */

import Button from "components/button/Button";
import ToggleSwitch from "components/toggleSwitch/ToggleSwitch";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import {
  DragEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  buildStudentSections,
  buildTeacherSections,
  TGoalSectionDef,
} from "pages/goals/goalItemCatalog";
import {
  reorderIds,
  syncItemOrder,
} from "pages/goals/goalItemOrder";
import { invalidateGoalsCache } from "pages/goals/goalsCache";
import {
  DEFAULT_GOAL_DISPLAY,
  mergeGoalDisplay,
  normalizeGoalItemPref,
  TGoalDisplay,
  TGoalDisplayItems,
  TGoalItemPref,
} from "types/goals";
import { TSchool } from "types/schools";
import { TSeason } from "types/seasons";
import SchoolFeatureToggle from "./FeatureSettings";
import style from "./goalForm.module.scss";

const SUCCESS_MESSAGE = "저장되었습니다.";

type Props = {
  schoolData: TSchool;
  setSchoolData: React.Dispatch<React.SetStateAction<TSchool | undefined>>;
  seasonList?: TSeason[];
};

type RoleKey = "student" | "teacher";

type OrderRow = { id: string; label: string; sectionTitle: string };

function GoalForm(props: Props) {
  const { SchoolAPI, SeasonAPI, BoardAPI, AltFormAPI } = useAPIv2();
  const [display, setDisplay] = useState<TGoalDisplay>(DEFAULT_GOAL_DISPLAY);
  const [saving, setSaving] = useState(false);
  const [evaluationLabels, setEvaluationLabels] = useState<string[]>([]);
  const [boardForms, setBoardForms] = useState<
    { formId: string; title: string }[]
  >([]);
  /** 역할별 보드 양식 목록 펼침 */
  const [boardFormsOpen, setBoardFormsOpen] = useState<Record<RoleKey, boolean>>(
    { student: false, teacher: false }
  );
  /** 섹션 접기 — 키: `${role}:${sectionKey}` / 기본 접힘 */
  const [sectionOpen, setSectionOpen] = useState<Record<string, boolean>>({});
  /** 사이드바 순서 목록 접기 — 기본 접힘 */
  const [orderOpen, setOrderOpen] = useState<Record<RoleKey, boolean>>({
    student: false,
    teacher: false,
  });

  const isSectionOpen = (role: RoleKey, sectionKey: string) =>
    sectionOpen[`${role}:${sectionKey}`] === true;

  const toggleSectionOpen = (role: RoleKey, sectionKey: string) => {
    const key = `${role}:${sectionKey}`;
    setSectionOpen((prev) => ({
      ...prev,
      [key]: prev[key] !== true,
    }));
  };
  const [dragFrom, setDragFrom] = useState<{
    role: RoleKey;
    index: number;
  } | null>(null);
  const [dragOverInsert, setDragOverInsert] = useState<{
    role: RoleKey;
    index: number;
  } | null>(null);
  const dragFromRef = useRef<{ role: RoleKey; index: number } | null>(null);

  useEffect(() => {
    setDisplay(mergeGoalDisplay(props.schoolData.goalDisplay));
  }, [props.schoolData.goalDisplay]);

  // 학기 평가 라벨 + 학교 alt 양식 목록
  useEffect(() => {
    if (!props.schoolData._id) return;
    let cancelled = false;

    const load = async () => {
      try {
        let seasons = props.seasonList;
        if (!seasons) {
          const res = await SeasonAPI.RSeasons({
            query: { school: props.schoolData._id },
          });
          seasons = res.seasons || [];
        }

        const labelSet = new Set<string>();
        for (const season of seasons || []) {
          for (const field of season.formEvaluation || []) {
            if (field?.label) labelSet.add(String(field.label));
          }
        }

        const { boards } = await BoardAPI.RBoards({
          query: { school: props.schoolData._id },
        });
        const altBoards = (boards || []).filter(
          (b: any) => b.boardMode === "alt"
        );

        const formResults = await Promise.all(
          altBoards.map((b: any) =>
            AltFormAPI.RAltForms({ query: { board: b._id } }).catch(() => ({
              forms: [],
            }))
          )
        );

        const formMap = new Map<string, string>();
        for (const { forms } of formResults) {
          for (const form of forms || []) {
            if (form?._id) {
              formMap.set(String(form._id), form.title || "양식");
            }
          }
        }

        if (!cancelled) {
          setEvaluationLabels(Array.from(labelSet));
          setBoardForms(
            Array.from(formMap.entries()).map(([formId, title]) => ({
              formId,
              title,
            }))
          );
        }
      } catch (err) {
        if (!cancelled) ALERT_ERROR(err);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [props.schoolData._id, props.seasonList]);

  const catalogOpts = useMemo(
    () => ({
      formArchive: props.schoolData.formArchive || [],
      evaluationLabels,
      boardForms,
    }),
    [props.schoolData.formArchive, evaluationLabels, boardForms]
  );

  const studentSections = useMemo(
    () => buildStudentSections(catalogOpts),
    [catalogOpts]
  );
  const teacherSections = useMemo(
    () => buildTeacherSections(catalogOpts),
    [catalogOpts]
  );

  const sectionsFor = (role: RoleKey) =>
    role === "student" ? studentSections : teacherSections;

  const readPref = (role: RoleKey, itemId: string): TGoalItemPref =>
    normalizeGoalItemPref(display[role].items?.[itemId]);

  const isItemOn = (role: RoleKey, sectionKey: string, itemId: string) => {
    const roleDisplay = display[role] as any;
    if (roleDisplay[sectionKey] === false) return false;
    return readPref(role, itemId).enabled;
  };

  const catalogMeta = useMemo(() => {
    const map = new Map<string, { label: string; sectionTitle: string }>();
    for (const role of ["student", "teacher"] as const) {
      for (const section of sectionsFor(role)) {
        for (const item of section.items) {
          map.set(item.id, { label: item.label, sectionTitle: section.title });
        }
      }
    }
    return map;
  }, [studentSections, teacherSections]);

  const enabledIdsInCatalogOrder = (role: RoleKey, d: TGoalDisplay) => {
    const roleDisplay = d[role] as any;
    const ids: string[] = [];
    for (const section of sectionsFor(role)) {
      if (roleDisplay[section.key] === false) continue;
      for (const item of section.items) {
        if (normalizeGoalItemPref(roleDisplay.items?.[item.id]).enabled) {
          ids.push(item.id);
        }
      }
    }
    return ids;
  };

  const withSyncedOrder = (
    role: RoleKey,
    roleDisplay: any,
    full: TGoalDisplay
  ): any => {
    const enabled = enabledIdsInCatalogOrder(role, {
      ...full,
      [role]: roleDisplay,
    });
    return {
      ...roleDisplay,
      itemOrder: syncItemOrder(roleDisplay.itemOrder, enabled),
    };
  };

  const orderRowsFor = (role: RoleKey): OrderRow[] => {
    const enabled = enabledIdsInCatalogOrder(role, display);
    const order = syncItemOrder(display[role].itemOrder, enabled);
    return order.map((id) => {
      const meta = catalogMeta.get(id);
      return {
        id,
        label: meta?.label || id,
        sectionTitle: meta?.sectionTitle || "",
      };
    });
  };

  const setSection = (role: RoleKey, key: string, checked: boolean) => {
    setDisplay((prev) => {
      const roleDisplay = { ...prev[role], [key]: checked } as any;
      const sections = sectionsFor(role);
      const section = sections.find((s) => s.key === key);
      const items: TGoalDisplayItems = { ...(roleDisplay.items || {}) };
      if (section) {
        for (const item of section.items) {
          const prevPref = normalizeGoalItemPref(items[item.id]);
          if (checked) {
            if (prevPref.target != null && prevPref.target > 0) {
              items[item.id] = { enabled: true, target: prevPref.target };
            } else {
              delete items[item.id];
            }
          } else {
            items[item.id] = {
              enabled: false,
              target: prevPref.target ?? null,
            };
          }
        }
      }
      roleDisplay.items = items;
      return {
        ...prev,
        [role]: withSyncedOrder(role, roleDisplay, prev),
      };
    });
  };

  const setItemEnabled = (
    role: RoleKey,
    sectionKey: string,
    itemId: string,
    checked: boolean
  ) => {
    setDisplay((prev) => {
      const roleDisplay = { ...prev[role] } as any;
      const items: TGoalDisplayItems = { ...(roleDisplay.items || {}) };
      const prevPref = normalizeGoalItemPref(items[itemId]);
      items[itemId] = {
        enabled: checked,
        target: prevPref.target ?? null,
      };
      roleDisplay.items = items;

      const sections = sectionsFor(role);
      const section = sections.find((s) => s.key === sectionKey);
      if (section) {
        const anyOn = section.items.some((item) => {
          if (item.id === itemId) return checked;
          return normalizeGoalItemPref(items[item.id]).enabled;
        });
        roleDisplay[sectionKey] = anyOn;
      }

      return {
        ...prev,
        [role]: withSyncedOrder(role, roleDisplay, prev),
      };
    });
  };

  const setItemTarget = (role: RoleKey, itemId: string, raw: string) => {
    setDisplay((prev) => {
      const roleDisplay = { ...prev[role] } as any;
      const items: TGoalDisplayItems = { ...(roleDisplay.items || {}) };
      const prevPref = normalizeGoalItemPref(items[itemId]);
      const trimmed = raw.trim();
      let target: number | null = null;
      if (trimmed !== "") {
        const n = Number(trimmed);
        if (Number.isFinite(n) && n > 0) {
          target = Math.min(Math.floor(n), 1_000_000);
        }
      }
      items[itemId] = {
        enabled: prevPref.enabled,
        target,
      };
      roleDisplay.items = items;
      return { ...prev, [role]: roleDisplay };
    });
  };

  const setItemOrder = (role: RoleKey, nextOrder: string[]) => {
    setDisplay((prev) => ({
      ...prev,
      [role]: {
        ...prev[role],
        itemOrder: nextOrder,
      },
    }));
  };

  const getInsertIndex = (e: DragEvent, index: number) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const mid = rect.top + rect.height / 2;
    return e.clientY < mid ? index : index + 1;
  };

  const onOrderDragStart = (role: RoleKey, index: number, e: DragEvent) => {
    dragFromRef.current = { role, index };
    setDragFrom({ role, index });
    setDragOverInsert({ role, index });
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", `${role}:${index}`);
  };

  const onOrderDragOver = (role: RoleKey, index: number, e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const insertAt = getInsertIndex(e, index);
    if (
      !dragOverInsert ||
      dragOverInsert.role !== role ||
      dragOverInsert.index !== insertAt
    ) {
      setDragOverInsert({ role, index: insertAt });
    }
  };

  const onOrderDrop = (role: RoleKey, index: number, e: DragEvent) => {
    e.preventDefault();
    const from =
      dragFromRef.current?.role === role
        ? dragFromRef.current.index
        : dragFrom?.role === role
          ? dragFrom.index
          : NaN;
    const insertAt = getInsertIndex(e, index);
    if (!Number.isNaN(from)) {
      const rows = orderRowsFor(role);
      const next = reorderIds(
        rows.map((r) => r.id),
        from,
        insertAt
      );
      setItemOrder(role, next);
    }
    dragFromRef.current = null;
    setDragFrom(null);
    setDragOverInsert(null);
  };

  const onOrderDragEnd = () => {
    dragFromRef.current = null;
    setDragFrom(null);
    setDragOverInsert(null);
  };

  const save = async () => {
    if (!props.schoolData._id) return;
    setSaving(true);
    try {
      const payload: TGoalDisplay = {
        student: withSyncedOrder("student", display.student, display),
        teacher: withSyncedOrder("teacher", display.teacher, display),
      };
      const { goalDisplay } = await SchoolAPI.USchoolGoalDisplay({
        params: { _id: props.schoolData._id },
        data: { goalDisplay: payload },
      });
      props.setSchoolData({ ...props.schoolData, goalDisplay });
      setDisplay(mergeGoalDisplay(goalDisplay));
      invalidateGoalsCache();
      alert(SUCCESS_MESSAGE);
    } catch (err) {
      ALERT_ERROR(err);
    } finally {
      setSaving(false);
    }
  };

  const renderItemRow = (
    role: RoleKey,
    sectionKey: string,
    item: TGoalSectionDef["items"][number]
  ) => {
    const on = isItemOn(role, sectionKey, item.id);
    const pref = readPref(role, item.id);
    const showTarget = !!item.allowTarget;
    return (
      <div key={item.id} className={style.itemRow}>
        <div className={style.itemMain}>
          <div className={style.itemLabelWrap}>
            <span className={style.itemLabel}>{item.label}</span>
          </div>
          {showTarget && (
            <label className={style.targetField}>
              <span className={style.targetLabel}>목표</span>
              <input
                className={style.targetInput}
                type="number"
                min={1}
                step={1}
                placeholder="없음"
                disabled={!on}
                value={
                  pref.target != null && pref.target > 0
                    ? String(pref.target)
                    : ""
                }
                onChange={(e) => setItemTarget(role, item.id, e.target.value)}
              />
            </label>
          )}
        </div>
        <ToggleSwitch
          checked={on}
          onChange={(checked) =>
            setItemEnabled(role, sectionKey, item.id, checked)
          }
        />
      </div>
    );
  };

  const renderOrderList = (role: RoleKey) => {
    const rows = orderRowsFor(role);
    const open = orderOpen[role] === true;
    return (
      <div className={style.orderBlock}>
        <button
          type="button"
          className={`${style.orderHeader}${
            open ? "" : ` ${style.headerCollapsed}`
          }`}
          onClick={() =>
            setOrderOpen((prev) => ({ ...prev, [role]: !open }))
          }
          aria-expanded={open}
        >
          <span className={style.headerLeft}>
            <span className={style.sectionChevron} aria-hidden>
              {open ? "▾" : "▸"}
            </span>
            <span className={style.orderTitle}>사이드바 표시 순서</span>
            <span className={style.sectionCount}>{rows.length}</span>
          </span>
          <span className={style.orderHint}>드래그로 배치</span>
        </button>
        {open &&
          (rows.length === 0 ? (
            <div className={style.emptyHint}>켜진 항목이 없습니다.</div>
          ) : (
            <div className={style.orderList}>
              {rows.map((row, index) => {
                const showLineBefore =
                  dragOverInsert?.role === role &&
                  dragOverInsert.index === index &&
                  dragFrom?.role === role &&
                  dragFrom.index !== index &&
                  dragFrom.index !== index - 1;
                const showLineAfter =
                  index === rows.length - 1 &&
                  dragOverInsert?.role === role &&
                  dragOverInsert.index === rows.length &&
                  dragFrom?.role === role &&
                  dragFrom.index !== rows.length - 1;
                const dragging =
                  dragFrom?.role === role && dragFrom.index === index;
                return (
                  <div key={row.id} className={style.orderRowWrap}>
                    {showLineBefore && <div className={style.dropLine} />}
                    <div
                      className={`${style.orderRow}${
                        dragging ? ` ${style.orderRowDragging}` : ""
                      }`}
                      draggable
                      onDragStart={(e) => onOrderDragStart(role, index, e)}
                      onDragOver={(e) => onOrderDragOver(role, index, e)}
                      onDrop={(e) => onOrderDrop(role, index, e)}
                      onDragEnd={onOrderDragEnd}
                    >
                      <span className={style.orderHandle} aria-hidden>
                        ⋮⋮
                      </span>
                      <span className={style.orderIndex}>{index + 1}</span>
                      <span className={style.orderLabel}>{row.label}</span>
                      {row.sectionTitle && (
                        <span className={style.orderSection}>
                          {row.sectionTitle}
                        </span>
                      )}
                    </div>
                    {showLineAfter && <div className={style.dropLine} />}
                  </div>
                );
              })}
            </div>
          ))}
      </div>
    );
  };

  const renderRole = (
    role: RoleKey,
    title: string,
    sections: TGoalSectionDef[]
  ) => (
    <div className={style.roleBlock}>
      <div className={style.roleTitle}>{title}</div>
      {sections.map((section) => {
        const sectionOn = (display[role] as any)[section.key] !== false;
        const isBoard = section.key === "board";
        const primaryItems = isBoard
          ? section.items.filter((i) => i.id === "board:전체 할 일")
          : section.items;
        const formItems = isBoard
          ? section.items.filter((i) => i.id !== "board:전체 할 일")
          : [];
        const formsExpanded = boardFormsOpen[role];
        const open = isSectionOpen(role, section.key);
        const onCount = section.items.filter((item) =>
          isItemOn(role, section.key, item.id)
        ).length;

        return (
          <div key={section.key} className={style.section}>
            <div
              className={`${style.sectionHeader}${
                open ? "" : ` ${style.headerCollapsed}`
              }`}
            >
              <button
                type="button"
                className={style.sectionToggle}
                onClick={() => toggleSectionOpen(role, section.key)}
                aria-expanded={open}
              >
                <span className={style.sectionChevron} aria-hidden>
                  {open ? "▾" : "▸"}
                </span>
                <span className={style.sectionTitle}>{section.title}</span>
                <span className={style.sectionCount}>
                  {onCount}/{section.items.length}
                </span>
              </button>
              <div
                className={style.sectionSwitch}
                onClick={(e) => e.stopPropagation()}
              >
                <ToggleSwitch
                  checked={sectionOn}
                  onChange={(checked) =>
                    setSection(role, section.key, checked)
                  }
                />
              </div>
            </div>
            {open &&
              (section.items.length === 0 ? (
                <div className={style.emptyHint}>표시할 항목이 없습니다.</div>
              ) : (
                <div className={style.itemList}>
                  {primaryItems.map((item) =>
                    renderItemRow(role, section.key, item)
                  )}
                  {formItems.length > 0 && (
                    <>
                      <button
                        type="button"
                        className={style.collapseToggle}
                        onClick={() =>
                          setBoardFormsOpen((prev) => ({
                            ...prev,
                            [role]: !prev[role],
                          }))
                        }
                        aria-expanded={formsExpanded}
                      >
                        <span>
                          양식별 미제출
                          <span className={style.collapseCount}>
                            {formItems.length}
                          </span>
                        </span>
                        <span className={style.collapseChevron}>
                          {formsExpanded ? "접기" : "펼치기"}
                        </span>
                      </button>
                      {formsExpanded &&
                        formItems.map((item) =>
                          renderItemRow(role, section.key, item)
                        )}
                    </>
                  )}
                </div>
              ))}
          </div>
        );
      })}
      {renderOrderList(role)}
    </div>
  );

  return (
    <SchoolFeatureToggle
      featureKey="goalsEnabled"
      label="목표 기능 활성화"
      description="끄면 구성원 사이드바와 목표 페이지가 숨겨집니다. 다시 쓰려면 이 스위치만 켜면 됩니다."
      schoolData={props.schoolData}
      setSchoolData={(data) => props.setSchoolData(data)}
    >
      <div className={style.wrap}>
        <p className={style.description}>
          역할별로 표시할 요약 항목을 켭니다. 목표 숫자를 넣으면 fill bar로
          표시됩니다. 아래 「사이드바 표시 순서」에서 켜진 항목의 배치를
          드래그로 조정할 수 있습니다.
        </p>

        <div className={style.rolesGrid}>
          {renderRole("student", "학생", studentSections)}
          {renderRole("teacher", "교사", teacherSections)}
        </div>

        <div className={style.actions}>
          <Button type="ghost" onClick={save} disabled={saving}>
            {saving ? "저장 중…" : "저장"}
          </Button>
        </div>
      </div>
    </SchoolFeatureToggle>
  );
}

export default GoalForm;
