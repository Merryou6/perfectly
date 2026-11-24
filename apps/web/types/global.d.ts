/// <reference types="@tarojs/taro" />

declare module "*.png";
declare module "*.jpg";
declare module "*.jpeg";
declare module "*.gif";
declare module "*.svg";
declare module "*.css";

declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: "development" | "production";
    TARO_ENV: "h5";
    TARO_APP_API_BASE?: string;
  }
}

declare const defineAppConfig: (config: {
  pages: string[];
  window?: Record<string, unknown>;
}) => {
  pages: string[];
  window?: Record<string, unknown>;
};

declare const definePageConfig: (config: Record<string, unknown>) => Record<string, unknown>;
declare const __API_BASE__: string;
