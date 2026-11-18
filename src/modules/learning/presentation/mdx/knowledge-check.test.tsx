// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { KnowledgeCheck } from "./knowledge-check";

const options = [
  { text: "Opción A", explanation: "A es incorrecta porque..." },
  { text: "Opción B", correct: true, explanation: "B es correcta porque..." },
];

describe("KnowledgeCheck", () => {
  it("no permite comprobar sin elegir una opción", () => {
    render(<KnowledgeCheck question="¿Pregunta?" options={options} />);
    expect(screen.getByRole("button", { name: "Comprobar" })).toBeDisabled();
    expect(screen.queryByText(/porque/)).not.toBeInTheDocument();
  });

  it("marca una respuesta incorrecta y explica todas las opciones", async () => {
    const user = userEvent.setup();
    render(<KnowledgeCheck question="¿Pregunta?" options={options} />);

    await user.click(screen.getByLabelText(/Opción A/));
    await user.click(screen.getByRole("button", { name: "Comprobar" }));

    expect(screen.getByRole("status")).toHaveTextContent("No es correcta");
    expect(screen.getByText("A es incorrecta porque...")).toBeInTheDocument();
    expect(screen.getByText("B es correcta porque...")).toBeInTheDocument();
  });

  it("confirma la respuesta correcta y permite reintentar", async () => {
    const user = userEvent.setup();
    render(<KnowledgeCheck question="¿Pregunta?" options={options} />);

    await user.click(screen.getByLabelText(/Opción B/));
    await user.click(screen.getByRole("button", { name: "Comprobar" }));
    expect(screen.getByRole("status")).toHaveTextContent("¡Correcto!");

    await user.click(screen.getByRole("button", { name: /Reintentar/ }));
    expect(screen.getByRole("button", { name: "Comprobar" })).toBeDisabled();
  });
});
