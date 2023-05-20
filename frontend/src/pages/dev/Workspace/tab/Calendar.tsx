import Table from "components/tableV2/Table";
import Button from "components/button/Button";
import { useAuth } from "contexts/authContext";
import useGoogleAPI from "hooks/useGoogleAPI";
import useApi from "hooks/useApi";

export default function Example() {
  const { WorkspaceApi } = useApi();
  const { CalendarAPI } = useGoogleAPI();
  const { currentWorkspace, setCurrentWorkspace } = useAuth();

  return (
    <div
      style={{
        marginTop: "24px",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
      }}
    >
      <Button
        type="ghost"
        onClick={async () => {
          try {
            const items = await CalendarAPI.RCalendars();
            const { workspace } = await WorkspaceApi.UMyWorkspaceCalendars({
              data: {
                items: items.map((item: any) => {
                  return { ...item, isChecked: item.selected };
                }),
              },
            });
            setCurrentWorkspace(workspace);
          } catch (err) {
            alert("ERROR!");
          }
        }}
      >
        {currentWorkspace.calendars ? "캘린더 동기화하기" : "캘린더 연결하기"}
      </Button>
      {currentWorkspace.calendars && (
        <Button
          type="ghost"
          onClick={async () => {
            try {
              const { workspace } = await WorkspaceApi.DMyWorkspaceCalendars();
              setCurrentWorkspace(workspace);
            } catch (err) {
              alert("ERROR!");
            }
          }}
        >
          {"캘린더 연결 해지하기"}
        </Button>
      )}
      <Table
        type="object-array"
        data={
          currentWorkspace?.calendars?.items.map((item) => {
            item.tableRowChecked = item.isChecked;
            return item;
          }) ?? []
        }
        onChange={async (items) => {
          const { workspace } = await WorkspaceApi.UMyWorkspaceCalendars({
            data: {
              items: items.map((item) => {
                return { ...item, isChecked: item.tableRowChecked };
              }),
            },
          });
          setCurrentWorkspace(workspace);
        }}
        header={[
          {
            text: "checkbox",
            key: "",
            type: "checkbox",
            width: "48px",
          },
          {
            text: "summary",
            key: "summary",
            type: "text",
          },
          {
            text: "id",
            key: "id",
            type: "text",
          },
          {
            text: "backgroundColor",
            key: "backgroundColor",
            type: "text",
          },
        ]}
      />
    </div>
  );
}
