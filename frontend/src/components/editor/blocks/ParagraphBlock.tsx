
import style from "../editor.module.scss";
import { IParagraphBlock } from "../type";


const Paragraphblock = ({ block }: { block: IParagraphBlock }) => {
  

  return (
    <div
      className={style.paragraph}
      contentEditable={true}
      suppressContentEditableWarning={true}
      onClick={()=>{
        
      }}
      // onSelect={(e) => {
      //   console.log(
      //     window.getSelection()?.toString() !== ""
      //       ? window.getSelection()?.getRangeAt(0).getBoundingClientRect()
      //       : "bluff"
      //   );
      // }}
    >
      {block.data.text}
    </div>
  );
};

export default Paragraphblock;