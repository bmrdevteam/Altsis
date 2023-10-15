import React, {useCallback, useMemo, useState} from "react";
import Block from "../blocks/Block";
import style from "../editor.module.scss";
import { useEditor } from "../functions/editorContext";
import useEditorStore from "../functions/useEditorStore";
import { DragDropContext, Draggable, Droppable } from "react-beautiful-dnd";
import useReload from "../functions/useReload";

type Props = {
  reloadHook: (
    setCounterState: React.Dispatch<React.SetStateAction<any>>
  ) => void;
};

const reorderBlock = (list: any, startIndex: number, endIndex: number) => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);

  result.splice(endIndex, 0, removed);

  return result;
}

const Content = (props: Props) => {
  const { result, editorPageRef, changeBlockData } = useEditor();
  const { preview } = useEditorStore();
  const { callPageReload, _init } = useReload();

  const contents = useMemo(() => (
    result()
  ), []);

  const [counter, setCounter] = useState<number>(0);
  props.reloadHook(setCounter);

  _init(setCounter);

  const onDragStart = useCallback(() => {
    console.log('drag start')
  }, []);

  const onDragEnd = useCallback((result: { destination: any, source: any, draggableId: string }) => {
    const { destination, source, draggableId } = result;

    if (!destination) {
      console.log('no destination')
      return;
    }

    reorderBlock(contents, source.index, destination.index);
  }, []);

  return (
    <DragDropContext
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}>
      <Droppable droppableId="content">
        {provided => (
          <>
          <div className={`${style.content_container} ${preview && style.preview}`} ref={provided.innerRef}
               {...provided.droppableProps}>
            <div className={style.page} id={"editorPage"} ref={editorPageRef}>
          {contents.map((value, index: number) => {
              return (
                <Draggable
                  key={index}
                  draggableId={'content-'+String(index)}
                  index={index}
                  disableInteractiveElementBlocking={true}
                >
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                    >
                      <Block callPageReload={callPageReload} key={index} index={index}
                      />
                    </div>
                  )}
                </Draggable>
              );
            })}
        {provided.placeholder}

          </div>
            {/* {!reloadEditorData && ( */}
            {/* <div>{counter}</div> */}


            <div className={style.page_background}>
              <div className={style.background}></div>
            </div>

            </div>

            {/* )} */}
          </>
          )}



      </Droppable>
    </DragDropContext>
  );
};

export default Content;
