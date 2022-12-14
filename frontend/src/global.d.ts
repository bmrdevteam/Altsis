declare module "*.scss" {
  const content: { [className: string]: string };
  export = content;
}
declare module "*.jpeg";
declare module "*.png";
declare module "*.data.tsx";
declare module "*.mp3";

interface Window {
  handleGoogleLogin: any;
}
