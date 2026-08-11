import Button from "components/button/Button";

type Props = {
  isCreating?: boolean;
  onCreate: () => void | Promise<unknown>;
};

/**
 * 수업에 보드가 없을 때 생성 CTA
 */
const SyllabusBoardCreatePanel = ({ isCreating, onCreate }: Props) => {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "40px 20px",
      }}
    >
      <p
        style={{
          color: "var(--text-color-2)",
          fontSize: "14px",
          marginBottom: "16px",
          lineHeight: 1.6,
        }}
      >
        이 수업에 연결된 보드가 없습니다.
        <br />
        보드를 만들면 활동·문서·채팅 탭이 추가됩니다.
      </p>
      <Button type="ghost" onClick={onCreate} disabled={isCreating}>
        {isCreating ? "생성 중..." : "수업 보드 만들기"}
      </Button>
    </div>
  );
};

export default SyllabusBoardCreatePanel;
