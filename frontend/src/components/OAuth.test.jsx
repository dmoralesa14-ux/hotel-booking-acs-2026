import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import OAuth from "./OAuth";
import userReducer from "../redux/user/userSlice";

const navigateMock = vi.fn();
const signInWithPopupMock = vi.fn();

vi.mock("react-router-dom", async (importOriginal) => {
  const original = await importOriginal();
  return { ...original, useNavigate: () => navigateMock };
});

vi.mock("firebase/auth", () => ({
  getAuth: vi.fn(() => ({})),
  GoogleAuthProvider: class {
    setCustomParameters() {}
  },
  signInWithPopup: (...args) => signInWithPopupMock(...args),
}));

vi.mock("../firebase", () => ({ app: {} }));

const renderizar = () => {
  const store = configureStore({ reducer: { user: userReducer } });
  const resultado = render(
    <Provider store={store}>
      <OAuth />
    </Provider>
  );
  return { store, ...resultado };
};

describe("OAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  test("no muestra el botón cuando Firebase no está configurado", () => {
    vi.stubEnv("VITE_FIREBASE_API_KEY", "");

    const { container } = renderizar();

    expect(container).toBeEmptyDOMElement();
  });

  test("muestra el botón de Google cuando Firebase está configurado", () => {
    vi.stubEnv("VITE_FIREBASE_API_KEY", "clave-de-prueba");

    renderizar();

    expect(screen.getByText("Continue with Google")).toBeInTheDocument();
  });

  test("al iniciar sesión con Google guarda el usuario y navega al inicio", async () => {
    vi.stubEnv("VITE_FIREBASE_API_KEY", "clave-de-prueba");
    signInWithPopupMock.mockResolvedValue({
      user: { displayName: "Ana Lopez", email: "ana@correo.com", photoURL: "http://foto" },
    });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 3, username: "ana" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { store } = renderizar();
    fireEvent.click(screen.getByText("Continue with Google"));

    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith("/"));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/google",
      expect.objectContaining({ method: "POST" })
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      name: "Ana Lopez",
      email: "ana@correo.com",
      photoURL: "http://foto",
    });
    expect(store.getState().user.currentUser).toEqual({ id: 3, username: "ana" });
  });

  test("no guarda el usuario ni navega cuando el servidor rechaza el inicio de sesión", async () => {
    vi.stubEnv("VITE_FIREBASE_API_KEY", "clave-de-prueba");
    signInWithPopupMock.mockResolvedValue({
      user: { displayName: "Ana Lopez", email: "ana@correo.com", photoURL: "http://foto" },
    });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ success: false }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { store } = renderizar();
    fireEvent.click(screen.getByText("Continue with Google"));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(navigateMock).not.toHaveBeenCalled();
    expect(store.getState().user.currentUser).toBeNull();
  });

  test("no llama al servidor cuando falla la ventana de Google", async () => {
    vi.stubEnv("VITE_FIREBASE_API_KEY", "clave-de-prueba");
    signInWithPopupMock.mockRejectedValue(new Error("ventana cerrada"));
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { store } = renderizar();
    fireEvent.click(screen.getByText("Continue with Google"));

    await waitFor(() => expect(console.log).toHaveBeenCalled());
    expect(fetchMock).not.toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalled();
    expect(store.getState().user.currentUser).toBeNull();
  });
});
