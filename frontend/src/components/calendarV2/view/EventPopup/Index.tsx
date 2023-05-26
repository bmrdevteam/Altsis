import Input from "components/input/Input";
import Popup from "components/popup/Popup";
import Textarea from "components/textarea/Textarea";

type Props = {
  setState: any;
  event: any;
};

const Index = (props: Props) => {
  return (
    <Popup
      setState={props.setState}
      style={{
        width: "640px",
        display: "flex",
        flexDirection: "column",
      }}
      closeBtn
      title={""}
      contentScroll
    >
      <Input
        appearence="flat"
        type="text"
        defaultValue={""}
        label="제목"
        required
        style={{ marginBottom: "24px" }}
      />
      <div
        style={{
          display: "flex",
          gap: "12px",
          alignItems: "flex-end",
        }}
      >
        <Input
          type="text"
          label="시간"
          appearence="flat"
          defaultValue={""}
          disabled
        />
        <Input
          appearence="flat"
          required
          label={"시간"}
          defaultValue={""}
          disabled
        />

        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <Input type="time" appearence="flat" defaultValue={""} disabled />
          ~
          <Input type="time" appearence="flat" defaultValue={""} disabled />
        </div>
      </div>

      <div style={{ marginTop: "24px" }}>
        <Input
          type="text"
          label="강의실"
          appearence="flat"
          defaultValue={""}
          disabled
        />
      </div>

      <div style={{ marginTop: "24px" }}>
        <Textarea
          label="메모"
          rows={10}
          defaultValue={JSON.stringify(props.event)}
          disabled
        />
      </div>
      <div>
        {[
          "id",
          "type",
          "htmlLink",
          "summary",
          "sequence",
          "calendarSummary",
          "isAllday",
          "startTimeText",
          "endTimeText",
        ].map((field) => (
          <div>{`${field}: ${props.event[field]}`}</div>
        ))}
      </div>
    </Popup>
  );
};

export default Index;
