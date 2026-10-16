// Construit l'interface dans www/ (utilisé par Capacitor pour l'app Android).
// `node build.mjs --serve` lance aussi un serveur local pour tester dans Chrome.
import * as esbuild from "esbuild";
import { cpSync, mkdirSync, rmSync } from "node:fs";

rmSync("www", { recursive: true, force: true });
mkdirSync("www");
cpSync("public", "www", { recursive: true });

const options = {
  entryPoints: ["src/main.js"],
  bundle: true,
  format: "esm",
  target: ["chrome100"],
  outfile: "www/app.js",
  minify: !process.argv.includes("--serve"),
  logLevel: "info",
};

if (process.argv.includes("--serve")) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
  const { port } = await ctx.serve({ servedir: "www", port: 3000 });
  console.log(`Ouvre http://localhost:${port} dans Chrome`);
} else {
  await esbuild.build(options);
}
