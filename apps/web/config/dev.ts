import type { UserConfigExport } from "@tarojs/cli";

export default {
  logger: {
    quiet: false,
    stats: true,
  },
  h5: {
    devServer: {
      host: "0.0.0.0",
      port: 10086,
      allowedHosts: "all",
    },
  },
} satisfies UserConfigExport<"webpack5">;
