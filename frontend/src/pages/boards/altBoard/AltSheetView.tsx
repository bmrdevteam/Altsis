import { useEffect, useState } from "react";
import style from "./altBoard.module.scss";
import { TBoard } from "types/board";
import { TAltForm, TAltFormField } from "types/altForm";
import { TAltSheetRow } from "types/altSheet";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";

type Props = {
  board: TBoard;
  forms: TAltForm[];
  canManage: boolean;
};

const AltSheetView = ({ board, forms, canManage }: Props) => {
  const { AltSheetRowAPI } = useAPIv2();

  const [selectedFormId, setSelectedFormId] = useState<string>(
    forms[0]?._id || ""
  );
  const [rows, setRows] = useState<TAltSheetRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 인라인 편집 상태
  const [editingCell, setEditingCell] = useState<{
    rowId: string;
    fieldId: string;
  } | null>(null);
  const [editValue, setEditValue] = useState("");

  const selectedForm = forms.find((f) => f._id === selectedFormId);

  // 표시할 필드: 관리자는 전체, 응답자는 respondent + visibleToRespondent
  const visibleFields: TAltFormField[] = selectedForm
    ? canManage
      ? selectedForm.fields
      : selectedForm.fields.filter(
          (f) =>
            f.permission === "respondent" ||
            (f.permission === "owner" && f.visibleToRespondent)
        )
    : [];

  useEffect(() => {
    if (!selectedFormId) return;
    setIsLoading(true);
    AltSheetRowAPI.RAltSheetRows({ query: { form: selectedFormId } })
      .then(({ rows }) => {
        setRows(rows);
        setIsLoading(false);
      })
      .catch((err) => {
        ALERT_ERROR(err);
        setIsLoading(false);
      });
  }, [selectedFormId]);

  const handleCellClick = (rowId: string, field: TAltFormField, currentValue: string) => {
    if (!canManage || field.permission !== "owner") return;
    setEditingCell({ rowId, fieldId: field._id });
    setEditValue(currentValue || "");
  };

  const handleCellSave = async () => {
    if (!editingCell) return;
    try {
      await AltSheetRowAPI.UAltSheetRow({
        params: { _id: editingCell.rowId },
        data: { data: { [editingCell.fieldId]: editValue } },
      });
      setRows((prev) =>
        prev.map((r) =>
          r._id === editingCell.rowId
            ? { ...r, data: { ...r.data, [editingCell.fieldId]: editValue } }
            : r
        )
      );
    } catch (err) {
      ALERT_ERROR(err);
    }
    setEditingCell(null);
  };

  const handleCellKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleCellSave();
    } else if (e.key === "Escape") {
      setEditingCell(null);
    }
  };

  const formatCellValue = (value: any): string => {
    if (value === null || value === undefined) return "";
    if (Array.isArray(value)) return value.join(", ");
    if (typeof value === "boolean") return value ? "Y" : "N";
    return String(value);
  };

  if (forms.length === 0) {
    return <div className={style.emptyState}>양식을 먼저 생성해주세요.</div>;
  }

  return (
    <div className={style.sheetContainer}>
      {/* 양식 선택 */}
      {forms.length > 1 && (
        <div className={style.sheetFormSelector}>
          <span className={style.sheetFormLabel}>양식:</span>
          <select
            className={style.selectInput}
            style={{ minWidth: "160px", padding: "6px 10px", fontSize: "13px" }}
            value={selectedFormId}
            onChange={(e) => setSelectedFormId(e.target.value)}
          >
            {forms.map((f) => (
              <option key={f._id} value={f._id}>
                {f.title}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* 툴바 */}
      <div className={style.sheetToolbar}>
        <span className={style.sheetCount}>
          {isLoading ? "로딩 중..." : `${rows.length}개 응답`}
        </span>
      </div>

      {/* 테이블 */}
      {!isLoading && rows.length === 0 ? (
        <div className={style.sheetEmpty}>아직 응답이 없습니다.</div>
      ) : !isLoading ? (
        <table className={style.sheetTable}>
          <thead>
            <tr>
              <th>#</th>
              <th>응답자</th>
              {visibleFields.map((f) => (
                <th key={f._id}>
                  {f.label}
                  {f.permission === "owner" && (
                    <span
                      style={{
                        fontSize: "10px",
                        color: "var(--accent-1)",
                        marginLeft: "4px",
                      }}
                    >
                      (관리자)
                    </span>
                  )}
                </th>
              ))}
              <th>제출일</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row._id}>
                <td>{index + 1}</td>
                <td>
                  {row._respondentName || "-"}
                  {row._respondentId && (
                    <span
                      style={{
                        fontSize: "11px",
                        color: "var(--text-color-2)",
                        marginLeft: "4px",
                      }}
                    >
                      ({row._respondentId})
                    </span>
                  )}
                </td>
                {visibleFields.map((field) => {
                  const cellValue = formatCellValue(row.data[field._id]);
                  const isEditing =
                    editingCell?.rowId === row._id &&
                    editingCell?.fieldId === field._id;
                  const isOwnerField = field.permission === "owner";

                  return (
                    <td key={field._id}>
                      {isEditing ? (
                        <input
                          className={style.cellInput}
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={handleCellSave}
                          onKeyDown={handleCellKeyDown}
                          autoFocus
                        />
                      ) : canManage && isOwnerField ? (
                        <span
                          className={style.cellEditable}
                          onClick={() =>
                            handleCellClick(row._id, field, cellValue)
                          }
                        >
                          {cellValue || "-"}
                        </span>
                      ) : (
                        cellValue || "-"
                      )}
                    </td>
                  );
                })}
                <td>
                  {row._submittedAt
                    ? new Date(row._submittedAt).toLocaleDateString("ko-KR")
                    : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
};

export default AltSheetView;
