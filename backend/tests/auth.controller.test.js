/*
 * DOBLES DE PRUEBA (mocks y stubs) - Módulo de Autenticación y sesión
 *
 * Dependencias aisladas, reemplazadas con jest.fn():
 * - models.User (findOne y create): acceso a la base de datos.
 * - bcrypt (genSalt, hash y compare): cifrado de contraseñas.
 * - jsonwebtoken (sign): emisión del token de sesión.
 *
 * Por qué se aislaron:
 * - models.User: la prueba verifica la lógica del controlador, no la base de datos,
 *   y evita depender de usuarios existentes en ella.
 * - bcrypt: genera una sal aleatoria, por lo que el hash cambia en cada ejecución y
 *   no se puede comparar con un valor fijo; además es costoso en tiempo.
 * - jsonwebtoken.sign: el token incluye la fecha de emisión, por lo que varía en
 *   cada ejecución; con el doble se verifica con qué datos y clave se firmó.
 *
 * Tipo de doble: stub (mockResolvedValue, mockRejectedValue y mockImplementation
 * definen lo que devuelven) y mock (toHaveBeenCalledWith verifica cómo se invocaron).
 *
 * Pruebas que lo usan:
 * - "con credenciales válidas emite el token en una cookie httpOnly y no devuelve la contraseña"
 * - "crea el usuario con la contraseña cifrada y responde 201"
 * - "responde 400 cuando la contraseña es incorrecta y no emite token"
 */

jest.mock("../models", () => ({
  User: { findOne: jest.fn(), create: jest.fn() },
}));
jest.mock("bcrypt", () => ({
  genSalt: jest.fn(),
  hash: jest.fn(),
  compare: jest.fn(),
}));
jest.mock("jsonwebtoken", () => ({ sign: jest.fn() }));

process.env.JWT_SECRET_KEY = "clave-de-prueba";

const models = require("../models");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const {
  signUp,
  signIn,
  google,
  signOut,
} = require("../controllers/auth.controller");

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  res.clearCookie = jest.fn().mockReturnValue(res);
  return res;
};

const flush = () => new Promise((resolve) => setImmediate(resolve));

beforeEach(() => {
  jest.resetAllMocks();
});

describe("signIn", () => {
  const body = { username: "admin", password: "secreto" };
  const usuario = {
    id: 1,
    role: "admin",
    password: "hash-guardado",
    dataValues: { id: 1, username: "admin", password: "hash-guardado", role: "admin" },
  };

  test("responde 400 cuando el usuario no existe", async () => {
    const res = mockRes();
    models.User.findOne.mockResolvedValue(null);

    signIn({ body }, res);
    await flush();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Invalid credentials",
    });
  });

  test("responde 400 cuando la contraseña es incorrecta y no emite token", async () => {
    const res = mockRes();
    models.User.findOne.mockResolvedValue(usuario);
    bcrypt.compare.mockImplementation((pass, hash, cb) => cb(null, false));

    signIn({ body }, res);
    await flush();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Invalid password",
    });
    expect(jwt.sign).not.toHaveBeenCalled();
  });

  test("con credenciales válidas emite el token en una cookie httpOnly y no devuelve la contraseña", async () => {
    const res = mockRes();
    models.User.findOne.mockResolvedValue(usuario);
    bcrypt.compare.mockImplementation((pass, hash, cb) => cb(null, true));
    jwt.sign.mockReturnValue("token-falso");

    signIn({ body }, res);
    await flush();

    expect(jwt.sign).toHaveBeenCalledWith(
      { id: 1, role: "admin" },
      "clave-de-prueba",
      { expiresIn: "1h" }
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.cookie).toHaveBeenCalledWith("access_token", "token-falso", {
      httpOnly: true,
      maxAge: 3600000,
    });
    expect(res.json).toHaveBeenCalledWith({ id: 1, username: "admin", role: "admin" });
  });

  test("responde 500 cuando falla la consulta del usuario", async () => {
    const res = mockRes();
    models.User.findOne.mockRejectedValue(new Error("db caída"));

    signIn({ body }, res);
    await flush();

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: "Internal Server Error" })
    );
  });
});

describe("signUp", () => {
  const body = { username: "nuevo", email: "nuevo@correo.com", password: "clave123" };

  test("responde 400 cuando el correo ya existe", async () => {
    const res = mockRes();
    models.User.findOne.mockResolvedValueOnce({ id: 1 });

    signUp({ body }, res);
    await flush();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Email already exists",
    });
    expect(models.User.create).not.toHaveBeenCalled();
  });

  test("responde 400 cuando el nombre de usuario ya existe", async () => {
    const res = mockRes();
    models.User.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 1 });

    signUp({ body }, res);
    await flush();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Username already exists",
    });
    expect(models.User.create).not.toHaveBeenCalled();
  });

  test("crea el usuario con la contraseña cifrada y responde 201", async () => {
    const res = mockRes();
    models.User.findOne.mockResolvedValue(null);
    bcrypt.genSalt.mockImplementation((rounds, cb) => cb(null, "sal"));
    bcrypt.hash.mockImplementation((pass, salt, cb) => cb(null, "hash-falso"));
    models.User.create.mockResolvedValue({ id: 9, username: "nuevo" });

    signUp({ body }, res);
    await flush();

    expect(models.User.create).toHaveBeenCalledWith({
      username: "nuevo",
      email: "nuevo@correo.com",
      password: "hash-falso",
      role: "admin",
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "User created successfully",
      user: { id: 9, username: "nuevo" },
    });
  });
});

describe("signOut", () => {
  test("elimina la cookie de sesión y responde 200", () => {
    const res = mockRes();

    signOut({}, res);

    expect(res.clearCookie).toHaveBeenCalledWith("access_token");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "User signed out successfully",
    });
  });
});

describe("google", () => {
  const body = { email: "ana@correo.com", name: "Ana Lopez", photoURL: "http://foto" };

  test("con un usuario existente emite el token y responde 200", async () => {
    const res = mockRes();
    models.User.findOne.mockResolvedValue({
      id: 3,
      role: "admin",
      dataValues: { id: 3, email: "ana@correo.com", password: "hash" },
    });
    jwt.sign.mockReturnValue("token-google");

    await google({ body }, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.cookie).toHaveBeenCalledWith("access_token", "token-google", {
      httpOnly: true,
      maxAge: 3600000,
    });
    expect(res.json).toHaveBeenCalledWith({ id: 3, email: "ana@correo.com" });
  });

  test("pasa el error a next cuando falla la consulta", async () => {
    const res = mockRes();
    const next = jest.fn();
    const error = new Error("db caída");
    models.User.findOne.mockRejectedValue(error);

    await google({ body }, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
  });
});
