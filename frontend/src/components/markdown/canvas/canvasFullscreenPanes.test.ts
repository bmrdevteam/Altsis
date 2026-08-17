import { canvasFullscreenPanes } from "./canvasFullscreenPanes";

describe("canvasFullscreenPanes", () => {
  test("에디터만 선택되면 에디터만 보여 준다", () => {
    expect(canvasFullscreenPanes(true, false)).toEqual({
      showEditor: true,
      showPreview: false,
    });
  });

  test("미리보기만 선택되면 미리보기만 보여 준다", () => {
    expect(canvasFullscreenPanes(false, true)).toEqual({
      showEditor: false,
      showPreview: true,
    });
  });

  test("둘 다 선택되면 둘 다 보여 준다", () => {
    expect(canvasFullscreenPanes(true, true)).toEqual({
      showEditor: true,
      showPreview: true,
    });
  });

  test("둘 다 선택되지 않으면 미리보기를 보여 준다", () => {
    expect(canvasFullscreenPanes(false, false)).toEqual({
      showEditor: false,
      showPreview: true,
    });
  });
});
