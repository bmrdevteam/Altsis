/**
 * @file Editor Component
 *
 * 2022 9/26 - started developing a new editor component due to scalability and more reliable code
 *
 * GOAL
 *  - design the rendering process tobe more simnple
 *  - style the blocks only
 *  - develop with auth states : edit & view
 *  - preview mode for editor
 *
 *
 * @author seedlessapple <luminousseedlessapple@gmail.com>
 *
 * -------------------------------------------------------
 *
 * IN PRODUCTION
 *
 * -------------------------------------------------------
 *
 * IN MAINTENANCE
 *
 * -------------------------------------------------------
 *
 * IN DEVELOPMENT
 * - Editor Component
 *
 * -------------------------------------------------------
 *
 * DEPRECATED
 *
 * -------------------------------------------------------
 *
 * NOTES
 *
 */

import { useState } from "react";

import style from "./editor.module.scss";
import { EditorProvider } from "./functions/editorContext";
import useEditorStore from "./functions/useEditorStore";
import useReload from "./functions/useReload";
import Content from "./layout/Content";
import Header from "./layout/Header";
import Sidebar from "./layout/Sidebar";

type Props = { id: string };

/**
 *
 * @param id the form id
 *
 * @returns
 */
function Editor(props: Props) {
  const { callPageReload, _init } = useReload();
  const { preview } = useEditorStore();

  return (
    <EditorProvider id={props.id}>
      <div className={style.editor}>
        <Header/>
        {!preview && <Sidebar callPageReload={callPageReload} />}
        <Content reloadHook={_init} />
      </div>
    </EditorProvider>
  );
}

export default Editor;
