/**
 * 선생님 예약 실행. 학생은 만들 수 없다.
 */

import { useEffect, useState } from "react";
import style from "style/pages/settings/settings.module.scss";
import { useAuth } from "contexts/authContext";
import useDatabase from "hooks/useDatabase";
import {
  alterScheduleStatusLabel,
  describeAlterRoutine,
} from "utils/alterScheduleLabel";

type ScheduleSpec = {
  kind: "once" | "daily" | "weekly";
  time?: string;
  weekdays?: number[];
  onceAt?: string;
};

type RunRow = {
  at?: string;
  status?: string;
  summary?: string;
  toolNames?: string[];
  eventCount?: number;
};

type Routine = {
  _id: string;
  title: string;
  prompt: string;
  schedule: ScheduleSpec;
  timezone?: string;
  enabled: boolean;
  nextRunAt?: string;
  lastRunAt?: string;
  lastStatus?: string;
  lastResultSummary?: string;
  createdVia?: string;
  trigger?: "time" | "event";
  event?: {
    types?: string[];
    debounceMs?: number;
    dmOptIn?: boolean;
    filters?: {
      boardIds?: string[];
      formIds?: string[];
      senderUserIds?: string[];
      calendarScope?: string;
    };
  };
  runs?: RunRow[];
};

const EVENT_OPTIONS = [
  { value: "approval_requested", label: "결재 요청" },
  { value: "form_submitted", label: "양식 제출" },
  { value: "form_posted", label: "양식 게시" },
  { value: "calendar_created", label: "학교 일정" },
  { value: "dm_received", label: "1:1 메시지" },
];

const WEEKDAYS = [
  { value: 1, label: "월" },
  { value: 2, label: "화" },
  { value: 3, label: "수" },
  { value: 4, label: "목" },
  { value: 5, label: "금" },
  { value: 6, label: "토" },
  { value: 0, label: "일" },
];

const emptyForm = () => ({
  title: "",
  prompt: "",
  kind: "weekly" as ScheduleSpec["kind"],
  time: "08:00",
  weekdays: [1] as number[],
  onceAt: "",
  timezone: "Asia/Seoul",
  trigger: "time" as "time" | "event",
  eventTypes: [] as string[],
  debounceMs: 15 * 60 * 1000,
  dmOptIn: false,
  boardIds: [] as string[],
  formIds: [] as string[],
  senderIds: [] as string[],
  calendarScope: "",
});

const errorMessage = (err: any, fallback: string) =>
  err?.response?.data?.message || err?.message || fallback;

const RoutineSettings = () => {
  const { currentSeason, currentRegistration, currentSchool } = useAuth();
  const database = useDatabase();
  const seasonId = currentSeason?._id || "";
  const isStudent = currentRegistration?.role === "student";
  const [rows, setRows] = useState<Routine[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [boards, setBoards] = useState<{ _id: string; title?: string; name?: string }[]>([]);
  const [forms, setForms] = useState<{ _id: string; title?: string }[]>([]);
  const [senderQuery, setSenderQuery] = useState("");
  const [senderHits, setSenderHits] = useState<{ _id: string; userName?: string; userId?: string }[]>([]);
  const eventsOn = currentSchool?.academyFeatures?.alterEventTriggersEnabled === true;

  const load = async () => {
    if (!seasonId) return;
    const data = await database.R({
      location: `ai/alter/schedules?season=${encodeURIComponent(seasonId)}`,
    });
    setRows(data.schedules || []);
  };

  useEffect(() => {
    if (!seasonId) return;
    let cancelled = false;
    database
      .R({
        location: `ai/alter/schedules?season=${encodeURIComponent(seasonId)}`,
      })
      .then((data) => {
        if (!cancelled) setRows(data.schedules || []);
      })
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err, "예약을 불러오지 못했습니다."));
      });
    return () => {
      cancelled = true;
    };
    // database 함수는 렌더마다 새로 만들어지므로 학기·역할만 본다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStudent, seasonId]);

  const scheduleBody = () => {
    const schedule: ScheduleSpec = { kind: form.kind };
    if (form.kind === "once") schedule.onceAt = new Date(form.onceAt).toISOString();
    else {
      schedule.time = form.time;
      if (form.kind === "weekly") schedule.weekdays = form.weekdays;
    }
    if (form.trigger === "event") {
      return {
        season: seasonId,
        title: form.title.trim(),
        prompt: form.prompt.trim(),
        timezone: form.timezone.trim() || "Asia/Seoul",
        trigger: "event",
        event: {
          types: form.eventTypes,
          debounceMs: form.debounceMs,
          dmOptIn: form.dmOptIn,
          filters: {
            boardIds: form.boardIds,
            formIds: form.formIds,
            senderUserIds: form.senderIds,
            calendarScope: form.calendarScope,
          },
        },
      };
    }
    return {
      season: seasonId,
      title: form.title.trim(),
      prompt: form.prompt.trim(),
      timezone: form.timezone.trim() || "Asia/Seoul",
      trigger: "time",
      schedule,
    };
  };

  const save = async () => {
    setError("");
    setNotice("");
    setBusy(true);
    try {
      if (editing) {
        await database.U({
          location: `ai/alter/schedules/${editing}`,
          data: scheduleBody(),
        });
        setNotice("예약을 수정했습니다.");
      } else {
        await database.C({
          location: "ai/alter/schedules",
          data: scheduleBody(),
        });
        setNotice("예약을 저장했습니다.");
      }
      setForm(emptyForm());
      setEditing(null);
      await load();
    } catch (err) {
      setError(errorMessage(err, "저장하지 못했습니다."));
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (row: Routine) => {
    setError("");
    try {
      await database.U({
        location: `ai/alter/schedules/${row._id}`,
        data: { enabled: !row.enabled },
      });
      await load();
    } catch (err) {
      setError(errorMessage(err, "상태를 바꾸지 못했습니다."));
    }
  };

  const remove = async (row: Routine) => {
    setError("");
    try {
      await database.D({ location: `ai/alter/schedules/${row._id}` });
      if (editing === row._id) {
        setEditing(null);
        setForm(emptyForm());
      }
      await load();
    } catch (err) {
      setError(errorMessage(err, "삭제하지 못했습니다."));
    }
  };

  const runNow = async (row: Routine) => {
    setError("");
    setNotice("");
    setBusy(true);
    try {
      await database.C({
        location: `ai/alter/schedules/${row._id}/run`,
        data: { season: seasonId },
      });
      setNotice("지금 실행했습니다. 결과는 알림과 Alter 대화에 남습니다.");
      await load();
    } catch (err) {
      setError(errorMessage(err, "실행하지 못했습니다."));
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (row: Routine) => {
    setEditing(row._id);
    setForm({
      title: row.title,
      prompt: row.prompt,
      kind: row.schedule?.kind || "weekly",
      time: row.schedule?.time || "08:00",
      weekdays: row.schedule?.weekdays?.length ? row.schedule.weekdays : [1],
      onceAt: row.schedule?.onceAt
        ? String(row.schedule.onceAt).slice(0, 16)
        : "",
      timezone: row.timezone || "Asia/Seoul",
      trigger: row.trigger === "event" ? "event" : "time",
      eventTypes: row.event?.types || [],
      debounceMs: row.event?.debounceMs || 15 * 60 * 1000,
      dmOptIn: row.event?.dmOptIn === true,
      boardIds: row.event?.filters?.boardIds || [],
      formIds: row.event?.filters?.formIds || [],
      senderIds: row.event?.filters?.senderUserIds || [],
      calendarScope: row.event?.filters?.calendarScope || "",
    });
  };

  useEffect(() => {
    if (!seasonId || form.trigger !== "event") return;
    let cancelled = false;
    database
      .R({ location: "boards" })
      .then((data) => {
        if (!cancelled) setBoards(data.boards || []);
      })
      .catch(() => {
        if (!cancelled) setBoards([]);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.trigger, seasonId]);

  useEffect(() => {
    if (form.trigger !== "event" || !form.boardIds.length) {
      setForms([]);
      return;
    }
    let cancelled = false;
    Promise.all(
      form.boardIds.map((boardId) =>
        database
          .R({ location: `alt/forms?board=${encodeURIComponent(boardId)}` })
          .then((data) => data.forms || data.altForms || [])
          .catch(() => [])
      )
    ).then((groups) => {
      if (!cancelled) setForms(groups.flat());
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.boardIds, form.trigger]);

  useEffect(() => {
    if (form.trigger !== "event" || !form.eventTypes.includes("dm_received")) return;
    const timer = setTimeout(() => {
      database
        .R({
          location: `chats/users?q=${encodeURIComponent(senderQuery)}&seasonId=${encodeURIComponent(seasonId)}`,
        })
        .then((data) => setSenderHits(data.users || []))
        .catch(() => setSenderHits([]));
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.eventTypes, form.trigger, seasonId, senderQuery]);

  if (!seasonId) {
    return (
      <div className={style.settings_container}>
        <div className={style.container_title}>예약 실행</div>
        <p className={style.routine_help}>학기를 선택한 뒤 예약을 만들 수 있습니다.</p>
      </div>
    );
  }

  const canManage = !isStudent;
  const recentRuns = (row: Routine) => (row.runs || []).slice(-3);

  return (
    <div className={style.settings_container}>
      <div className={style.container_title}>예약 실행</div>
      {canManage ? (
        <p className={style.routine_help}>
          정한 시각이나 이벤트에 Alter가 선생님 계정으로 할 일과 안내만 조회합니다.
          계정당 5개까지이고 그중 이벤트 예약은 3개까지입니다. 반복은 최소
          1시간이고, 이벤트 예약은 루틴당 하루 6회, 계정당 하루 12회까지입니다.
          실행에 쓴 토큰은 오늘 사용량에 포함됩니다.
        </p>
      ) : rows.length > 0 ? (
        <p className={style.routine_help}>
          예전에 만든 예약은 끄거나 지울 수 있습니다. 새로 만들거나 지금 실행하는
          것은 선생님만 할 수 있습니다.
        </p>
      ) : null}
      {error ? <p className={style.routine_error}>{error}</p> : null}
      {notice ? <p className={style.routine_notice}>{notice}</p> : null}
      {isStudent && rows.length === 0 ? (
        <p className={style.routine_help}>
          예약 실행은 선생님만 사용할 수 있습니다.
        </p>
      ) : null}

      {canManage ? (
      <div className={style.routine_card}>
        <div className={style.container_subtitle}>
          {editing ? "예약 수정" : "새 예약"}
        </div>
        <label className={style.routine_label}>
          이름
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="월요일 할 일"
          />
        </label>
        <label className={style.routine_label}>
          실행할 내용
          <textarea
            value={form.prompt}
            onChange={(e) => setForm({ ...form, prompt: e.target.value })}
            placeholder="이번 주 할 일을 조회해서 정리해 줘"
            rows={3}
          />
        </label>
        <label className={style.routine_label}>
          실행
          <select
            value={form.trigger}
            onChange={(e) =>
              setForm({
                ...form,
                trigger: e.target.value as "time" | "event",
              })
            }
          >
            <option value="time">시각</option>
            <option value="event">이벤트</option>
          </select>
        </label>
        {form.trigger === "event" && !eventsOn ? (
          <p className={style.routine_help}>
            이벤트 예약은 아카데미 관리자가 설정에서 켜야 저장됩니다.
          </p>
        ) : null}
        {form.trigger === "event" ? (
          <>
            <div className={style.weekday_row}>
              {EVENT_OPTIONS.map((option) => (
                <label key={option.value}>
                  <input
                    type="checkbox"
                    checked={form.eventTypes.includes(option.value)}
                    onChange={() => {
                      const has = form.eventTypes.includes(option.value);
                      setForm({
                        ...form,
                        eventTypes: has
                          ? form.eventTypes.filter((value) => value !== option.value)
                          : [...form.eventTypes, option.value],
                      });
                    }}
                  />
                  {option.label}
                </label>
              ))}
            </div>
            <label className={style.routine_label}>
              모으는 시간
              <select
                value={String(form.debounceMs)}
                onChange={(e) => setForm({ ...form, debounceMs: Number(e.target.value) })}
              >
                <option value={String(5 * 60 * 1000)}>5분</option>
                <option value={String(15 * 60 * 1000)}>15분</option>
                <option value={String(60 * 60 * 1000)}>60분</option>
              </select>
            </label>
            {boards.length ? (
              <div className={style.weekday_row}>
                {boards.map((board) => (
                  <label key={board._id}>
                    <input
                      type="checkbox"
                      checked={form.boardIds.includes(board._id)}
                      onChange={() => {
                        const has = form.boardIds.includes(board._id);
                        setForm({
                          ...form,
                          boardIds: has
                            ? form.boardIds.filter((id) => id !== board._id)
                            : [...form.boardIds, board._id],
                        });
                      }}
                    />
                    {board.title || board.name || "보드"}
                  </label>
                ))}
              </div>
            ) : null}
            {forms.length ? (
              <div className={style.weekday_row}>
                {forms.map((item) => (
                  <label key={item._id}>
                    <input
                      type="checkbox"
                      checked={form.formIds.includes(item._id)}
                      onChange={() => {
                        const has = form.formIds.includes(item._id);
                        setForm({
                          ...form,
                          formIds: has
                            ? form.formIds.filter((id) => id !== item._id)
                            : [...form.formIds, item._id],
                        });
                      }}
                    />
                    {item.title || "양식"}
                  </label>
                ))}
              </div>
            ) : null}
            {form.eventTypes.includes("calendar_created") ? (
              <label className={style.routine_label}>
                일정 범위
                <select
                  value={form.calendarScope}
                  onChange={(e) => setForm({ ...form, calendarScope: e.target.value })}
                >
                  <option value="">학교 일정</option>
                  <option value="school">학교 일정만</option>
                </select>
              </label>
            ) : null}
            {form.eventTypes.includes("dm_received") ? (
              <>
                <p className={style.routine_help}>
                  1:1 메시지 내용은 실행 때 AI 제공자에게 전달됩니다. 그룹 채팅과 보드
                  채팅은 포함되지 않습니다. 메시지 본문은 예약에 저장하지 않습니다.
                </p>
                <label className={style.routine_label}>
                  <input
                    type="checkbox"
                    checked={form.dmOptIn}
                    onChange={(e) => setForm({ ...form, dmOptIn: e.target.checked })}
                  />
                  1:1 메시지 내용을 AI에 보내는 데 동의합니다.
                </label>
                <label className={style.routine_label}>
                  보낸 사람
                  <input
                    value={senderQuery}
                    onChange={(e) => setSenderQuery(e.target.value)}
                    placeholder="이름 또는 아이디"
                  />
                </label>
                <div className={style.weekday_row}>
                  {senderHits.map((person) => (
                    <label key={person._id}>
                      <input
                        type="checkbox"
                        checked={form.senderIds.includes(person._id)}
                        onChange={() => {
                          const has = form.senderIds.includes(person._id);
                          setForm({
                            ...form,
                            senderIds: has
                              ? form.senderIds.filter((id) => id !== person._id)
                              : [...form.senderIds, person._id],
                          });
                        }}
                      />
                      {person.userName || person.userId}
                    </label>
                  ))}
                </div>
              </>
            ) : null}
          </>
        ) : null}
        {form.trigger === "time" ? (
        <>
        <label className={style.routine_label}>
          반복
          <select
            value={form.kind}
            onChange={(e) =>
              setForm({
                ...form,
                kind: e.target.value as ScheduleSpec["kind"],
              })
            }
          >
            <option value="weekly">매주</option>
            <option value="daily">매일</option>
            <option value="once">한 번</option>
          </select>
        </label>
        {form.kind === "once" ? (
          <label className={style.routine_label}>
            시각
            <input
              type="datetime-local"
              value={form.onceAt}
              onChange={(e) => setForm({ ...form, onceAt: e.target.value })}
            />
          </label>
        ) : (
          <label className={style.routine_label}>
            시각
            <input
              type="time"
              value={form.time}
              onChange={(e) => setForm({ ...form, time: e.target.value })}
            />
          </label>
        )}
        {form.kind === "weekly" ? (
          <div className={style.weekday_row}>
            {WEEKDAYS.map((day) => (
              <label key={day.value}>
                <input
                  type="checkbox"
                  checked={form.weekdays.includes(day.value)}
                  onChange={() => {
                    const has = form.weekdays.includes(day.value);
                    const weekdays = has
                      ? form.weekdays.filter((value) => value !== day.value)
                      : [...form.weekdays, day.value];
                    setForm({ ...form, weekdays });
                  }}
                />
                {day.label}
              </label>
            ))}
          </div>
        ) : null}
        <label className={style.routine_label}>
          시간대
          <input
            value={form.timezone}
            onChange={(e) => setForm({ ...form, timezone: e.target.value })}
          />
        </label>
        </>
        ) : null}
        <div className={style.routine_actions}>
          <button type="button" onClick={() => void save()} disabled={busy || (rows.length >= 5 && !editing)}>
            저장
          </button>
          {editing ? (
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setForm(emptyForm());
              }}
            >
              취소
            </button>
          ) : null}
        </div>
      </div>
      ) : null}

      {rows.map((row) => (
        <div key={row._id} className={style.routine_card}>
          <strong>{row.title}</strong>
          <p>{describeAlterRoutine(row)}</p>
          <p className={style.routine_help}>{row.prompt}</p>
          <p>
            마지막 실행: {alterScheduleStatusLabel(row.lastStatus)}
            {row.lastResultSummary ? ` — ${row.lastResultSummary}` : ""}
          </p>
          <p>{row.enabled ? "사용 중" : "꺼짐"}</p>
          {recentRuns(row).map((run, index) => (
            <p key={`${row._id}-run-${index}`} className={style.routine_help}>
              {alterScheduleStatusLabel(run.status)}
              {run.toolNames?.length ? ` · ${run.toolNames.join(", ")}` : ""}
              {run.eventCount ? ` · 이벤트 ${run.eventCount}건` : ""}
              {run.summary ? ` — ${run.summary}` : ""}
            </p>
          ))}
          <div className={style.routine_actions}>
            {canManage ? (
              <button type="button" onClick={() => startEdit(row)}>
                수정
              </button>
            ) : null}
            <button type="button" onClick={() => void toggle(row)}>
              {row.enabled ? "끄기" : "켜기"}
            </button>
            {canManage ? (
              <button type="button" onClick={() => void runNow(row)} disabled={busy}>
                지금 실행
              </button>
            ) : null}
            <button type="button" onClick={() => void remove(row)}>
              삭제
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default RoutineSettings;
