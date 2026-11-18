// Copia los archivos AMD de Monaco a public/ para servirlos desde la propia app (sin CDN externo).
// Se ejecuta antes de `dev` y `build`; la carpeta destino está en .gitignore.
import { cp, readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const pkg = JSON.parse(await readFile(path.join(root, "node_modules/monaco-editor/package.json"), "utf8"));
const target = path.join(root, "public/monaco");
const marker = path.join(target, "VERSION");

if (existsSync(marker) && (await readFile(marker, "utf8")) === pkg.version) {
  console.log(`monaco-editor ${pkg.version} ya está copiado.`);
} else {
  await mkdir(target, { recursive: true });
  await cp(path.join(root, "node_modules/monaco-editor/min/vs"), path.join(target, "vs"), {
    recursive: true,
  });
  await writeFile(marker, pkg.version);
  console.log(`monaco-editor ${pkg.version} copiado a public/monaco.`);
}
