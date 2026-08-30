import { printArea } from "./printArea";

const flushPrintFrame = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });

describe("printArea", () => {
  let printSpy: jest.SpyInstance;

  beforeEach(() => {
    printSpy = jest.spyOn(window, "print").mockImplementation(() => undefined);
  });

  afterEach(() => {
    printSpy.mockRestore();
    document.body.classList.remove("altsis-printing");
    document.body.replaceChildren();
  });

  it("hoists a nested overflow root to body, then restores it", async () => {
    const overflow = document.createElement("div");
    overflow.style.overflow = "auto";
    overflow.style.height = "80px";
    const before = document.createElement("p");
    before.textContent = "before";
    const root = document.createElement("div");
    root.textContent = "print me";
    const after = document.createElement("p");
    after.textContent = "after";
    overflow.append(before, root, after);
    document.body.appendChild(overflow);

    printArea(root);
    await flushPrintFrame();

    expect(printSpy).toHaveBeenCalledTimes(1);
    expect(root.parentElement).toBe(document.body);
    expect(root.getAttribute("data-print-root")).toBe("true");
    expect(document.body.classList.contains("altsis-printing")).toBe(true);

    window.dispatchEvent(new Event("afterprint"));

    expect(root.parentElement).toBe(overflow);
    expect(overflow.children[1]).toBe(root);
    expect(root.previousSibling).toBe(before);
    expect(root.nextSibling).toBe(after);
    expect(root.hasAttribute("data-print-root")).toBe(false);
    expect(document.body.classList.contains("altsis-printing")).toBe(false);
  });

  it("does not move a root that is already a body child", async () => {
    const root = document.createElement("div");
    root.textContent = "already on body";
    document.body.appendChild(root);

    printArea(root);
    await flushPrintFrame();

    expect(root.parentElement).toBe(document.body);
    window.dispatchEvent(new Event("afterprint"));
    expect(root.parentElement).toBe(document.body);
  });

  it("alerts and completes when root is missing", () => {
    const alertSpy = jest.spyOn(window, "alert").mockImplementation(() => undefined);
    const onComplete = jest.fn();

    printArea(null, { onComplete });

    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(printSpy).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});
