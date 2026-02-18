/**
 * @file User List Popup - 사용자 명단 보기 팝업
 *
 * @author
 *
 * -------------------------------------------------------
 *
 * IN PRODUCTION
 *
 * -------------------------------------------------------
 */

import { useEffect, useState } from "react";
import { ALERT_ERROR } from "hooks/useAPIv2";

import Popup from "components/popup/Popup";
import Button from "components/button/Button";

type UserItem = {
  user: string;
  userId: string;
  userName: string;
};

type Props = {
  title: string;
  setState: (state: boolean) => void;
  fetchUsers: () => Promise<{ users: UserItem[] }>;
};

const UserListPopup = ({ title, setState, fetchUsers }: Props) => {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchUsers()
      .then(({ users }) => {
        setUsers(users);
        setIsLoading(false);
      })
      .catch((err) => {
        ALERT_ERROR(err);
        setIsLoading(false);
      });
  }, []);

  return (
    <Popup
      setState={setState}
      title={`${title} (${isLoading ? "..." : users.length}명)`}
      closeBtn
      contentScroll
      style={{ maxWidth: "400px", width: "100%" }}
      footer={
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button type="ghost" onClick={() => setState(false)}>
            닫기
          </Button>
        </div>
      }
    >
      <div>
        {isLoading ? (
          <p
            style={{
              textAlign: "center",
              color: "var(--text-color-2)",
              padding: "20px 0",
            }}
          >
            로딩 중...
          </p>
        ) : users.length === 0 ? (
          <p
            style={{
              textAlign: "center",
              color: "var(--text-color-2)",
              padding: "20px 0",
            }}
          >
            사용자가 없습니다.
          </p>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "2px",
            }}
          >
            {users.map((u) => (
              <div
                key={u.userId}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "8px 12px",
                  borderRadius: "6px",
                }}
              >
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    backgroundColor: "var(--background-color-2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "12px",
                    color: "var(--text-color-2)",
                    flexShrink: 0,
                  }}
                >
                  {u.userName?.charAt(0)}
                </div>
                <div>
                  <span style={{ fontSize: "14px", fontWeight: 500 }}>
                    {u.userName}
                  </span>
                  <span
                    style={{
                      fontSize: "13px",
                      color: "var(--text-color-2)",
                      marginLeft: "4px",
                    }}
                  >
                    ({u.userId})
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Popup>
  );
};

export default UserListPopup;
