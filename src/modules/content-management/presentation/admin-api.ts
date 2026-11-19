"use client";

import type { IntegrityIssue } from "../domain/custom-content";

/** Error de la API de administración con los problemas de integridad que devolvió el servidor. */
export class AdminApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly issues: readonly IntegrityIssue[] = [],
  ) {
    super(message);
  }
}

export async function adminFetch<T>(url: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const response = await fetch(url, {
    method: init?.method ?? "GET",
    headers: init?.body !== undefined ? { "content-type": "application/json" } : undefined,
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  const data = (await response.json().catch(() => ({}))) as T & { error?: string; issues?: IntegrityIssue[] };
  if (!response.ok)
    throw new AdminApiError(data.error ?? `HTTP ${response.status}`, response.status, data.issues ?? []);
  return data;
}

export function downloadJson(filename: string, data: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
