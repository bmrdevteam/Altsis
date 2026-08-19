declare module "*.scss" {
  const content: { [className: string]: string };
  export = content;
}
declare module "*.jpeg";
declare module "*.png";
declare module "*.data.tsx";
declare module "*.mp3";

declare module "@emoji-mart/react" {
  import { ComponentType } from "react";
  const Picker: ComponentType<{
    data?: unknown;
    locale?: string;
    theme?: string;
    previewPosition?: string;
    skinTonePosition?: string;
    onEmojiSelect?: (emoji: { native?: string }) => void;
  }>;
  export default Picker;
}

declare module "@emoji-mart/data" {
  const data: unknown;
  export default data;
}

interface Window {
  handleGoogleLogin: any;
}
