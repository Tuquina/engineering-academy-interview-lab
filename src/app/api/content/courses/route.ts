import { getPublicContent } from "@/infrastructure/composition/content";
import { jsonResponse } from "@/infrastructure/http/same-origin";

/** Cursos personalizados publicados (público). Sin base configurada, la lista está vacía. */
export async function GET() {
  const content = getPublicContent();
  const courses = content ? await content.listPublished() : [];
  return jsonResponse(
    {
      courses: courses.map(({ id, slug, title, description, difficulty, lessonCount, areaId }) => ({
        id,
        slug,
        title,
        description,
        difficulty,
        lessonCount,
        areaId,
      })),
    },
    200,
    { "cache-control": "public, max-age=30, stale-while-revalidate=120" },
  );
}
