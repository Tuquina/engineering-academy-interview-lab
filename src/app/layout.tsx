import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import type { ReactNode } from "react";
import { getSearchIndex } from "@/infrastructure/composition/content-extras";
import { getCatalog } from "@/infrastructure/composition/learning";
import { CommandPalette } from "@/modules/search/presentation/command-palette";
import { AppShell } from "@/shared/layout/app-shell";
import { themeInitScript } from "@/shared/layout/theme-toggle";
import { Providers } from "./providers";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Interview Lab — Engineering Academy", template: "%s · Interview Lab" },
  description:
    "Plataforma para aprender y practicar ingeniería de software Full Stack orientada a plataformas de agentes de IA.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0d1220" },
    { media: "(prefers-color-scheme: light)", color: "#f5f7fb" },
  ],
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const [catalog, searchIndex] = await Promise.all([getCatalog(), getSearchIndex()]);
  const courses = catalog.courses.map((course) => ({
    href: `/courses/${course.slug}`,
    title: course.title,
    lessonCount: catalog.getLessonsOfCourse(course.id).length,
  }));

  return (
    <html
      lang="es"
      data-theme="dark"
      suppressHydrationWarning
      className={`${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        <Script id="theme-init" strategy="beforeInteractive">
          {themeInitScript}
        </Script>
        <Providers>
          <AppShell courses={courses} search={<CommandPalette entries={searchIndex} />}>
            {children}
          </AppShell>
        </Providers>
      </body>
    </html>
  );
}
