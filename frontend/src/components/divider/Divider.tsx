import React from 'react'

type Props = {}

const Divider = (props: Props) => {
  return (
    <div
    style={{
      width: "100%",
      height: "1px",
      backgroundColor: "rgb(225,225,225)",
      margin: "12px 0",
    }}
  ></div>
  )
}

export default Divider