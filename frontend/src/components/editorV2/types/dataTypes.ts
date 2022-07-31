export interface IBlock {
  id: string;
  type: "heading" | "paragraph" | "table" | "divider" ;
  data?: {
    text: string;
  };
}
export interface IParagraphBlock extends IBlock {
  data: {
    text: string;
  };
}
export interface IHeadingBlock extends IBlock {
  data: {
    text: string;
  };
}
export interface IMenuItem {
  icon: JSX.Element;
  text: string;
}

export interface IAppearanceMenuItem extends Omit<IMenuItem, "text"> {}
