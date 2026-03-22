module.exports = {
  root: true,
  extends: ["expo"],
  env: {
    browser: true,
  },
  ignorePatterns: ["node_modules/", "android/", "ios/", "dist/"],
  settings: {
    "import/resolver": {
      "babel-module": {},
      node: {
        extensions: [".js", ".jsx", ".ts", ".tsx"],
      },
    },
  },
};
