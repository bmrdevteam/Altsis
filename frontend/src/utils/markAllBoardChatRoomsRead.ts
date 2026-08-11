import { requestChatRoomsReload } from "utils/chatRoomsReload";

type RoomId = { _id: string };

/**
 * 보드의 모든 채팅방을 읽음 처리한 뒤 Navbar 목록 재조회만 요청한다.
 * (이벤트버스·열린 방 억제 없음)
 */
export async function markAllBoardChatRoomsRead(options: {
  listRooms: () => Promise<{ rooms: RoomId[] }>;
  markRoomRead: (roomId: string) => Promise<unknown>;
}): Promise<void> {
  const { rooms } = await options.listRooms();
  await Promise.all(
    rooms.map((room) => options.markRoomRead(room._id).catch(() => {}))
  );
  requestChatRoomsReload();
}
