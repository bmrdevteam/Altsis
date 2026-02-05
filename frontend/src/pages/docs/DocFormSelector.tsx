import Popup from "components/popup/Popup";
import Svg from "assets/svg/Svg";
import { useState } from "react";
import style from "style/pages/docs/docs.module.scss";

type Props = {
  forms: { _id: string; title: string }[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  setState: (v: boolean) => void;
};

const DocFormSelector = (props: Props) => {
  const [searchText, setSearchText] = useState<string>("");

  const filteredForms = props.forms.filter((form) =>
    form.title.toLowerCase().includes(searchText.toLowerCase())
  );

  const isSelected = (id: string) => props.selectedIds.includes(id);

  const toggleForm = (id: string) => {
    if (isSelected(id)) {
      props.onSelectionChange(props.selectedIds.filter((sid) => sid !== id));
    } else {
      props.onSelectionChange([...props.selectedIds, id]);
    }
  };

  const selectAll = () => {
    props.onSelectionChange(props.forms.map((f) => f._id));
  };

  const deselectAll = () => {
    props.onSelectionChange([]);
  };

  return (
    <Popup
      setState={props.setState}
      title="문서 관리"
      closeBtn
      contentScroll
      style={{ maxWidth: "480px", width: "100%" }}
    >
      <div className={style.selectorSearch}>
        <input
          type="text"
          placeholder="문서 검색..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className={style.selectorInput}
        />
      </div>

      <div className={style.selectorHeader}>
        <span className={style.selectorCount}>
          {props.selectedIds.length} / {props.forms.length} 선택됨
        </span>
        <div className={style.selectorActions}>
          <span className={style.selectorActionBtn} onClick={selectAll}>
            전체 선택
          </span>
          <span className={style.selectorActionBtn} onClick={deselectAll}>
            전체 해제
          </span>
        </div>
      </div>

      <div className={style.selectorList}>
        {filteredForms.map((form) => (
          <div
            key={form._id}
            className={`${style.selectorItem} ${
              isSelected(form._id) ? style.selectorItemSelected : ""
            }`}
            onClick={() => toggleForm(form._id)}
          >
            <div
              className={style.selectorCheckbox}
              style={{
                backgroundColor: isSelected(form._id)
                  ? "var(--accent-1)"
                  : "transparent",
                border: `2px solid ${
                  isSelected(form._id) ? "var(--accent-1)" : "var(--accent-4)"
                }`,
              }}
            >
              {isSelected(form._id) && (
                <Svg
                  type="check"
                  width="10px"
                  height="10px"
                  style={{ fill: "var(--background-color)" }}
                />
              )}
            </div>
            <span className={style.selectorItemTitle}>{form.title}</span>
          </div>
        ))}
        {filteredForms.length === 0 && (
          <div className={style.selectorEmpty}>검색 결과가 없습니다.</div>
        )}
      </div>
    </Popup>
  );
};

export default DocFormSelector;
