import Button from "components/button/Button";
import { useAuth } from "contexts/authContext";
import useApi from "hooks/useApi";

export default function Example() {
  const { WorkspaceApi } = useApi();
  const { currentWorkspace, reloadWorkspace, setCurrentWorkspace } = useAuth();

  return (
    <div
      style={{
        marginTop: "24px",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
      }}
    >
      {!currentWorkspace ? (
        <a href={`${process.env.REACT_APP_SERVER_URL}/api/workspaces/auth`}>
          <Button
            type="ghost"
            style={{
              fontSize: "14px",
              padding: "0 18px",
              borderRadius: "4px",
            }}
          >
            연결하기
          </Button>
        </a>
      ) : (
        <>
          <div style={{ marginLeft: "24px" }}>
            <ul>
              <li>id: {currentWorkspace.id}</li>
              <li>email: {currentWorkspace.email}</li>
              <li>
                accessToken:{" "}
                {currentWorkspace.accessToken
                  ? currentWorkspace.accessToken.slice(0, 10) + "..."
                  : "undefined"}
              </li>
              <li>
                expires:{" "}
                {currentWorkspace.expires
                  ? currentWorkspace.expires +
                    ` => ${new Date(currentWorkspace.expires)}`
                  : "undefined"}
              </li>
              <li>
                refreshToken:{" "}
                {currentWorkspace.refreshToken
                  ? currentWorkspace.refreshToken.slice(0, 10) + "..."
                  : "undefined"}
              </li>
            </ul>
          </div>
          <Button
            type="ghost"
            onClick={() => {
              WorkspaceApi.DMyWorkspace().then(() => {
                alert(SUCCESS_MESSAGE);
                setCurrentWorkspace(undefined);
              });
            }}
          >
            해제하기
          </Button>
        </>
      )}
      <Button
        type="ghost"
        onClick={() => {
          reloadWorkspace();
        }}
      >
        Reload
      </Button>
    </div>
  );
}
