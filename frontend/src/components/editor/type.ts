export interface IEditor {
  id: string;
  blocks: IBlock[];
}

export interface IBlock {
  id: string;
  type: "heading" | "paragraph" | "table" | "divider" | "input";
  data?: {};
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
export interface IInputBlock extends IBlock {
  data: {
    required?: boolean;
    defaultValue?: string;
    placeholder?: string;
    label?: string;
  };
}
export interface ISelectBlock extends IBlock {
  data: {
    required?: boolean;
    defaultSelected?: number;
    options: { value: string | number; text: string }[];
    label?: string;
  };
}

export interface IAutofillBlock extends IBlock {
  data: {
    required?: boolean;
    defaultSelected?: number;
    options: { value: string | number; text: string }[];
    label?: string;
  };
}

export interface ICheckboxBlock extends IBlock {
  data: {
    required: boolean;
    label: string;
  };
}

export interface IMenuItem {
  icon: JSX.Element;
  text: string;
}

export interface IAppearanceMenuItem extends Omit<IMenuItem, "text"> {}
