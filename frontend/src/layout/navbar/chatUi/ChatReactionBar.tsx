import { TChatReaction } from "./chatMessageExtras";
import Svg from "assets/svg/Svg";
import style from "./chatUi.module.scss";

type Props = {
  reactions?: TChatReaction[];
  currentUserId?: string;
  onToggle: (emoji: string) => void;
  onAdd: (anchor: DOMRect) => void;
  disabled?: boolean;
  alignEnd?: boolean;
};

const ChatReactionBar = ({
  reactions = [],
  currentUserId,
  onToggle,
  onAdd,
  disabled,
  alignEnd,
}: Props) => {
  if (disabled) return null;
  if (!reactions.length) return null;

  return (
    <div
      className={`${style.reactionBar} ${
        alignEnd ? style.reactionBarEnd : ""
      }`}
    >
      {reactions.map((group) => {
        const mine = group.users.some((user) => user.user === currentUserId);
        const names = group.users.map((user) => user.userName).filter(Boolean);
        return (
          <button
            key={group.emoji}
            type="button"
            className={`${style.reactionChip} ${
              mine ? style.reactionChipMine : ""
            }`}
            title={names.join(", ")}
            aria-pressed={mine}
            aria-label={`${group.emoji} ${group.users.length}명${
              mine ? ", 내 리액션" : ""
            }`}
            onClick={() => onToggle(group.emoji)}
          >
            <span>{group.emoji}</span>
            <span>{group.users.length}</span>
          </button>
        );
      })}
      <button
        type="button"
        className={style.reactionAdd}
        title="리액션 추가"
        aria-label="리액션 추가"
        onClick={(e) => onAdd(e.currentTarget.getBoundingClientRect())}
      >
        <Svg type="plus" width="12px" height="12px" />
      </button>
    </div>
  );
};

export default ChatReactionBar;
