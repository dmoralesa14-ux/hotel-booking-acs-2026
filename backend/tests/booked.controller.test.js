jest.mock("../models", () => ({ sequelize: { query: jest.fn() } }));

const models = require("../models");
const {
  checkIn,
  checkOut,
  cancelCheckIn,
  editCheckIn,
  getAllDetailsChecked,
  getAllDetailsCheckedOut,
} = require("../controllers/booked.controller");

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const flush = () => new Promise((resolve) => setImmediate(resolve));

beforeEach(() => {
  jest.clearAllMocks();
});

describe("checkIn", () => {
  test("responde 400 cuando falta booking_id", () => {
    const res = mockRes();

    checkIn({ body: {} }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Booking ID is required.",
    });
    expect(models.sequelize.query).not.toHaveBeenCalled();
  });

  test("registra el check-in con estado Checked-in y responde 200", async () => {
    const res = mockRes();
    models.sequelize.query.mockResolvedValue([{ affectedRows: 1 }]);

    checkIn({ body: { booking_id: 5 } }, res);
    await flush();

    expect(models.sequelize.query).toHaveBeenCalledWith(
      "CALL CheckIn(:booking_id, :status)",
      { replacements: { booking_id: 5, status: "Checked-in" } }
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, message: "Check-in completed successfully" })
    );
  });

  test("responde 400 cuando falla el check-in en la base de datos", async () => {
    const res = mockRes();
    models.sequelize.query.mockRejectedValue(new Error("reserva no válida"));

    checkIn({ body: { booking_id: 5 } }, res);
    await flush();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "reserva no válida",
    });
  });
});

describe("checkOut", () => {
  test("responde 400 cuando falta booking_id", () => {
    const res = mockRes();

    checkOut({ body: {} }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Booking ID is required.",
    });
  });

  test("registra el check-out con estado Checked-out y responde 200", async () => {
    const res = mockRes();
    models.sequelize.query.mockResolvedValue([{ affectedRows: 1 }]);

    checkOut({ body: { booking_id: 5 } }, res);
    await flush();

    expect(models.sequelize.query).toHaveBeenCalledWith(
      "CALL CheckOut(:booking_id, :status)",
      { replacements: { booking_id: 5, status: "Checked-out" } }
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, message: "Check-out completed successfully" })
    );
  });

  test("responde 400 cuando falla el check-out en la base de datos", async () => {
    const res = mockRes();
    models.sequelize.query.mockRejectedValue(new Error("check-out fallido"));

    checkOut({ body: { booking_id: 5 } }, res);
    await flush();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "check-out fallido",
    });
  });
});

describe("cancelCheckIn", () => {
  test("cancela el check-in y responde 200 con el número de referencia", async () => {
    const res = mockRes();
    models.sequelize.query.mockResolvedValue([]);

    await cancelCheckIn({ body: { ref_no: "REF-1", room_id: 3 } }, res);

    expect(models.sequelize.query).toHaveBeenCalledWith(
      expect.stringContaining("CALL CancelCheckInProcedure"),
      { replacements: { ref_no: "REF-1", room_id: 3 } }
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Check-in canceled successfully for reference number REF-1.",
    });
  });

  test("responde 400 cuando falla la cancelación del check-in", async () => {
    const res = mockRes();
    models.sequelize.query.mockRejectedValue(new Error("no se pudo cancelar"));

    await cancelCheckIn({ body: { ref_no: "REF-1", room_id: 3 } }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "no se pudo cancelar",
    });
  });
});

describe("editCheckIn", () => {
  const body = {
    ref_no: "REF-1",
    new_room_id: 4,
    name: "Ana Lopez",
    contact_no: "55551234",
    date_in: "2026-11-01",
    date_out: "2026-11-03",
  };

  test("edita el check-in y responde 200", async () => {
    const res = mockRes();
    models.sequelize.query.mockResolvedValue([]);

    await editCheckIn({ body }, res);

    expect(models.sequelize.query).toHaveBeenCalledWith(
      expect.stringContaining("CALL EditCheckInProcedure"),
      { replacements: body }
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Check-in details updated successfully.",
    });
  });

  test("responde 400 cuando falla la edición del check-in", async () => {
    const res = mockRes();
    models.sequelize.query.mockRejectedValue(new Error("habitación ocupada"));

    await editCheckIn({ body }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "habitación ocupada",
    });
  });
});

describe("consultas de check-in y check-out", () => {
  test("getAllDetailsChecked responde 200 con los datos", async () => {
    const res = mockRes();
    models.sequelize.query.mockResolvedValue([[{ id: 1 }], {}]);

    getAllDetailsChecked({}, res);
    await flush();

    expect(models.sequelize.query).toHaveBeenCalledWith("SELECT * FROM CheckedDetails");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Checked data fetched successfully",
      data: [{ id: 1 }],
    });
  });

  test("getAllDetailsCheckedOut filtra por status = 1 y responde 200", async () => {
    const res = mockRes();
    models.sequelize.query.mockResolvedValue([[{ id: 2 }], {}]);

    getAllDetailsCheckedOut({}, res);
    await flush();

    expect(models.sequelize.query).toHaveBeenCalledWith(
      "SELECT * FROM CheckedDetails WHERE status = 1"
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Checked out data fetched successfully",
      data: [{ id: 2 }],
    });
  });
});
