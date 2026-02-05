import Calendar from "components/calendarV2/Calendar";

type Props = {
  user: any;
};

const ScheduleTab = (props: Props) => {
  return (
    <div style={{ backgroundColor: "white" }}>
      <Calendar userId={props.user?._id} readOnly />
    </div>
  );
};

export default ScheduleTab;
