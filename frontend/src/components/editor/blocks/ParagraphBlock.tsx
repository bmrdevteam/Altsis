
import style from "../editor.module.scss";
import { IParagraphBlock } from "../type";


const Paragraphblock = ({ block }: { block: IParagraphBlock }) => {
  

  return (
    <input
      className={style.paragraph}
      defaultValue={block.data.text}  
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
      {/* {block.data.text} */}
    </input>
  );
};

export default Paragraphblock;
