import Calendar from "components/calendarV2/Calendar";

type Props = {
  user: any;
};

const ScheduleTab = (props: Props) => {
  if (!props.user?._id) return null;
  const alterLabel = props.user.userName
    ? `${props.user.userName} · 일정`
    : "조회 대상 일정";
  return (
    <div style={{ backgroundColor: "white" }}>
      <Calendar
        key={props.user._id}
        userId={props.user._id}
        readOnly
        alterLabel={alterLabel}
      />
    </div>
  );
};

export default ScheduleTab;
