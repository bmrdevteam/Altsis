import style from "../Alter.module.scss";

export type DraftTableColumn = { key: string; label: string };

const CELL_LIMIT = 80;

type Props = {
  columns: DraftTableColumn[];
  rows: Array<Record<string, unknown>>;
  emptyText?: string;
  compact?: boolean;
  rowKey?: (row: Record<string, unknown>, index: number) => string;
};

const cellText = (value: unknown, compact: boolean) => {
  const raw = value == null ? "" : String(value);
  if (compact && raw.length > CELL_LIMIT) {
    return raw.slice(0, CELL_LIMIT) + "…";
  }
  return raw;
};

const DraftDataTable = ({
  columns,
  rows,
  emptyText = "행이 없습니다.",
  compact = true,
  rowKey,
}: Props) => {
  if (!columns.length || !rows.length) {
    return <p className={style.draftFieldValue}>{emptyText}</p>;
  }
  return (
    <div className={style.searchTableWrap}>
      <table
        className={`${style.searchTable}${
          compact ? "" : ` ${style.searchTableExpanded}`
        }`}
      >
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key}>{c.label || c.key}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={rowKey ? rowKey(row, i) : String(i)}>
              {columns.map((c) => (
                <td key={c.key} title={row[c.key] == null ? "" : String(row[c.key])}>
                  {cellText(row[c.key], compact)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DraftDataTable;
