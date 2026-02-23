import { useState, useEffect, useCallback } from "react";
import { useAuth } from "contexts/authContext";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import { TChatRoom, TChatUser } from "types/chat";
import Popup from "components/popup/Popup";
import Button from "components/button/Button";
import defaultProfilePic from "assets/img/default_profile.png";
import style from "./chat.module.scss";

type Props = {
  onClose: () => void;
  onChatCreated: (room: TChatRoom) => void;
};

const NewChat = ({ onClose, onChatCreated }: Props) => {
  const { currentUser, currentSchool, currentRegistration } = useAuth();
  const { ChatAPI } = useAPIv2();

  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<TChatUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<TChatUser[]>([]);
  const [groupName, setGroupName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const searchUsers = useCallback(
    async (query: string) => {
      setIsLoading(true);
      try {
        const { users } = await ChatAPI.RChatUsers({
          query: {
            q: query || undefined,
            sid: currentSchool?.school || undefined,
            seasonId: currentRegistration?.season || undefined,
          },
        });
        setUsers(users);
      } catch (err) {
        ALERT_ERROR(err);
      }
      setIsLoading(false);
    },
    [currentSchool?.school, currentRegistration?.season]
  );

  useEffect(() => {
    const debounce = setTimeout(() => {
      searchUsers(searchQuery);
    }, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, searchUsers]);

  useEffect(() => {
    if (currentUser) {
      if (selectedUsers.length > 0) {
        const participantNames = selectedUsers.map((u) => u.userName);
        const allNames = [currentUser.userName, ...participantNames].join(
          ", "
        );
        setGroupName(allNames);
      } else {
        setGroupName("");
      }
    }
  }, [selectedUsers, currentUser]);

  const toggleUserSelection = (user: TChatUser) => {
    setSelectedUsers((prev) => {
      const isSelected = prev.some((u) => u._id === user._id);
      if (isSelected) {
        return prev.filter((u) => u._id !== user._id);
      }
      return [...prev, user];
    });
  };

  const removeSelectedUser = (userId: string) => {
    setSelectedUsers((prev) => prev.filter((u) => u._id !== userId));
  };

  const isUserSelected = (userId: string) => {
    return selectedUsers.some((u) => u._id === userId);
  };

  const handleCreateChat = async () => {
    if (selectedUsers.length === 0) return;

    setIsCreating(true);
    try {
      const isDirect = selectedUsers.length === 1;
      const { room } = await ChatAPI.CChatRoom({
        data: {
          type: isDirect ? "direct" : "group",
          participants: selectedUsers.map((user) => ({
            user: user._id,
            userId: user.userId,
            userName: user.userName,
            profile: user.profile,
          })),
          name: isDirect ? undefined : groupName || undefined,
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
        {/* Selected Users Preview */}
        {selectedUsers.length > 0 && (
          <div className={style.selected_users}>
            {selectedUsers.map((user) => (
              <div key={user._id} className={style.selected_user}>
                <span>{user.userName}</span>
                <span
                  className={style.remove}
                  onClick={() => removeSelectedUser(user._id)}
                >
                  ×
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Search Input */}
        <div className={style.search_container}>
          <input
            type="text"
            placeholder="이름 또는 아이디로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
        </div>

        {/* Users List */}
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
                className={`${style.user_item} ${
                  isUserSelected(user._id) ? style.selected : ""
                }`}
                onClick={() => toggleUserSelection(user)}
              >
                <div className={style.checkbox}>
                  <input
                    type="checkbox"
                    checked={isUserSelected(user._id)}
                    onChange={() => {}}
                  />
                </div>
                <img
                  src={user.profile || defaultProfilePic}
                  alt={user.userName}
                  className={style.user_avatar}
                />
                <div className={style.user_info}>
                  <div className={style.user_name}>{user.userName}</div>
                  <div className={style.user_id}>{user.userId}</div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Create Button */}
        <div className={style.action_buttons}>
          <Button
            type="solid"
            disabled={selectedUsers.length === 0 || isCreating}
            onClick={handleCreateChat}
          >
            {isCreating ? "생성 중..." : "채팅 시작"}
          </Button>
        </div>
      </div>
    </Popup>
  );
};

export default NewChat;
