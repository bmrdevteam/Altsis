import Calendar from "components/calendarV2/Calendar";

type Props = {
  user: any;
};

const ScheduleTab = (props: Props) => {
  if (!props.user?._id) return null;
  return (
    <div style={{ backgroundColor: "white" }}>
      <Calendar key={props.user._id} userId={props.user._id} readOnly />
    </div>
  );
};

export default ScheduleTab;
