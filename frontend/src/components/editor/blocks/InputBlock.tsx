import style from "../editor.module.scss";
import { IInputBlock } from "../type";




const InputBlock = ({block}: {block:IInputBlock}) => {
  return (
    <div className={style.input}>
      <label className={style.lable}>이름을 입력하시오</label>
      <input className={style.input_tag} required={block?.data.required} type="text" placeholder={block?.data.placeholder} />
    </div>
  )
}

export default InputBlock