import { describe, expect, it } from "vitest";
import { compareResults, lastResultSet, type QueryResult } from "./sql-exercise";

const result = (columns: string[], rows: (string | number | null)[][]): QueryResult => ({
  columns,
  rows,
  affectedRows: null,
});

const expected = result(
  ["name", "total"],
  [
    ["Ana", 300],
    ["Bruno", 100],
  ],
);

describe("compareResults", () => {
  it("acepta el mismo resultado y compara valores aunque cambie el tipo JS", () => {
    const actual = result(
      ["name", "total"],
      [
        ["Ana", "300"],
        ["Bruno", "100.0"],
      ],
    );
    expect(compareResults(expected, actual, true).correct).toBe(true);
  });

  it("detecta orden incorrecto cuando importa, y lo acepta cuando no", () => {
    const reversed = result(
      ["name", "total"],
      [
        ["Bruno", 100],
        ["Ana", 300],
      ],
    );
    expect(compareResults(expected, reversed, true)).toMatchObject({
      correct: false,
      message: expect.stringMatching(/ORDER BY/),
    });
    expect(compareResults(expected, reversed, false).correct).toBe(true);
  });

  it("informa diferencias de columnas, filas y valores", () => {
    expect(compareResults(expected, result(["name"], [["Ana"], ["Bruno"]]), false).message).toMatch(
      /2 columnas/,
    );
    expect(compareResults(expected, result(["name", "total"], [["Ana", 300]]), false).message).toMatch(
      /1 filas/,
    );
    expect(
      compareResults(
        expected,
        result(
          ["name", "total"],
          [
            ["Ana", 300],
            ["Bruno", 101],
          ],
        ),
        false,
      ).correct,
    ).toBe(false);
    expect(compareResults(expected, null, false).correct).toBe(false);
  });

  it("respeta duplicados al comparar sin orden", () => {
    const withDuplicates = result(["n"], [[1], [1], [2]]);
    expect(compareResults(withDuplicates, result(["n"], [[1], [2], [2]]), false).correct).toBe(false);
  });

  it("los nombres de columna distintos son una nota, no un error", () => {
    const renamed = result(
      ["cliente", "suma"],
      [
        ["Ana", 300],
        ["Bruno", 100],
      ],
    );
    const outcome = compareResults(expected, renamed, true);
    expect(outcome.correct).toBe(true);
    expect(outcome.notes).toHaveLength(1);
  });
});

describe("lastResultSet", () => {
  it("devuelve el último resultado con columnas", () => {
    const insert: QueryResult = { columns: [], rows: [], affectedRows: 1 };
    expect(lastResultSet([expected, insert])).toBe(expected);
    expect(lastResultSet([insert])).toBeNull();
  });
});
