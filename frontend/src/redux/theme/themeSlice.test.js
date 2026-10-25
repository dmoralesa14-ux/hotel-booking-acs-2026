import { describe, test, expect } from "vitest";
import themeReducer, { toggleTheme } from "./themeSlice";

describe("themeSlice", () => {
  test("el tema inicial es light", () => {
    expect(themeReducer(undefined, { type: "accion-desconocida" })).toEqual({
      theme: "light",
    });
  });

  test("toggleTheme cambia de light a dark", () => {
    expect(themeReducer({ theme: "light" }, toggleTheme())).toEqual({ theme: "dark" });
  });

  test("toggleTheme cambia de dark a light", () => {
    expect(themeReducer({ theme: "dark" }, toggleTheme())).toEqual({ theme: "light" });
  });
});
