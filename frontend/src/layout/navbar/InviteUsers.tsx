import { useState, useEffect } from "react";
import { useAuth } from "contexts/authContext";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import { TChatRoom, TChatUser } from "types/chat";
import Popup from "components/popup/Popup";
import Button from "components/button/Button";
import style from "./chat.module.scss";

type Props = {
  room: TChatRoom;
  onClose: () => void;
  onInvited: () => void;
};

const InviteUsers = ({ room, onClose, onInvited }: Props) => {
  const { currentSchool } = useAuth();
  const { ChatAPI } = useAPIv2();

  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<TChatUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<TChatUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInviting, setIsInviting] = useState(false);

  // Existing participant IDs to exclude from search results
  const existingUserIds = room.participants.map((p) => p.user);

  const searchUsers = async (query: string) => {
    setIsLoading(true);
    try {
      const { users } = await ChatAPI.RChatUsers({
        query: {
          q: query || undefined,
          sid: currentSchool?.school || undefined,
        },
      });
      // Filter out existing participants
      const filteredUsers = users.filter(
        (u) => !existingUserIds.includes(u._id)
      );
      setUsers(filteredUsers);
    } catch (err) {
      ALERT_ERROR(err);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    searchUsers("");
  }, []);

  useEffect(() => {
    const debounce = setTimeout(() => {
      searchUsers(searchQuery);
    }, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

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

  const handleInvite = async () => {
    if (selectedUsers.length === 0) return;

    setIsInviting(true);
    try {
      await ChatAPI.CChatRoomParticipants({
        params: { roomId: room._id },
        data: {
          participants: selectedUsers.map((user) => ({
            user: user._id,
            userId: user.userId,
            userName: user.userName,
            profile: user.profile,
          })),
        },
      });
      onInvited();
    } catch (err) {
      ALERT_ERROR(err);
      setIsInviting(false);
    }
  };

  return (
    <Popup
      setState={onClose}
      title="사용자 초대"
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
              {searchQuery
                ? "검색 결과가 없습니다"
                : "초대할 수 있는 사용자가 없습니다"}
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
                <div className={style.user_info}>
                  <div className={style.user_name}>{user.userName}</div>
                  <div className={style.user_id}>{user.userId}</div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Invite Button */}
        <div className={style.action_buttons}>
          <Button
            type="solid"
            disabled={selectedUsers.length === 0 || isInviting}
            onClick={handleInvite}
          >
            {isInviting
              ? "초대 중..."
              : `${selectedUsers.length}명 초대하기`}
          </Button>
        </div>
      </div>
    </Popup>
  );
};

export default InviteUsers;
