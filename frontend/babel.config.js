module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      "babel-preset-expo",
    ],
    plugins: [
      [
        "module-resolver",
        {
          root: ["./"],
          alias: {
            "@":               "./",
            "@components":     "./shared/components",
            "@core":           "./core",
            "@modules":        "./modules",
            "@shared":         "./shared",
            "@infrastructure": "./infrastructure",
            "@assets":         "./assets",
            "@fonts":          "./assets/fonts",
            "@colors":         "./shared/colors",
            "@typography":     "./shared/typography",
            "@utils":          "./shared/utils",
            "@styles":         "./shared/styles"
          },
        },
      ],
    ],
  };
};