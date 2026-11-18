// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { createLocalProgressStore } from "@/modules/progress/infrastructure/local-storage-progress-store";
import { ProgressProvider } from "@/modules/progress/presentation/progress-context";
import type { ProgressStore } from "@/modules/progress/application/progress-store";
import { LessonContextProvider } from "../lesson/lesson-context";
import { KnowledgeCheck } from "./knowledge-check";

const options = [
  { text: "Opción A", explanation: "A es incorrecta porque..." },
  { text: "Opción B", correct: true, explanation: "B es correcta porque..." },
];

function memoryStore(): ProgressStore {
  const data = new Map<string, string>();
  return createLocalProgressStore({
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
  });
}

function renderCheck(store = memoryStore()) {
  render(
    <ProgressProvider store={store}>
      <LessonContextProvider lessonId="lesson-1">
        <KnowledgeCheck id="lesson-1.q1" question="¿Pregunta?" options={options} />
      </LessonContextProvider>
    </ProgressProvider>,
  );
  return store;
}

describe("KnowledgeCheck", () => {
  it("no permite comprobar sin elegir una opción", () => {
    renderCheck();
    expect(screen.getByRole("button", { name: "Comprobar" })).toBeDisabled();
    expect(screen.queryByText(/porque/)).not.toBeInTheDocument();
  });

  it("marca una respuesta incorrecta, explica todas las opciones y registra el intento", async () => {
    const user = userEvent.setup();
    const store = renderCheck();

    await user.click(screen.getByLabelText(/Opción A/));
    await user.click(screen.getByRole("button", { name: "Comprobar" }));

    expect(screen.getByRole("status")).toHaveTextContent("No es correcta");
    expect(screen.getByText("A es incorrecta porque...")).toBeInTheDocument();
    expect(screen.getByText("B es correcta porque...")).toBeInTheDocument();
    expect(store.getSnapshot().questions["lesson-1.q1"]).toMatchObject({
      lessonId: "lesson-1",
      attempts: 1,
      lastCorrect: false,
    });
  });

  it("confirma la respuesta correcta, permite reintentar y muestra el historial", async () => {
    const user = userEvent.setup();
    renderCheck();

    await user.click(screen.getByLabelText(/Opción B/));
    await user.click(screen.getByRole("button", { name: "Comprobar" }));
    expect(screen.getByRole("status")).toHaveTextContent("¡Correcto!");

    await user.click(screen.getByRole("button", { name: /Reintentar/ }));
    expect(screen.getByRole("button", { name: "Comprobar" })).toBeDisabled();
    expect(screen.getByText(/Última respuesta: correcta · 1 intento/)).toBeInTheDocument();
  });
});
