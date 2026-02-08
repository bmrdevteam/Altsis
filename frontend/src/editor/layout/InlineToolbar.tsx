import React, { useLayoutEffect, useRef, useState, useEffect } from "react";
import Svg from "../../assets/svg/Svg";
import useEditorStore from "../store/useEditorStore";

const InlineToolbar = () => {
  const selectedBlockId = useEditorStore((s) => s.selectedBlockId);
  const selectedBlock = useEditorStore((s) => {
    if (!s.selectedBlockId) return null;
    return s.blocks.find((b) => b.id === s.selectedBlockId) ?? null;
  });
  const blocks = useEditorStore((s) => s.blocks);
  const mode = useEditorStore((s) => s.mode);
  const moveBlock = useEditorStore((s) => s.moveBlock);
  const removeBlock = useEditorStore((s) => s.removeBlock);
  const duplicateBlock = useEditorStore((s) => s.duplicateBlock);
  const getBlockIndex = useEditorStore((s) => s.getBlockIndex);

  const toolbarRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [visible, setVisible] = useState(false);

  useLayoutEffect(() => {
    if (!selectedBlockId || mode !== "edit") {
      setVisible(false);
      return;
    }

    const el = document.getElementById(selectedBlockId);
    if (!el) {
      setVisible(false);
      return;
    }

    const contentContainer = el.closest("[class*='content_container']");
    const page = el.closest("[class*='page']");

    const updatePosition = () => {
      const rect = el.getBoundingClientRect();
      const pageBounds = page?.getBoundingClientRect();
      const containerBounds = contentContainer?.getBoundingClientRect();

      // Position toolbar in the left padding area of the page
      // Use page left + 8px for consistent positioning relative to content
      let leftPos = rect.left - 40;
      if (pageBounds) {
        leftPos = pageBounds.left + 8;
      }

      // Calculate top boundary from container
      const topBoundary = containerBounds ? containerBounds.top : 56;

      setPosition({
        top: Math.max(rect.top, topBoundary),
        left: leftPos,
      });
      setVisible(true);
    };

    updatePosition();

    // Recalculate on scroll
    if (contentContainer) {
      contentContainer.addEventListener("scroll", updatePosition);
    }

    // Use ResizeObserver to detect layout changes (sidebar open/close)
    const resizeObserver = new ResizeObserver(() => {
      updatePosition();
    });

    if (contentContainer) {
      resizeObserver.observe(contentContainer);
    }
    if (page) {
      resizeObserver.observe(page);
    }

    return () => {
      if (contentContainer) {
        contentContainer.removeEventListener("scroll", updatePosition);
      }
      resizeObserver.disconnect();
    };
  }, [selectedBlockId, mode, blocks.length]);

  if (!visible || !selectedBlock || !selectedBlockId) return null;

  const blockIndex = getBlockIndex(selectedBlockId);

  const toolbarStyle: React.CSSProperties = {
    position: "fixed",
    top: `${position.top}px`,
    left: `${position.left}px`,
    zIndex: 100,
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    padding: "4px",
    backgroundColor: "var(--background-color)",
    border: "var(--border-default)",
    borderRadius: "8px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
    fontSize: "12px",
    alignItems: "center",
  };

  const btnStyle: React.CSSProperties = {
    cursor: "pointer",
    padding: "4px 6px",
    borderRadius: "4px",
    border: "none",
    background: "transparent",
    fontSize: "12px",
    fontWeight: 500,
    color: "var(--accent-2)",
    display: "flex",
    alignItems: "center",
  };

  const btnHover = (e: React.MouseEvent<HTMLButtonElement>) => {
    (e.target as HTMLElement).style.backgroundColor = "var(--component-color)";
  };
  const btnLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    (e.target as HTMLElement).style.backgroundColor = "transparent";
  };

  return (
    <div ref={toolbarRef} style={toolbarStyle}>
      {/* Rich text formatting for paragraph blocks */}
      {selectedBlock.type === "paragraph" && (
        <>
          <button
            style={btnStyle}
            onMouseEnter={btnHover}
            onMouseLeave={btnLeave}
            onClick={() => document.execCommand("bold")}
            title="굵게 (Ctrl+B)"
          >
            <strong>B</strong>
          </button>
          <button
            style={btnStyle}
            onMouseEnter={btnHover}
            onMouseLeave={btnLeave}
            onClick={() => document.execCommand("italic")}
            title="기울임 (Ctrl+I)"
          >
            <em>I</em>
          </button>
          <button
            style={btnStyle}
            onMouseEnter={btnHover}
            onMouseLeave={btnLeave}
            onClick={() => document.execCommand("underline")}
            title="밑줄 (Ctrl+U)"
          >
            <u>U</u>
          </button>
          <div
            style={{
              width: "16px",
              height: "1px",
              backgroundColor: "var(--accent-5)",
              margin: "2px 0",
            }}
          />
        </>
      )}

      <button
        style={{
          ...btnStyle,
          opacity: blockIndex <= 0 ? 0.3 : 1,
        }}
        onMouseEnter={blockIndex > 0 ? btnHover : undefined}
        onMouseLeave={blockIndex > 0 ? btnLeave : undefined}
        onClick={() => {
          if (blockIndex > 0) moveBlock(blockIndex, blockIndex - 1);
        }}
        title="위로 이동"
      >
        <Svg type="arrowUp" width="14px" height="14px" />
      </button>
      <button
        style={{
          ...btnStyle,
          opacity: blockIndex >= blocks.length - 1 ? 0.3 : 1,
        }}
        onMouseEnter={
          blockIndex < blocks.length - 1 ? btnHover : undefined
        }
        onMouseLeave={
          blockIndex < blocks.length - 1 ? btnLeave : undefined
        }
        onClick={() => {
          if (blockIndex < blocks.length - 1)
            moveBlock(blockIndex, blockIndex + 1);
        }}
        title="아래로 이동"
      >
        <Svg type="arrowDown" width="14px" height="14px" />
      </button>
      <button
        style={btnStyle}
        onMouseEnter={btnHover}
        onMouseLeave={btnLeave}
        onClick={() => duplicateBlock(selectedBlockId)}
        title="복제"
      >
        <Svg type="paste" width="14px" height="14px" />
      </button>
      <button
        style={{ ...btnStyle, color: "#e74c3c" }}
        onMouseEnter={btnHover}
        onMouseLeave={btnLeave}
        onClick={() => removeBlock(selectedBlockId)}
        title="삭제"
      >
        <Svg type="trash" width="14px" height="14px" />
      </button>
    </div>
  );
};

export default InlineToolbar;
