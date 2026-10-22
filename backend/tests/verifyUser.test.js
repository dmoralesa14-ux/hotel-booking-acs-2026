/*
 * DOBLES DE PRUEBA (stubs) - Middleware de sesión (verifyUser)
 *
 * Dependencia aislada: jsonwebtoken.verify, reemplazada con jest.fn().
 *
 * Por qué se aisló:
 * - La prueba verifica la lógica del middleware (qué responde según el resultado de
 *   la verificación), no la librería de tokens.
 * - Permite simular un token inválido o uno válido sin firmar tokens reales ni
 *   depender de su fecha de expiración.
 *
 * Tipo de doble: stub (mockImplementation define si la verificación falla o devuelve
 * un usuario) y mock (toHaveBeenCalledWith verifica el token y la clave recibidos).
 *
 * Pruebas que lo usan:
 * - "responde 401 cuando el token no es válido"
 * - "con un token válido guarda el usuario en la petición y llama a next"
 */

jest.mock("jsonwebtoken", () => ({ verify: jest.fn() }));

process.env.JWT_SECRET_KEY = "clave-de-prueba";

const jwt = require("jsonwebtoken");
const verifyToken = require("../utils/verifyUser");

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => {
  jest.resetAllMocks();
});

describe("verifyToken", () => {
  test("responde 401 cuando no hay cookie de sesión", () => {
    const res = mockRes();
    const next = jest.fn();

    verifyToken({ cookies: {} }, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: "Unauthorized" });
    expect(next).not.toHaveBeenCalled();
  });

  test("responde 401 cuando el token no es válido", () => {
    const res = mockRes();
    const next = jest.fn();
    jwt.verify.mockImplementation((token, secret, cb) => cb(new Error("token inválido")));

    verifyToken({ cookies: { access_token: "token-malo" } }, res, next);

    expect(jwt.verify).toHaveBeenCalledWith("token-malo", "clave-de-prueba", expect.any(Function));
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: "Unauthorized x" });
    expect(next).not.toHaveBeenCalled();
  });

  test("con un token válido guarda el usuario en la petición y llama a next", () => {
    const res = mockRes();
    const next = jest.fn();
    const req = { cookies: { access_token: "token-bueno" } };
    jwt.verify.mockImplementation((token, secret, cb) => cb(null, { id: 1, role: "admin" }));

    verifyToken(req, res, next);

    expect(req.user).toEqual({ id: 1, role: "admin" });
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});
