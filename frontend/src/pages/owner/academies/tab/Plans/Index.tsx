import { useEffect, useRef, useState } from "react";
import Svg from "assets/svg/Svg";
import ToggleSwitch from "components/toggleSwitch/ToggleSwitch";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import { formatBytes } from "pages/admin/schools/tab/dashboardFormat";
import {
  TAcademy,
  TAcademyPlanPrice,
  TAcademyPlanUsage,
  TAcademyPlans,
} from "types/academies";
import {
  SEAT_UNIT,
  SEAT_UNIT_PRICE,
  STORAGE_UNIT_BYTES,
  STORAGE_UNIT_PRICE,
  TOKEN_UNIT,
  TOKEN_UNIT_ALTS,
  TOKEN_UNIT_PRICE,
  altsToTokens,
  bytesToGiB,
  clampUnitPrice,
  formatAltCount,
  formatKrw,
  giBToBytes,
  priceForLimit,
  tokensToAltLimit,
  tokensToAlts,
  usageBarTone,
} from "./planPricing";
import style from "./Index.module.scss";

type Props = {
  academyData: TAcademy;
  setAcademyData?: React.Dispatch<any>;
  readOnly?: boolean;
};

type SeasonWarning = {
  schoolName: string;
  seasons: Array<{ year?: string; term?: string }>;
};

const SUCCESS_MESSAGE = "저장되었습니다.";

const PLAN_HINTS = {
  ALT: "활성 학기 좌석 과금을 적용할지 정합니다. 켜면 좌석 한도를 넘은 신규 등록이 막힙니다. 끄면 한도를 넣어도 등록은 막지 않습니다. 채팅·보드·AI 기능과는 무관합니다.",
  SHIFT:
    "보드·채팅·공개 웹사이트 모듈입니다. 끄면 이 세 기능이 막힙니다. 기록·프로필 같은 파일은 계속 올릴 수 있지만, 용량 한도가 있으면 그 한도는 그대로 적용됩니다. 켠다고 보드/채팅/사이트가 자동으로 켜지지는 않고, 각 탭에서 따로 켭니다.",
  CTRL: "Alter(AI) 모듈입니다. 끄면 AI가 막힙니다. 켜면 AI가 열리고, 키·모델은 관리자가 등록합니다. 월 Alt 한도는 켠 뒤 이번 달에만 강제됩니다. 1 Alt = 10,000 토큰입니다. 꺼도 기존 데이터는 지우지 않습니다.",
};

export const PlanHint = ({
  text,
  label,
  align = "right",
}: {
  text: string;
  label: string;
  align?: "left" | "right";
}) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span className={style.hintWrap} ref={rootRef}>
      <button
        type="button"
        className={style.hintBtn}
        aria-label={label}
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <Svg type="info-circle" width="14px" height="14px" />
      </button>
      {open && (
        <span
          className={`${style.hintPopover} ${
            align === "left" ? style.hintPopoverLeft : ""
          }`}
          role="tooltip"
        >
          {text}
        </span>
      )}
    </span>
  );
};

const usageRatio = (used: number, limit: number | null) => {
  if (limit == null || limit <= 0) return 0;
  return Math.min(1, used / limit);
};

const seasonLabel = (season: { year?: string; term?: string }) =>
  `${season.year || ""} ${season.term || ""}`.trim() || "학기";

const nudgeLimit = (current: number | null, delta: number) => {
  const next = Math.max(0, (current || 0) + delta);
  return next === 0 ? null : next;
};

type LimitStepperProps = {
  label: string;
  value: number | null;
  suffix: string;
  fineStep: number;
  coarseStep: number;
  coarseDownLabel: string;
  coarseUpLabel: string;
  onChange: (next: number | null) => void;
};

const LimitStepper = ({
  label,
  value,
  suffix,
  fineStep,
  coarseStep,
  coarseDownLabel,
  coarseUpLabel,
  onChange,
}: LimitStepperProps) => {
  const [draft, setDraft] = useState(value == null ? "" : String(value));

  useEffect(() => {
    setDraft(value == null ? "" : String(value));
  }, [value]);

  const commitDraft = () => {
    const trimmed = draft.trim();
    if (trimmed === "") {
      if (value != null) onChange(null);
      return;
    }
    const parsed = Number(trimmed.replace(/,/g, ""));
    if (!Number.isFinite(parsed)) {
      setDraft(value == null ? "" : String(value));
      return;
    }
    const next = parsed <= 0 ? null : Math.floor(parsed);
    if (next !== value) onChange(next);
  };

  return (
    <div className={style.limitRow}>
      <span className={style.limitLabel}>{label}</span>
      <div className={style.stepper} role="group" aria-label={label}>
        <button
          type="button"
          className={`${style.stepBtn} ${style.stepBtnCoarse}`}
          onClick={() => onChange(nudgeLimit(value, -coarseStep))}
          aria-label={`${coarseDownLabel} 줄이기`}
        >
          −{coarseDownLabel}
        </button>
        <button
          type="button"
          className={style.stepBtn}
          onClick={() => onChange(nudgeLimit(value, -fineStep))}
          aria-label={`${fineStep}${suffix} 줄이기`}
        >
          −
        </button>
        <div className={style.stepValue}>
          <input
            className={style.stepInput}
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            placeholder="없음"
            aria-label={label}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitDraft}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.currentTarget.blur();
              }
            }}
          />
          <span className={style.stepSuffix}>{suffix}</span>
        </div>
        <button
          type="button"
          className={style.stepBtn}
          onClick={() => onChange(nudgeLimit(value, fineStep))}
          aria-label={`${fineStep}${suffix} 늘리기`}
        >
          +
        </button>
        <button
          type="button"
          className={`${style.stepBtn} ${style.stepBtnCoarse}`}
          onClick={() => onChange(nudgeLimit(value, coarseStep))}
          aria-label={`${coarseUpLabel} 늘리기`}
        >
          +{coarseUpLabel}
        </button>
      </div>
    </div>
  );
};

type UnitPriceFieldProps = {
  caption: string;
  value: number;
  fallback: number;
  onChange: (next: number) => void;
};

const UnitPriceField = ({
  caption,
  value,
  fallback,
  onChange,
}: UnitPriceFieldProps) => {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commitDraft = () => {
    const parsed = Number(draft.replace(/,/g, ""));
    const next = clampUnitPrice(parsed, fallback);
    setDraft(String(next));
    if (next !== value) onChange(next);
  };

  return (
    <label className={style.unitPriceLabel}>
      {caption}
      <input
        className={style.unitPriceInput}
        type="number"
        min={0}
        step={1}
        inputMode="numeric"
        aria-label={caption}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commitDraft}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
      />
      원
    </label>
  );
};

type PlanCardProps = {
  name: string;
  description: string;
  hint: string;
  enabled: boolean;
  readOnly?: boolean;
  onEnabledChange?: (value: boolean) => void;
  usedLabel: string;
  limitLabel: string;
  unlimited: boolean;
  ratio: number;
  unitPriceCaption: string;
  unitPrice: number;
  unitPriceFallback: number;
  onUnitPriceChange?: (next: number) => void;
  totalPrice: number;
  stepper?: LimitStepperProps;
  footerAction?: React.ReactNode;
  note?: React.ReactNode;
};

const PlanCard = ({
  name,
  description,
  hint,
  enabled,
  readOnly,
  onEnabledChange,
  usedLabel,
  limitLabel,
  unlimited,
  ratio,
  unitPriceCaption,
  unitPrice,
  unitPriceFallback,
  onUnitPriceChange,
  totalPrice,
  stepper,
  footerAction,
  note,
}: PlanCardProps) => {
  const barPct = unlimited ? 0 : Math.round(ratio * 100);
  const barTone = unlimited ? null : usageBarTone(ratio);
  return (
    <section className={`${style.card} ${enabled ? "" : style.cardOff}`}>
      <div className={style.cardHead}>
        <div className={style.headMeta}>
          <div className={style.titleRow}>
            <h3 className={style.title}>{name}</h3>
            <span
              className={`${style.badge} ${
                enabled ? style.badgeOn : style.badgeOff
              }`}
            >
              {enabled ? "사용 중" : "꺼짐"}
            </span>
          </div>
          <p className={style.desc}>{description}</p>
        </div>
        <div className={style.headActions}>
          <PlanHint text={hint} label={`${name} 모듈 설명`} />
          {!readOnly && onEnabledChange && (
            <ToggleSwitch checked={enabled} onChange={onEnabledChange} />
          )}
        </div>
      </div>
      <div className={style.usageBlock}>
        <div className={style.usageMain}>
          <span className={style.usageValue}>{usedLabel}</span>
          <span className={style.usageLimit}>{limitLabel}</span>
        </div>
        <div
          className={`${style.bar} ${unlimited ? style.barUnlimited : ""}`}
          {...(unlimited
            ? { "aria-hidden": true }
            : {
                role: "progressbar" as const,
                "aria-label": `${name} 사용량`,
                "aria-valuemin": 0,
                "aria-valuemax": 100,
                "aria-valuenow": barPct,
              })}
        >
          {!unlimited && (
            <div
              className={`${style.barFill} ${
                barTone === "ok"
                  ? style.barOk
                  : barTone === "caution"
                    ? style.barCaution
                    : style.barWarn
              }`}
              style={{ width: `${barPct}%` }}
            />
          )}
        </div>
      </div>
      {note}
      {!readOnly && stepper && <LimitStepper {...stepper} />}
      {!readOnly && (
        <div className={style.footer}>
          <div className={style.priceEdit}>
            <UnitPriceField
              caption={unitPriceCaption}
              value={unitPrice}
              fallback={unitPriceFallback}
              onChange={(next) => onUnitPriceChange?.(next)}
            />
            <div className={style.priceTotal}>
              <span className={style.priceLabel}>합계</span>
              <span className={style.price}>{formatKrw(totalPrice)}</span>
            </div>
          </div>
          {footerAction}
        </div>
      )}
    </section>
  );
};

const PlansTab = ({ academyData, setAcademyData, readOnly }: Props) => {
  const { AcademyAPI } = useAPIv2();
  const [plans, setPlans] = useState<TAcademyPlans | null>(null);
  const [usage, setUsage] = useState<TAcademyPlanUsage | null>(null);
  const [price, setPrice] = useState<TAcademyPlanPrice | null>(null);
  const [warnings, setWarnings] = useState<SeasonWarning[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const result = await AcademyAPI.RAcademyPlans({
      params: { academyId: academyData.academyId },
    });
    setPlans(result.plans);
    setUsage(result.usage);
    setPrice(result.price);
    setWarnings(result.seasonWarnings || []);
    if (result.academy && setAcademyData) {
      setAcademyData((prev: TAcademy) => ({ ...prev, ...result.academy }));
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        await load();
      } catch (err) {
        if (!cancelled) ALERT_ERROR(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [academyData.academyId]);

  const save = async (
    data: Parameters<typeof AcademyAPI.UAcademyPlans>[0]["data"],
    silent = true
  ) => {
    try {
      const result = await AcademyAPI.UAcademyPlans({
        params: { academyId: academyData.academyId },
        data,
      });
      setPlans(result.plans);
      setPrice(result.price);
      if (setAcademyData) {
        setAcademyData(result.academy);
      }
      if (!silent) alert(SUCCESS_MESSAGE);
      await load();
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  if (loading || !plans || !usage) {
    return <div className={style.root}>불러오는 중...</div>;
  }

  const storageCats = (usage.storageCategories || []).filter(
    (c) => c.totalBytes > 0
  );
  const maxCatBytes = Math.max(1, ...storageCats.map((c) => c.totalBytes));
  const altUnitPrice = plans.alt.unitPrice ?? SEAT_UNIT_PRICE;
  const shiftUnitPrice = plans.shift.unitPrice ?? STORAGE_UNIT_PRICE;
  const ctrlUnitPrice = plans.ctrl.unitPrice ?? TOKEN_UNIT_PRICE;
  const shiftGiB =
    plans.shift.storageLimitBytes == null
      ? null
      : Math.max(1, bytesToGiB(plans.shift.storageLimitBytes));
  const altRatio = usageRatio(usage.seats, plans.alt.seasonSeatLimit);

  return (
    <div className={style.root}>
      {!readOnly && (
        <div className={style.pageHead}>
          <PlanHint
            align="left"
            label="플랜 안내"
            text="ALT는 활성 학기 등록 고유 사용자 수, SHIFT는 아카데미 전체 파일 용량, CTRL은 이번 달 Alter 사용량(Alt)입니다. 1 Alt = 10,000 토큰입니다. 한도는 1 단위로 맞출 수 있고, 단가는 아카데미마다 바꿀 수 있습니다. 한도를 비우면 강제하지 않습니다."
          />
        </div>
      )}
      <div className={style.grid}>
        <PlanCard
          name="ALT"
          description="활성 학기 등록 고유 사용자"
          hint={PLAN_HINTS.ALT}
          enabled={plans.alt.enabled}
          readOnly={readOnly}
          onEnabledChange={(value) => save({ alt: { enabled: value } }, false)}
          usedLabel={`${usage.seats.toLocaleString("ko-KR")}명`}
          limitLabel={
            plans.alt.seasonSeatLimit != null
              ? `/ ${plans.alt.seasonSeatLimit.toLocaleString("ko-KR")}명`
              : "한도 없음"
          }
          unlimited={plans.alt.seasonSeatLimit == null}
          ratio={altRatio}
          unitPriceCaption="100명당"
          unitPrice={altUnitPrice}
          unitPriceFallback={SEAT_UNIT_PRICE}
          onUnitPriceChange={(next) => save({ alt: { unitPrice: next } })}
          totalPrice={
            price?.alt ??
            priceForLimit(plans.alt.seasonSeatLimit, SEAT_UNIT, altUnitPrice)
          }
          note={
            warnings.length > 0 && altRatio >= 0.8 ? (
              <p className={style.cardNote}>
                활성 학기가 2개 이상인 학교가 있습니다. 지난 학기를 끄면 좌석이
                줄어듭니다.
                {warnings.map((warning) => (
                  <span key={warning.schoolName} className={style.cardNoteDetail}>
                    {warning.schoolName}
                    {warning.seasons.length > 0
                      ? ` · ${warning.seasons.map(seasonLabel).join(", ")}`
                      : ""}
                  </span>
                ))}
              </p>
            ) : null
          }
          stepper={{
            label: "좌석 한도",
            value: plans.alt.seasonSeatLimit,
            suffix: "명",
            fineStep: 1,
            coarseStep: SEAT_UNIT,
            coarseDownLabel: "100",
            coarseUpLabel: "100",
            onChange: (next) => save({ alt: { seasonSeatLimit: next } }),
          }}
        />
        <PlanCard
          name="SHIFT"
          description="전체 파일 용량 · 보드/채팅/사이트 게이트"
          hint={PLAN_HINTS.SHIFT}
          enabled={plans.shift.enabled}
          readOnly={readOnly}
          onEnabledChange={(value) =>
            save({ shift: { enabled: value } }, false)
          }
          usedLabel={formatBytes(usage.storageBytes)}
          limitLabel={
            plans.shift.storageLimitBytes != null
              ? `/ ${formatBytes(plans.shift.storageLimitBytes)}`
              : "한도 없음"
          }
          unlimited={plans.shift.storageLimitBytes == null}
          ratio={usageRatio(usage.storageBytes, plans.shift.storageLimitBytes)}
          unitPriceCaption="100GB당"
          unitPrice={shiftUnitPrice}
          unitPriceFallback={STORAGE_UNIT_PRICE}
          onUnitPriceChange={(next) => save({ shift: { unitPrice: next } })}
          totalPrice={
            price?.shift ??
            priceForLimit(
              plans.shift.storageLimitBytes,
              STORAGE_UNIT_BYTES,
              shiftUnitPrice
            )
          }
          stepper={{
            label: "용량 한도",
            value: shiftGiB,
            suffix: "GB",
            fineStep: 1,
            coarseStep: 100,
            coarseDownLabel: "100GB",
            coarseUpLabel: "100GB",
            onChange: (next) =>
              save({
                shift: {
                  storageLimitBytes: next == null ? null : giBToBytes(next),
                },
              }),
          }}
        />
        <PlanCard
          name="CTRL"
          description="이번 달 Alter 사용량 · 1 Alt = 10,000 토큰 · 키는 아카데미 관리자가 등록"
          hint={PLAN_HINTS.CTRL}
          enabled={plans.ctrl.enabled}
          readOnly={readOnly}
          onEnabledChange={(value) => save({ ctrl: { enabled: value } }, false)}
          usedLabel={`${formatAltCount(tokensToAlts(usage.tokens))} Alt`}
          limitLabel={
            plans.ctrl.tokenLimit != null
              ? `/ ${formatAltCount(
                  tokensToAltLimit(plans.ctrl.tokenLimit) ?? 0
                )} Alt · 이번 달`
              : "한도 없음 · 이번 달"
          }
          unlimited={plans.ctrl.tokenLimit == null}
          ratio={usageRatio(usage.tokens, plans.ctrl.tokenLimit)}
          unitPriceCaption={`월 ${TOKEN_UNIT_ALTS.toLocaleString("ko-KR")} Alt당`}
          unitPrice={ctrlUnitPrice}
          unitPriceFallback={TOKEN_UNIT_PRICE}
          onUnitPriceChange={(next) => save({ ctrl: { unitPrice: next } })}
          totalPrice={
            price?.ctrl ??
            priceForLimit(plans.ctrl.tokenLimit, TOKEN_UNIT, ctrlUnitPrice)
          }
          stepper={{
            label: "월 Alt 한도",
            value: tokensToAltLimit(plans.ctrl.tokenLimit),
            suffix: "Alt",
            fineStep: 1,
            coarseStep: TOKEN_UNIT_ALTS,
            coarseDownLabel: "1만",
            coarseUpLabel: "1만",
            onChange: (next) =>
              save({
                ctrl: { tokenLimit: next == null ? null : altsToTokens(next) },
              }),
          }}
          footerAction={
            !readOnly ? (
              <button
                type="button"
                className={style.resetBtn}
                onClick={() => {
                  if (
                    !window.confirm(
                      "이번 달 CTRL 사용량 카운터를 0으로 되돌릴까요?"
                    )
                  ) {
                    return;
                  }
                  save({ ctrl: { resetUsage: true } }, false);
                }}
              >
                사용량 리셋
              </button>
            ) : null
          }
        />
      </div>
      {plans.shift.enabled && storageCats.length > 0 && (
        <section className={style.breakdown} aria-label="파일 용량 내역">
          <h3 className={style.breakdownTitle}>파일 용량 내역</h3>
          <ul className={style.catList}>
            {storageCats.map((cat) => (
              <li key={cat.name} className={style.catRow}>
                <span className={style.catName}>{cat.name}</span>
                <div className={style.catBar} aria-hidden="true">
                  <div
                    className={style.catFill}
                    style={{
                      width: `${Math.round(
                        (cat.totalBytes / maxCatBytes) * 100
                      )}%`,
                    }}
                  />
                </div>
                <span className={style.catSize}>
                  {formatBytes(cat.totalBytes)}
                </span>
                <span className={style.catCount}>{cat.count}개</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};

export default PlansTab;
