import "react";

declare module "react" {
  interface HTMLAttributes<T> {
    placeholder?: string;
  }
}

declare global {
  var SUCCESS_MESSAGE: string;
}
export {};
