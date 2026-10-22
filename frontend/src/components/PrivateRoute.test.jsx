import { describe, test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import PrivateRoute from "./PrivateRoute";
import userReducer from "../redux/user/userSlice";

const renderizarRuta = (currentUser) => {
  const store = configureStore({
    reducer: { user: userReducer },
    preloadedState: { user: { currentUser, error: null, loading: false } },
  });

  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route element={<PrivateRoute />}>
            <Route path="/dashboard" element={<p>Panel privado</p>} />
          </Route>
          <Route path="/sign-in" element={<p>Pantalla de inicio de sesión</p>} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );
};

describe("PrivateRoute", () => {
  test("muestra el contenido protegido cuando hay un usuario con sesión", () => {
    renderizarRuta({ id: 1, username: "admin" });

    expect(screen.getByText("Panel privado")).toBeInTheDocument();
    expect(screen.queryByText("Pantalla de inicio de sesión")).not.toBeInTheDocument();
  });

  test("redirige a /sign-in cuando no hay un usuario con sesión", () => {
    renderizarRuta(null);

    expect(screen.getByText("Pantalla de inicio de sesión")).toBeInTheDocument();
    expect(screen.queryByText("Panel privado")).not.toBeInTheDocument();
  });
});
