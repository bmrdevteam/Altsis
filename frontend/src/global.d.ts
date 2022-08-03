declare module "*.scss" {
  const content: { [className: string]: string };
  export = content;
}
declare module "*.jpeg";
declare module "*.data.tsx";

interface Window {
  handleGoogleLogin: any;
}
