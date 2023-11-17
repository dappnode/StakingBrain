import path from "path";
import { fileURLToPath } from "url";
import nodeExternals from "webpack-node-externals";

const { NODE_ENV = "production" } = process.env;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const paths = {
  // Source files
  src: path.resolve(__dirname, "./src"),
  // Production build files
  build: path.resolve(__dirname, "./dist"),
};

export default {
  entry: paths.src + "/index.ts",
  mode: NODE_ENV,
  output: {
    path: paths.build,
    filename: "index.js",
    publicPath: "",
  },
  experiments: {
    topLevelAwait: true,
    outputModule: true,
  },
  externals: [nodeExternals(), "express", "ethers"],
  externalsPresets: { node: true },
  target: "node18.13",
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
    extensionAlias: {
      ".js": [".ts", ".js"],
      ".cjs": [".cts", ".cjs"],
      ".mjs": [".mts", ".mjs"],
    },
  },
  stats: {
    errors: true,
    errorDetails: true,
  },
  module: {
    rules: [
      {
        test: /\.([cm]?ts|tsx)$/,
        loader: "ts-loader",
        exclude: [/node_modules/],
      },
    ],
  },
  optimization: {
    // Minimization does not provide great disk space savings, but reduces debug capacity
    minimize: false,
  },
  devtool: "source-map",
};
