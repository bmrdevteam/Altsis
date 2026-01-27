import { useState, useEffect } from "react";
import { useAuth } from "contexts/authContext";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import { TChatRoom, TChatUser } from "types/chat";
import Popup from "components/popup/Popup";
import Button from "components/button/Button";
import style from "./chat.module.scss";

type Props = {
  onClose: () => void;
  onChatCreated: (room: TChatRoom) => void;
};

const NewChat = ({ onClose, onChatCreated }: Props) => {
  const { currentUser, currentSchool } = useAuth();
  const { ChatAPI } = useAPIv2();

  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<TChatUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const searchUsers = async (query: string) => {
    setIsLoading(true);
    try {
      const { users } = await ChatAPI.RChatUsers({
        query: {
          q: query || undefined,
          sid: currentSchool?.school || undefined,
        },
      });
      setUsers(users);
    } catch (err) {
      ALERT_ERROR(err);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    // Initial load with current school filter
    searchUsers("");
  }, []);

  useEffect(() => {
    const debounce = setTimeout(() => {
      searchUsers(searchQuery);
    }, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const handleUserSelect = async (user: TChatUser) => {
    setIsCreating(true);
    try {
      const { room, existing } = await ChatAPI.CChatRoom({
        data: {
          type: "direct",
          participants: [
            {
              user: user._id,
              userId: user.userId,
              userName: user.userName,
              profile: user.profile,
            },
          ],
        },
      });
      onChatCreated(room);
    } catch (err) {
      ALERT_ERROR(err);
      setIsCreating(false);
    }
  };

  return (
    <Popup
      setState={onClose}
      title="새 채팅"
      closeBtn
      style={{ maxWidth: "400px", width: "100%" }}
    >
      <div className={style.new_chat}>
        <div className={style.search_container}>
          <input
            type="text"
            placeholder="이름 또는 아이디로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
        </div>

        <div className={style.users_list}>
          {isLoading ? (
            <div className={style.loading}>검색 중...</div>
          ) : users.length === 0 ? (
            <div className={style.empty}>
              {searchQuery ? "검색 결과가 없습니다" : "사용자가 없습니다"}
            </div>
          ) : (
            users.map((user) => (
              <div
                key={user._id}
                className={style.user_item}
                onClick={() => !isCreating && handleUserSelect(user)}
              >
                <div className={style.user_info}>
                  <div className={style.user_name}>{user.userName}</div>
                  <div className={style.user_id}>{user.userId}</div>
                </div>
                <Button
                  type="ghost"
                  disabled={isCreating}
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    handleUserSelect(user);
                  }}
                >
                  채팅
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    </Popup>
  );
};

export default NewChat;
