import { useRef, useState } from "react";
import style from "./altBoard.module.scss";
import { TFormDocLink } from "types/altForm";
import { mergeOgIntoLink, sanitizeHttpUrl } from "./formDocLink";
import useAPIv2 from "hooks/useAPIv2";
import Popup from "components/popup/Popup";
import Button from "components/button/Button";

type Props = {
  onClose: () => void;
  onAdd: (link: TFormDocLink) => void;
};

const LinkAttachModal = ({ onClose, onAdd }: Props) => {
  const { PostAPI } = useAPIv2();
  const [urlDraft, setUrlDraft] = useState("");
  const [titleDraft, setTitleDraft] = useState("");
  const [urlError, setUrlError] = useState("");
  const [adding, setAdding] = useState(false);
  const addToken = useRef(0);

  const close = () => {
    addToken.current += 1;
    onClose();
  };

  const handleAdd = async () => {
    const url = sanitizeHttpUrl(urlDraft);
    if (!url) {
      setUrlError("http:// 또는 https:// 로 시작하는 주소를 입력하세요.");
      return;
    }
    const token = addToken.current;
    setAdding(true);
    setUrlError("");
    try {
      let og = {};
      try {
        og = await PostAPI.RPostOgMeta({ query: { url } });
      } catch {
        og = {};
      }
      if (token !== addToken.current) return;
      onAdd(mergeOgIntoLink({ title: titleDraft.trim(), url }, og));
    } finally {
      if (token === addToken.current) setAdding(false);
    }
  };

  return (
    <Popup
      title="링크 첨부"
      setState={close}
      closeBtn
      style={{ maxWidth: "420px", width: "100%" }}
      footer={
        <div className={style.docLinkModalFooter}>
          <Button type="ghost" onClick={close} disabled={adding}>
            취소
          </Button>
          <Button
            onClick={handleAdd}
            disabled={adding || !urlDraft.trim()}
            loading={adding}
          >
            첨부
          </Button>
        </div>
      }
    >
      <div className={style.docLinkModal}>
        <input
          className={style.docLinkInput}
          type="url"
          placeholder="https://example.com"
          value={urlDraft}
          onChange={(e) => {
            setUrlDraft(e.target.value);
            if (urlError) setUrlError("");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
          aria-label="링크 주소"
          autoFocus
        />
        <input
          className={style.docLinkInput}
          type="text"
          placeholder="제목 (선택)"
          value={titleDraft}
          onChange={(e) => setTitleDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
          aria-label="링크 제목"
        />
        {urlError && <p className={style.docLinkError}>{urlError}</p>}
      </div>
    </Popup>
  );
};

export default LinkAttachModal;
