/**
 * 보드 채팅 읽음 완료 후 Navbar Chat.loadRooms만 다시 돌리기 위한 최소 이벤트.
 * new_message / 열린 방 억제 / 낙관적 뱃지 로직은 넣지 않는다.
 */

const EVENT = "altsis:chat-rooms-reload";

export function requestChatRoomsReload() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function subscribeChatRoomsReload(handler: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }
  const onEvent = () => handler();
  window.addEventListener(EVENT, onEvent);
  return () => window.removeEventListener(EVENT, onEvent);
}
