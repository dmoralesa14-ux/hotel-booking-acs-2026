import { describe, test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import ThemeProvider from "./ThemeProvider";
import themeReducer from "../redux/theme/themeSlice";

const renderizarConTema = (theme) => {
  const store = configureStore({
    reducer: { theme: themeReducer },
    preloadedState: { theme: { theme } },
  });

  return render(
    <Provider store={store}>
      <ThemeProvider>
        <p>Contenido de la aplicación</p>
      </ThemeProvider>
    </Provider>
  );
};

describe("ThemeProvider", () => {
  test("aplica la clase light y muestra a sus hijos", () => {
    const { container } = renderizarConTema("light");

    expect(container.firstChild).toHaveClass("light");
    expect(screen.getByText("Contenido de la aplicación")).toBeInTheDocument();
  });

  test("aplica la clase dark cuando el tema es dark", () => {
    const { container } = renderizarConTema("dark");

    expect(container.firstChild).toHaveClass("dark");
    expect(container.firstChild).not.toHaveClass("light");
  });
});
