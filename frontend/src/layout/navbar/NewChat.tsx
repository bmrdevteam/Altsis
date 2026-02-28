import { useState, useEffect, useCallback } from "react";
import { useAuth } from "contexts/authContext";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import { TChatRoom, TChatUser } from "types/chat";
import Popup from "components/popup/Popup";
import Button from "components/button/Button";
import defaultProfilePic from "assets/img/default_profile.png";
import style from "./chat.module.scss";

type Props = {
  rooms: TChatRoom[];
  onClose: () => void;
  onChatCreated: (room: TChatRoom) => void;
};

const NewChat = ({ rooms, onClose, onChatCreated }: Props) => {
  const { currentUser, currentSchool, currentRegistration } = useAuth();
  const { ChatAPI } = useAPIv2();

  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<TChatUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<TChatUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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

  const handleSelectUser = (user: TChatUser) => {
    setSelectedUser((prev) => (prev?._id === user._id ? null : user));
  };

  const handleCreateChat = () => {
    if (!selectedUser || !currentUser) return;

    // Check if a direct room already exists with this user
    const existingRoom = rooms.find(
      (r) =>
        r.type === "direct" &&
        r.participants.some((p) => p.user === selectedUser._id)
    );

    if (existingRoom) {
      onChatCreated(existingRoom);
      return;
    }

    // Create a pending room (not yet saved to DB - will be created on first message)
    const pendingRoom: TChatRoom = {
      _id: "",
      type: "direct",
      participants: [
        {
          user: currentUser._id,
          userId: currentUser.userId,
          userName: currentUser.userName,
          profile: currentUser.profile,
          joinedAt: new Date().toISOString(),
        },
        {
          user: selectedUser._id,
          userId: selectedUser.userId,
          userName: selectedUser.userName,
          profile: selectedUser.profile,
          joinedAt: new Date().toISOString(),
        },
      ],
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onChatCreated(pendingRoom);
  };

  return (
    <Popup
      setState={onClose}
      title="새 메시지"
      closeBtn
      style={{ maxWidth: "400px", width: "100%" }}
    >
      <div className={style.new_chat}>
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
                  selectedUser?._id === user._id ? style.selected : ""
                }`}
                onClick={() => handleSelectUser(user)}
              >
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
            disabled={!selectedUser}
            onClick={handleCreateChat}
          >
            채팅 시작
          </Button>
        </div>
      </div>
    </Popup>
  );
};

export default NewChat;
