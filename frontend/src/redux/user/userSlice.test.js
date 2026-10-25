import { describe, test, expect } from "vitest";
import userReducer, {
  signInStart,
  signInSuccess,
  signInFailure,
  updateStart,
  updateSuccess,
  updateFailure,
  deleteUserStart,
  deleteUserSuccess,
  deleteUserFailure,
  signoutSuccess,
} from "./userSlice";

const estadoInicial = { currentUser: null, error: null, loading: false };
const usuario = { id: 1, username: "admin", role: "admin" };

describe("userSlice", () => {
  test("tiene el estado inicial correcto", () => {
    expect(userReducer(undefined, { type: "accion-desconocida" })).toEqual(estadoInicial);
  });

  test("signInStart activa loading y limpia el error", () => {
    const estado = userReducer({ ...estadoInicial, error: "falla previa" }, signInStart());

    expect(estado.loading).toBe(true);
    expect(estado.error).toBeNull();
  });

  test("signInSuccess guarda el usuario y apaga loading", () => {
    const estado = userReducer({ ...estadoInicial, loading: true }, signInSuccess(usuario));

    expect(estado.currentUser).toEqual(usuario);
    expect(estado.loading).toBe(false);
    expect(estado.error).toBeNull();
  });

  test("signInFailure guarda el error y apaga loading", () => {
    const estado = userReducer(
      { ...estadoInicial, loading: true },
      signInFailure("Invalid credentials")
    );

    expect(estado.error).toBe("Invalid credentials");
    expect(estado.loading).toBe(false);
    expect(estado.currentUser).toBeNull();
  });

  test("updateStart activa loading y limpia el error", () => {
    const estado = userReducer({ ...estadoInicial, error: "falla previa" }, updateStart());

    expect(estado.loading).toBe(true);
    expect(estado.error).toBeNull();
  });

  test("updateSuccess reemplaza el usuario actual", () => {
    const actualizado = { ...usuario, username: "nuevo-nombre" };
    const estado = userReducer(
      { currentUser: usuario, error: null, loading: true },
      updateSuccess(actualizado)
    );

    expect(estado.currentUser).toEqual(actualizado);
    expect(estado.loading).toBe(false);
  });

  test("updateFailure guarda el error y conserva el usuario", () => {
    const estado = userReducer(
      { currentUser: usuario, error: null, loading: true },
      updateFailure("No se pudo actualizar")
    );

    expect(estado.error).toBe("No se pudo actualizar");
    expect(estado.loading).toBe(false);
    expect(estado.currentUser).toEqual(usuario);
  });

  test("deleteUserStart activa loading y limpia el error", () => {
    const estado = userReducer({ ...estadoInicial, error: "falla previa" }, deleteUserStart());

    expect(estado.loading).toBe(true);
    expect(estado.error).toBeNull();
  });

  test("deleteUserSuccess elimina el usuario actual", () => {
    const estado = userReducer(
      { currentUser: usuario, error: null, loading: true },
      deleteUserSuccess()
    );

    expect(estado).toEqual(estadoInicial);
  });

  test("deleteUserFailure guarda el error y conserva el usuario", () => {
    const estado = userReducer(
      { currentUser: usuario, error: null, loading: true },
      deleteUserFailure("No se pudo eliminar")
    );

    expect(estado.error).toBe("No se pudo eliminar");
    expect(estado.loading).toBe(false);
    expect(estado.currentUser).toEqual(usuario);
  });

  test("signoutSuccess cierra la sesión y deja el estado inicial", () => {
    const estado = userReducer(
      { currentUser: usuario, error: "algo", loading: true },
      signoutSuccess()
    );

    expect(estado).toEqual(estadoInicial);
  });
});
