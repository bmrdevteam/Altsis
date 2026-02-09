import style from "./courseMetaInfo.module.scss";

export type ConfirmedStatus = "fullyConfirmed" | "semiConfirmed" | "notConfirmed";

type MetaItem = {
  label: string;
  value: string;
};

type Props = {
  items: MetaItem[];
  confirmedStatus: ConfirmedStatus;
  onStatusClick?: () => void;
};

const statusMap: Record<
  ConfirmedStatus,
  { text: string; className: string }
> = {
  fullyConfirmed: { text: "승인됨", className: style.status_success },
  semiConfirmed: { text: "승인중", className: style.status_warning },
  notConfirmed: { text: "미승인", className: style.status_error },
};

const CourseMetaInfo = ({ items, confirmedStatus, onStatusClick }: Props) => {
  const status = statusMap[confirmedStatus];

  return (
    <div className={style.meta_grid}>
      {items.map((item, i) => (
        <div className={style.meta_item} key={i}>
          <span className={style.meta_label}>{item.label}</span>
          <span className={style.meta_value}>{item.value}</span>
        </div>
      ))}
      <div
        className={`${style.meta_item} ${style.meta_item_status}`}
        onClick={onStatusClick}
      >
        <span className={style.meta_label}>상태</span>
        <span className={`${style.status_badge} ${status.className}`}>
          {status.text}
        </span>
      </div>
    </div>
  );
};

export default CourseMetaInfo;
