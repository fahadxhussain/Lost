const fs = require("node:fs");
const path = require("node:path");
const babel = require("@babel/core");
const root = path.resolve(__dirname, "..");
function files(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((item) =>
      item.isDirectory()
        ? files(path.join(dir, item.name))
        : [path.join(dir, item.name)],
    );
}
const sources = [
  path.join(root, "App.js"),
  ...files(path.join(root, "src")).filter((file) => file.endsWith(".js")),
];
for (const file of sources) {
  const source = fs.readFileSync(file, "utf8");
  babel.transformSync(source, {
    filename: file,
    presets: ["babel-preset-expo"],
  });
  for (const match of source.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
    if (match[1].startsWith(".")) {
      const target = path.resolve(path.dirname(file), match[1]);
      if (
        ![target, `${target}.js`, path.join(target, "index.js")].some((p) =>
          fs.existsSync(p),
        )
      )
        throw new Error(`Missing import ${match[1]} in ${file}`);
    } else require.resolve(match[1], { paths: [root] });
  }
}
const app = JSON.parse(fs.readFileSync(path.join(root, "app.json"))).expo;
if (app.icon && !fs.existsSync(path.join(root, app.icon)))
  throw new Error("Missing app icon");
console.log(
  `Validated syntax and imports for ${sources.length} source files and Expo configuration.`,
);
