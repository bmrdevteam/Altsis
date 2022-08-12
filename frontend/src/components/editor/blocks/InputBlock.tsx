import style from "../editor.module.scss";
import { IInputBlock } from "../type";




const InputBlock = ({block}: {block:IInputBlock}) => {
  return (
    <div className={style.input}>
      <input className={style.input_tag} required={block.data.required} type="text" placeholder={block.data.placeholder} />
      <label className={style.lable}>이름을 입력하시오</label>
    </div>
  )
}

export default InputBlock