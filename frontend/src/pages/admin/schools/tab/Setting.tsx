import React from "react";
import Divider from "../../../../components/divider/Divider";
import ToggleSwitch from "../../../../components/toggleSwitch/ToggleSwitch";

type Props = {};

const Setting = (props: Props) => {
  return (
    <div>
      <div style={{ height: "24px" }}></div>
      <div style={{ display: "flex", gap: "24px", maxWidth: "500px" }}>
        <div style={{ flex: "1 1 0" }}>
          <div style={{ fontWeight: 500 }}>항상 이름만 사용</div>
          <div style={{ fontSize: "12px", padding: "4px 0" }}>이름 됨</div>
        </div>
        <div>
          <ToggleSwitch />
        </div>
      </div>
      <Divider />
ƒ
      <div style={{ display: "flex", gap: "24px", maxWidth: "500px" }}>
        <div style={{ flex: "1 1 0" }}>
          <div style={{ fontWeight: 500 }}>dma</div>
          <div style={{ fontSize: "12px", padding: "4px 0" }}>
            a quite log destcription asd afdqwegty etr hewr gh2 er grew r
            qsdfqwrgk kjlakd jskadjf alkj qwlkjv sakjfaqwjgwbfvkqknw qwdf
          </div>
        </div>
        <div>
          <ToggleSwitch defaultChecked />
        </div>
      </div>
      <Divider />
      <div style={{ display: "flex", gap: "24px", maxWidth: "500px" }}>
        <div style={{ flex: "1 1 0" }}>
          <div style={{ fontWeight: 500 }}>중복 허용</div>
          <div style={{ fontSize: "12px", padding: "4px 0" }}>중복 됨</div>
        </div>
        <div>
          <ToggleSwitch />
        </div>
      </div>
    </div>
  );
};

export default Setting;
