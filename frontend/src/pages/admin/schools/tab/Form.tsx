import React, { useState } from "react";
import Svg from "../../../../assets/svg/Svg";
import Button from "../../../../components/button/Button";
import Input from "../../../../components/input/Input";
import Popup from "../../../../components/popup/Popup";
import Select from "../../../../components/select/Select";
import useDatabase from "../../../../hooks/useDatabase";
import style from "../../../../style/pages/admin/schools/schools.module.scss";

type Props = {};

const Form = (props: Props) => {
  const database = useDatabase();
  const [activeMenuIndex, setAciveMenuIndex] = useState<number>(0);
  const [addFormPopupActive, setAddFormPopupActive] = useState<boolean>(false);

  async function addForm() {
    await database.C({
      location: "forms",
      data: { title: "hello2", type: "hello", data: { form: "" } },
    });
  }

  const FormItem = ({ data }: { data: any }) => {
    return (
      <div className={style.item} title={data.title}>
        <div className={style.icon}>
          <Svg type="time" width="32px" height="32px" />
        </div>
        <div className={style.info}>{data.title}</div>
      </div>
    );
  };

  return (
    <>
      <div style={{ marginTop: "24px" }}>
        <div className={style.form_tab}>
          <div className={style.sidemenu}>
            <div className={style.items}>
              <div
                className={`${style.item} ${
                  activeMenuIndex === 0 && style.active
                }`}
                onClick={() => {
                  setAciveMenuIndex(0);
                }}
              >
                시간표
              </div>
              <div
                className={`${style.item} ${
                  activeMenuIndex === 1 && style.active
                }`}
                onClick={() => {
                  setAciveMenuIndex(1);
                }}
              >
                강의 계획서
              </div>
              <div
                className={`${style.item} ${
                  activeMenuIndex === 2 && style.active
                }`}
                onClick={() => {
                  setAciveMenuIndex(2);
                }}
              >
                생기부
              </div>
            </div>
          </div>
          <div className={style.content}>
            <div className={style.items}>
              {/* map from the back end */}
              <div
                className={style.item}
                onClick={() => {
                  setAddFormPopupActive(true);
                }}
              >
                <div className={style.icon}>
                  <Svg type="plus" width="32px" height="32px" />
                </div>
              </div>
              <FormItem data={{ title: "시간표" }} />
              <FormItem data={{ title: "시간표1" }} />
              <FormItem data={{ title: "시간표2" }} />
              <FormItem data={{ title: "시간표3" }} />
              <FormItem data={{ title: "시간표4" }} />
              <FormItem data={{ title: "시간표5" }} />
              <FormItem data={{ title: "시간표6" }} />
              <FormItem data={{ title: "20221Q4-12389" }} />
            </div>
          </div>
        </div>
      </div>
      {addFormPopupActive && (
        <Popup setState={setAddFormPopupActive} title="양식 추가">
          <div
            style={{
              marginTop: "12px",
              display: "flex",
              gap: "24px",
              minWidth: "500px",
            }}
          >
            <Input label="제목" required />
            <Select
              label="양식 종류"
              required
              options={[
                { text: "시간표 양식", value: "" },
                { text: "일반 양식", value: "" },
              ]}
            />
          </div>
          <div style={{ marginTop: "24px" }}>
            <Button
              disableOnclick
              onClick={() => {
                addForm();
              }}
            >
              추가
            </Button>
          </div>
        </Popup>
      )}
    </>
  );
};

export default Form;
