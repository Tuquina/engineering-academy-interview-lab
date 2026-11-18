import path from "node:path";
import { cache } from "react";
import { loadSqlLab, type SqlLabContent } from "@/modules/sql-lab/infrastructure/file-system-sql-lab-source";

/** Dataset y ejercicios del SQL Lab, leídos de `content/sql`. */
export const getSqlLab = cache((): Promise<SqlLabContent> => loadSqlLab(path.join(process.cwd(), "content")));
