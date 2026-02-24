import { useEffect, useState } from "react";
import style from "./altBoard.module.scss";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import Button from "components/button/Button";
import MarkdownViewer from "components/markdown/MarkdownViewer";

type Props = {
  postId: string;
  onClose: () => void;
};

type MergeResult = {
  userId: string;
  userName: string;
  content: string;
};

const BatchPrintView = ({ postId, onClose }: Props) => {
  const { PostAPI } = useAPIv2();

  const [results, setResults] = useState<MergeResult[]>([]);
  const [title, setTitle] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    PostAPI.RPostMergeBatch({ params: { _id: postId } })
      .then(({ results: data, title: t }) => {
        setResults(data);
        setTitle(t);
        setIsLoading(false);
      })
      .catch((err) => {
        ALERT_ERROR(err);
        setIsLoading(false);
      });
  }, [postId]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadAll = () => {
    const allContent = results
      .map((r) => `# ${r.userName} (${r.userId})\n\n${r.content}`)
      .join("\n\n---\n\n");
    const blob = new Blob([allContent], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title || "문서"}_일괄.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) return null;

  return (
    <div className={style.batchPrintOverlay}>
      <div className={style.batchPrintToolbar}>
        <span style={{ fontWeight: 600 }}>
          일괄 인쇄 미리보기 ({results.length}명)
        </span>
        <div style={{ display: "flex", gap: "8px" }}>
          <Button
            type="ghost"
            onClick={handleDownloadAll}
            style={{ fontSize: "13px" }}
          >
            전체 .md 다운로드
          </Button>
          <Button
            type="ghost"
            onClick={handlePrint}
            style={{ fontSize: "13px" }}
          >
            인쇄
          </Button>
          <Button
            type="ghost"
            onClick={onClose}
            style={{ fontSize: "13px" }}
          >
            닫기
          </Button>
        </div>
      </div>

      <div className={style.batchPrintContent}>
        {results.map((r, i) => (
          <div key={i} className={style.batchPrintPage}>
            <div className={style.batchPrintPageHeader}>
              {r.userName} ({r.userId})
            </div>
            <MarkdownViewer content={r.content} />
          </div>
        ))}
        {results.length === 0 && (
          <div className={style.trackerEmpty}>
            렌더링할 데이터가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
};

export default BatchPrintView;
