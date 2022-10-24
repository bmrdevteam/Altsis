import Button from "components/button/Button";
import Input from "../../../../../../components/input/Input";
import Select from "../../../../../../components/select/Select";
import style from "style/pages/admin/schools/schools.module.scss";

type Props = {
  seasonData: any;
};

function Basic(props: Props) {
  const years = () => {
    let result: { text: string; value: number }[] = [];
    const date = new Date();
    const currentYear = date.getFullYear();

    for (let i = 2000; i < currentYear + 50; i++) {
      result.push({ text: i.toString(), value: i });
    }

    return result;
  };
  return (
    <div>
      <div className={style.popup}>
        <div className={style.row}>
          <Select
            style={{ minHeight: "30px" }}
            label="년도 선택"
            defaultSelected={parseInt(props.seasonData.year) - 2000}
            required
            options={years()}
            appearence={"flat"}
          />
          <Input
            style={{ maxHeight: "30px" }}
            defaultValue={props.seasonData.term}
            inputStyle="flat"
            label="학기"
            onChange={(e: any) => {
              //   setTermName(e.target.value);
            }}
            required
          />
        </div>
        <Button
          type={"ghost"}
          disableOnclick
          onClick={() => {}}
          styles={{
            borderRadius: "4px",
            marginTop: "24px",
            height: "32px",
            boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
          }}
        >
          저장
        </Button>
      </div>
    </div>
  );
}

export default Basic;
