import style from "../../editor.module.scss";

const Menu = ({
  children,
  name,
}: {
  children: React.ReactNode | React.ReactNode[];
  name: string;
}) => {
  return (
    <div className={style.menu}> 
      {/* <div className={style.name}>{name}</div> */}
      <div className={style.content}>{children}</div>
    </div>
  );
};

export default Menu;
