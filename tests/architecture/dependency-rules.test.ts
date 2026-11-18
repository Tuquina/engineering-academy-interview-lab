import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Verifica las reglas de dependencia de docs/ARCHITECTURE.md analizando los imports estáticos.
 * Es deliberadamente simple (regex sobre `from "..."`) y sin dependencias: suficiente para imports de ES modules.
 */
const MODULES_DIR = path.resolve(import.meta.dirname, "../../src/modules");

type Layer = "domain" | "application" | "infrastructure" | "presentation";

interface Rule {
  readonly layer: Layer;
  readonly forbidden: readonly RegExp[];
}

const FRAMEWORKS = [/^react($|\/)/, /^react-dom/, /^next($|\/)/];

const RULES: readonly Rule[] = [
  {
    layer: "domain",
    forbidden: [
      ...FRAMEWORKS,
      /^zod$/,
      /^node:/,
      /\/(application|infrastructure|presentation)\//,
      /^@\/(infrastructure|shared\/(ui|layout))/,
    ],
  },
  {
    layer: "application",
    forbidden: [
      ...FRAMEWORKS,
      /\/(infrastructure|presentation)\//,
      /^@\/(infrastructure|shared\/(ui|layout))/,
    ],
  },
  { layer: "infrastructure", forbidden: [/\/presentation\//, /^@\/shared\/(ui|layout)/] },
  { layer: "presentation", forbidden: [/\/infrastructure\//, /^@\/infrastructure/] },
];

function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    return statSync(full).isDirectory() ? listFiles(full) : /\.tsx?$/.test(entry) ? [full] : [];
  });
}

function importsOf(file: string): string[] {
  const source = readFileSync(file, "utf8");
  return [...source.matchAll(/(?:import|export)[^"']*?from\s+["']([^"']+)["']/g)].map((m) => m[1]!);
}

function layerOf(file: string): Layer | null {
  const match = /[\\/](domain|application|infrastructure|presentation)[\\/]/.exec(
    path.relative(MODULES_DIR, file),
  );
  return (match?.[1] as Layer | undefined) ?? null;
}

/** Resuelve imports relativos a una ruta con '/' para que las reglas sobre carpetas funcionen. */
function normalize(file: string, specifier: string): string {
  if (!specifier.startsWith(".")) return specifier;
  return `/${path
    .relative(MODULES_DIR, path.resolve(path.dirname(file), specifier))
    .split(path.sep)
    .join("/")}/`;
}

describe("reglas de dependencia entre capas", () => {
  const files = listFiles(MODULES_DIR).filter((f) => !/\.test\.tsx?$/.test(f));

  it("encuentra archivos de módulos para analizar", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const rule of RULES) {
    it(`la capa ${rule.layer} no importa dependencias prohibidas`, () => {
      const violations = files
        .filter((file) => layerOf(file) === rule.layer)
        .flatMap((file) =>
          importsOf(file)
            .filter((spec) => rule.forbidden.some((pattern) => pattern.test(normalize(file, spec))))
            .map((spec) => `${path.relative(MODULES_DIR, file)} → ${spec}`),
        );
      expect(violations).toEqual([]);
    });
  }
});
