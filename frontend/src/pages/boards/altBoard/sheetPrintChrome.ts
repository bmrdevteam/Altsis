import { NO_PRINT_CLASS } from "utils/printArea";

/** 활동 제목을 끄면 인쇄에서 항목 제목도 뺀다. */
export const hideFieldLabelsOnPrint = (showFormTitle: boolean): boolean =>
  !showFormTitle;

export const sheetPrintRootClass = (
  hideLabels: boolean,
  hideClass: string
): string | undefined => (hideLabels ? hideClass : undefined);

export const sheetFieldLabelClass = (
  labelClass: string,
  hideLabels: boolean
): string => (hideLabels ? `${labelClass} ${NO_PRINT_CLASS}` : labelClass);
