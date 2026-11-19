import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // El contenido se lee desde disco en el servidor; se incluye explícitamente en el bundle de las funciones.
  outputFileTracingIncludes: {
    "/**": ["./content/**/*"],
  },
  // El build de producción usa Turbopack, que ya resuelve los imports `node:` de PGlite en el navegador.
  turbopack: {},
  /**
   * Cabeceras de seguridad (Fase 6). No se fija una Content-Security-Policy estricta todavía: Monaco, Sandpack y los
   * Web Workers necesitan orígenes y `eval` específicos; se documenta como pendiente en STATUS.
   */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      {
        // Lo que depende de la sesión nunca se guarda en cachés compartidas.
        source: "/(account|admin|login)(.*)",
        headers: [{ key: "Cache-Control", value: "private, no-store" }],
      },
    ];
  },
  /**
   * Sólo para el servidor de desarrollo en Docker (`next dev --webpack`, ver ADR-0001): PGlite importa módulos
   * `node:*` que sólo usa al correr en Node. En el bundle del navegador se quita el prefijo `node:` y esos módulos
   * se reemplazan por vacíos.
   */
  webpack: (config, { isServer, webpack }) => {
    if (!isServer) {
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(/^node:/, (resource: { request: string }) => {
          resource.request = resource.request.replace(/^node:/, "");
        }),
      );
      config.resolve.fallback = {
        ...config.resolve.fallback,
        module: false,
        fs: false,
        "fs/promises": false,
        path: false,
        url: false,
        crypto: false,
        child_process: false,
        worker_threads: false,
        os: false,
        stream: false,
        zlib: false,
        util: false,
        events: false,
        buffer: false,
        net: false,
        tls: false,
        http: false,
        https: false,
      };
    }
    return config;
  },
};

export default nextConfig;
