import { useState } from "react";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import { TChatRoom } from "types/chat";
import Popup from "components/popup/Popup";
import Button from "components/button/Button";
import style from "./chat.module.scss";

type Props = {
  room: TChatRoom;
  onClose: () => void;
  onUpdated: (room: TChatRoom) => void;
};

const RoomSettings = ({ room, onClose, onUpdated }: Props) => {
  const { ChatAPI } = useAPIv2();

  const [roomName, setRoomName] = useState(room.name || "");
  const [allowInvites, setAllowInvites] = useState(
    room.settings?.allowInvites !== false
  );
  const [allowChat, setAllowChat] = useState(
    room.settings?.allowChat !== false
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { room: updatedRoom } = await ChatAPI.UChatRoom({
        params: { roomId: room._id },
        data: {
          name: roomName || undefined,
          settings: {
            allowInvites,
            allowChat,
          },
        },
      });
      onUpdated(updatedRoom);
    } catch (err) {
      ALERT_ERROR(err);
      setIsSaving(false);
    }
  };

  return (
    <Popup
      setState={onClose}
      title="채팅방 설정"
      closeBtn
      style={{ maxWidth: "400px", width: "100%" }}
    >
      <div className={style.room_settings}>
        {/* Room Name */}
        <div className={style.setting_item}>
          <div className={style.setting_label}>채팅방 이름</div>
          <input
            type="text"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            placeholder="채팅방 이름 입력..."
            className={style.setting_input}
          />
        </div>

        {/* Participants Info */}
        <div className={style.setting_item}>
          <div className={style.setting_label}>참여자</div>
          <div className={style.setting_description}>
            {room.participants.map((p) => p.userName).join(", ")}
          </div>
        </div>

        {/* Allow Invites Toggle */}
        <div className={style.setting_item}>
          <div className={style.setting_left}>
            <div className={style.setting_label}>사용자 초대 허용</div>
            <div className={style.setting_description}>
              모든 참여자가 새로운 사용자를 초대할 수 있습니다.
            </div>
          </div>
          <label className={style.toggle}>
            <input
              type="checkbox"
              checked={allowInvites}
              onChange={(e) => setAllowInvites(e.target.checked)}
            />
            <span className={style.toggle_slider}></span>
          </label>
        </div>

        {/* Allow Chat Toggle */}
        <div className={style.setting_item}>
          <div className={style.setting_left}>
            <div className={style.setting_label}>메시지 전송 허용</div>
            <div className={style.setting_description}>
              모든 참여자가 메시지를 보낼 수 있습니다.
            </div>
          </div>
          <label className={style.toggle}>
            <input
              type="checkbox"
              checked={allowChat}
              onChange={(e) => setAllowChat(e.target.checked)}
            />
            <span className={style.toggle_slider}></span>
          </label>
        </div>

        {/* Save Button */}
        <div className={style.action_buttons}>
          <Button type="solid" disabled={isSaving} onClick={handleSave}>
            {isSaving ? "저장 중..." : "저장"}
          </Button>
        </div>
      </div>
    </Popup>
  );
};

export default RoomSettings;
