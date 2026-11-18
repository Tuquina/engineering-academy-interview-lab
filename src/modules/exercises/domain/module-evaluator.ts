/**
 * Evalúa código JavaScript compilado a CommonJS con un `require` restringido.
 *
 * Sólo se pueden importar los módulos que el llamador provee explícitamente (por ejemplo `./solution` para los
 * tests). Cualquier otro `require`, incluidas importaciones dinámicas compiladas a `require`, falla. Esto, junto con
 * la desactivación de APIs de red en el worker, evita que el código de un ejercicio cargue código externo.
 *
 * IMPORTANTE: este evaluador NO es una frontera de seguridad por sí mismo; se ejecuta siempre dentro de un Web Worker
 * en el navegador del usuario (o en tests de CI con contenido del repositorio), nunca en el servidor.
 */
export function evaluateCommonJs(
  code: string,
  modules: Readonly<Record<string, unknown>>,
  globals: Readonly<Record<string, unknown>> = {},
): Record<string, unknown> {
  const cjsModule = { exports: {} as Record<string, unknown> };
  const require = (specifier: string): unknown => {
    if (specifier in modules) return modules[specifier];
    throw new Error(
      `No se puede importar "${specifier}": en los ejercicios sólo están disponibles los módulos provistos.`,
    );
  };
  const names = Object.keys(globals);
  const factory = new Function("exports", "require", "module", ...names, `"use strict";\n${code}`);
  factory(cjsModule.exports, require, cjsModule, ...names.map((n) => globals[n]));
  return cjsModule.exports;
}
