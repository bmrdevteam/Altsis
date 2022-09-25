import { createContext, useContext, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import useDatabase from "../../../hooks/useDatabase";
import useEditor from "./useEditor";
import useStyleFunctions from "./useStyleFunctions";

const EditorContext = createContext<any>(null);

export function useEditorFunctions() {
  return useContext(EditorContext);
}

export const EditorFunctionProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  /**
   * get the page id
   */
  const { pid } = useParams<"pid">();
  /**
   * database hook
   */
  const database = useDatabase();
  /**
   * form title for the current form
   */
  const [formTitle, setFormTitle] = useState<string>();
  /**
   * form type for the current form
   */
  const [formType, setFormType] = useState<string>();
  /**
   * stat for the form data from the backend
   */

  const [updateFormData, setUpdateFormData] = useState<boolean>(true);
  /**
   * get the form data from the backend
   * @async
   */
  async function getFormData() {
    const { form: result } = await database.R({ location: `forms/${pid}` });
    return result;
  }
  /**
   * save the form data to the backend
   */
  async function saveFormData() {
    await database.U({
      location: `forms/${pid}`,
      data: {
        new: {
          type: formType,
          title: formTitle,
          data: editor.result(),
        },
      },
    });
  }

  useEffect(() => {
    /**
     * if the updateFormData is TRUE
     */
    updateFormData &&
      getFormData().then((res) => {
        /**
         * set the updateFormData to FALSE
         */
        setUpdateFormData(false);
        /**
         * set the form title
         */
        setFormTitle(res.title);
        /**
         * set the form type
         */
        setFormType(res.type);
        /**
         * pass in the initial data to the editor hook
         */
        editor.initalData(res.data);

        /**
         * set the document title to the current form title
         */
        document.title = res?.title;
      });

    return () => {};
  }, [updateFormData]);

  let updateCounter = 0;

  const editor = useEditor(() => {
    console.log("update");

    if (updateCounter >= 5) {
      // reset the counter
      updateCounter = 0;
      /**
       * count to 5 updates before saving to the backend
       */
      saveFormData();
    } else {
      //increase the counter
      updateCounter += 1;
    }
  });


  const value = {
    editor,
    formTitle,
    setFormTitle,
    formType,
    setFormType,
    saveFormData,
  };
  return (
    <EditorContext.Provider value={value}>
      {!updateFormData ? (
        children
      ) : (
        <div
          style={{
            height: "100vh",
            width: "100vw",
            position: "fixed",
            top: 0,
            left: 0,
            backgroundColor: "var(--background-color)",
          }}
        >
          로딩중
        </div>
      )}
    </EditorContext.Provider>
  );
};
