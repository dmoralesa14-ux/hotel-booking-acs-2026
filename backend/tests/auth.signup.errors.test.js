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
const { signUp } = require("../controllers/auth.controller");

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const body = { username: "nuevo", email: "nuevo@correo.com", password: "clave123" };

beforeEach(() => {
  jest.resetAllMocks();
});

describe("signUp: manejo de errores", () => {
  test("responde 500 y no crea el usuario cuando falla la generación de la sal", async () => {
    const res = mockRes();
    models.User.findOne.mockResolvedValue(null);
    bcrypt.genSalt.mockImplementation((rounds, cb) => cb(new Error("sal fallida")));

    await signUp({ body }, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: "Internal Server Error" })
    );
    expect(models.User.create).not.toHaveBeenCalled();
  });

  test("responde 500 y no crea el usuario cuando falla el cifrado de la contraseña", async () => {
    const res = mockRes();
    models.User.findOne.mockResolvedValue(null);
    bcrypt.genSalt.mockImplementation((rounds, cb) => cb(null, "sal"));
    bcrypt.hash.mockImplementation((pass, salt, cb) => cb(new Error("hash fallido")));

    await signUp({ body }, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: "Internal Server Error" })
    );
    expect(models.User.create).not.toHaveBeenCalled();
  });

  test("responde 500 cuando falla la consulta del correo", async () => {
    const res = mockRes();
    models.User.findOne.mockRejectedValue(new Error("db caída"));

    await signUp({ body }, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: "Internal Server Error" })
    );
    expect(bcrypt.genSalt).not.toHaveBeenCalled();
  });
});
