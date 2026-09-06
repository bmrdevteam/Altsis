import { NO_PRINT_CLASS } from "utils/printArea";
import {
  hideFieldLabelsOnPrint,
  sheetFieldLabelClass,
  sheetPrintRootClass,
} from "./sheetPrintChrome";

describe("sheetPrintChrome", () => {
  test("활동 제목이 꺼지면 항목 제목도 인쇄에서 숨긴다", () => {
    expect(hideFieldLabelsOnPrint(true)).toBe(false);
    expect(hideFieldLabelsOnPrint(false)).toBe(true);
  });

  test("숨김일 때만 인쇄 루트·라벨 클래스를 붙인다", () => {
    expect(sheetPrintRootClass(false, "hide")).toBeUndefined();
    expect(sheetPrintRootClass(true, "hide")).toBe("hide");
    expect(sheetFieldLabelClass("label", false)).toBe("label");
    expect(sheetFieldLabelClass("label", true)).toBe(
      `label ${NO_PRINT_CLASS}`
    );
  });
});
