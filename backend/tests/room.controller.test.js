jest.mock("../models", () => ({ sequelize: { query: jest.fn() } }));

const models = require("../models");
const {
  getRooms,
  createRoom,
  updateRoom,
  deleteRoom,
  getRoomsAllDetails,
} = require("../controllers/room.controller");

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const flush = () => new Promise((resolve) => setImmediate(resolve));

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  console.log.mockRestore();
});

describe("getRooms", () => {
  test("responde 200 con la lista de habitaciones", async () => {
    const res = mockRes();
    models.sequelize.query.mockResolvedValue([[{ id: 1, status: "available" }], {}]);

    getRooms({}, res);
    await flush();

    expect(models.sequelize.query).toHaveBeenCalledWith("SELECT * FROM GetRooms");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      rooms: [{ id: 1, status: "available" }],
    });
  });

  test("responde 400 cuando falla la consulta", async () => {
    const res = mockRes();
    models.sequelize.query.mockRejectedValue(new Error("consulta fallida"));

    getRooms({}, res);
    await flush();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "consulta fallida",
    });
  });
});

describe("createRoom", () => {
  test("crea la habitación con estado available y responde 201", async () => {
    const res = mockRes();
    models.sequelize.query.mockResolvedValue([]);

    createRoom({ body: { room_name: "101", category_id: 2 } }, res);
    await flush();

    expect(models.sequelize.query).toHaveBeenCalledWith(
      expect.stringContaining("CALL CreateRoom"),
      { replacements: { room_name: "101", category_id: 2, status: "available" } }
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Room created successfully",
    });
  });

  test("responde 400 cuando falla la creación", async () => {
    const res = mockRes();
    models.sequelize.query.mockRejectedValue(new Error("nombre duplicado"));

    createRoom({ body: { room_name: "101", category_id: 2 } }, res);
    await flush();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "nombre duplicado",
    });
  });
});

describe("updateRoom", () => {
  test("actualiza el estado de la habitación y responde 200", async () => {
    const res = mockRes();
    const body = { id: 4, room_name: "101", category_id: 2, status: "maintenance" };
    models.sequelize.query.mockResolvedValue([]);

    updateRoom({ body }, res);
    await flush();

    expect(models.sequelize.query).toHaveBeenCalledWith(
      expect.stringContaining("CALL UpdateRoom"),
      { replacements: body }
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Room updated successfully",
    });
  });
});

describe("deleteRoom", () => {
  test("elimina la habitación indicada en la ruta y responde 200", async () => {
    const res = mockRes();
    models.sequelize.query.mockResolvedValue([]);

    deleteRoom({ params: { id: "8" } }, res);
    await flush();

    expect(models.sequelize.query).toHaveBeenCalledWith(
      expect.stringContaining("CALL DeleteRoom"),
      { replacements: { id: "8" } }
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Room deleted successfully",
    });
  });

  test("responde 400 cuando falla la eliminación", async () => {
    const res = mockRes();
    models.sequelize.query.mockRejectedValue(new Error("habitación con reservas"));

    deleteRoom({ params: { id: "8" } }, res);
    await flush();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "habitación con reservas",
    });
  });
});

describe("getRoomsAllDetails", () => {
  test("responde 200 con el detalle de las habitaciones", async () => {
    const res = mockRes();
    models.sequelize.query.mockResolvedValue([[{ id: 1, category: "Suite" }], {}]);

    getRoomsAllDetails({}, res);
    await flush();

    expect(models.sequelize.query).toHaveBeenCalledWith("SELECT * FROM RoomDetails");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      rooms: [{ id: 1, category: "Suite" }],
    });
  });
});
