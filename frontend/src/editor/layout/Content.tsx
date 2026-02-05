import React, { useState } from "react";
import Block from "../blocks/Block";
import style from "../editor.module.scss";
import useEditorStore from "../store/useEditorStore";

const DropZone = ({
  index,
  isActive,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  index: number;
  isActive: boolean;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, index: number) => void;
}) => (
  <div
    className={`${style.drop_zone} ${isActive ? style.drop_zone_active : ""}`}
    onDragOver={(e) => onDragOver(e, index)}
    onDragLeave={onDragLeave}
    onDrop={(e) => onDrop(e, index)}
  />
);

const Content = () => {
  const blocks = useEditorStore((s) => s.blocks);
  const mode = useEditorStore((s) => s.mode);
  const sidebarOpen = useEditorStore((s) => s.sidebarOpen);
  const selectBlock = useEditorStore((s) => s.selectBlock);
  const moveBlock = useEditorStore((s) => s.moveBlock);
  const setDraggedBlockIndex = useEditorStore((s) => s.setDraggedBlockIndex);
  const isDragging = useEditorStore((s) => s.draggedBlockIndex !== null);

  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);

  const handleContentClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).id === "editorPage") {
      selectBlock(null);
    }
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTargetIndex(index);
  };

  const handleDragLeave = () => {
    setDropTargetIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const fromIndex = useEditorStore.getState().draggedBlockIndex;
    if (fromIndex !== null && fromIndex !== dropIndex && fromIndex !== dropIndex - 1) {
      const toIndex = fromIndex < dropIndex ? dropIndex - 1 : dropIndex;
      moveBlock(fromIndex, toIndex);
    }
    setDropTargetIndex(null);
    setDraggedBlockIndex(null);
  };

  const isEditMode = mode === "edit";

  return (
    <div
      className={`${style.content_container} ${mode === "preview" ? style.preview : ""}`}
      style={{
        width:
          mode === "edit" && sidebarOpen ? "calc(100% - 280px)" : "100%",
      }}
    >
      <div
        className={style.page}
        id={"editorPage"}
        onClick={handleContentClick}
      >
        {blocks.map((block, index: number) => (
          <React.Fragment key={block.id}>
            {isEditMode && isDragging && (
              <DropZone
                index={index}
                isActive={dropTargetIndex === index}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              />
            )}
            <Block blockId={block.id} index={index} />
          </React.Fragment>
        ))}
        {isEditMode && isDragging && blocks.length > 0 && (
          <DropZone
            index={blocks.length}
            isActive={dropTargetIndex === blocks.length}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          />
        )}
      </div>
      <div className={style.page_background}>
        <div className={style.background}></div>
      </div>
    </div>
  );
};

export default Content;
