import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCheatsheets } from "@/infrastructure/composition/content-extras";
import { getCatalog } from "@/infrastructure/composition/learning";
import { buildLessonIndex } from "@/infrastructure/composition/lesson-index";
import { renderLessonBody } from "@/modules/learning/presentation/mdx/render-lesson-body";
import { FavoriteCheatsheetButton } from "@/modules/notebook/presentation/favorite-cheatsheet-button";
import { Badge } from "@/shared/ui/badge";

interface CheatsheetPageProps {
  params: Promise<{ slug: string }>;
}

export const dynamicParams = false;

export async function generateStaticParams() {
  return (await getCheatsheets()).map((sheet) => ({ slug: sheet.slug }));
}

export async function generateMetadata({ params }: CheatsheetPageProps): Promise<Metadata> {
  const { slug } = await params;
  const sheet = (await getCheatsheets()).find((s) => s.slug === slug);
  return sheet ? { title: sheet.title, description: sheet.description } : {};
}

export default async function CheatsheetPage({ params }: CheatsheetPageProps) {
  const { slug } = await params;
  const [sheets, catalog] = await Promise.all([getCheatsheets(), getCatalog()]);
  const sheet = sheets.find((s) => s.slug === slug);
  if (!sheet) notFound();

  const lessons = buildLessonIndex(catalog);
  const related = sheet.relatedLessons.map((id) => lessons[id]).filter((l) => l !== undefined);
  const body = await renderLessonBody(sheet.body);

  return (
    <article className="mx-auto max-w-4xl">
      <nav aria-label="Ruta de navegación" className="text-muted mb-4 text-sm">
        <Link href="/cheatsheets" className="hover:text-foreground">
          Cheatsheets
        </Link>
      </nav>
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-foreground text-3xl font-bold tracking-tight">{sheet.title}</h1>
          <p className="text-muted mt-2">{sheet.description}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {sheet.tags.map((tag) => (
              <Badge key={tag}>{tag}</Badge>
            ))}
          </div>
        </div>
        <FavoriteCheatsheetButton slug={sheet.slug} title={sheet.title} />
      </header>

      <div className="prose prose-headings:tracking-tight reading-scale max-w-none">{body}</div>

      {related.length > 0 && (
        <section
          aria-labelledby="related-lessons"
          className="border-border bg-surface mt-10 rounded-lg border p-5"
        >
          <h2 id="related-lessons" className="text-foreground mb-3 text-base font-semibold">
            Para profundizar
          </h2>
          <ul className="flex flex-col gap-1">
            {related.map((lesson) => (
              <li key={lesson.id}>
                <Link
                  href={lesson.href}
                  className="text-accent inline-flex items-center gap-1 text-sm hover:underline"
                >
                  {lesson.title} <ArrowRight aria-hidden className="size-3.5" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
