/*
 * DOBLES DE PRUEBA (mocks y stubs) - Módulo de Reservas
 *
 * Dependencia aislada: models.sequelize.query (acceso a MySQL mediante Sequelize),
 * reemplazada con jest.fn().
 *
 * Por qué se aisló:
 * - Una prueba unitaria verifica la lógica del controlador (validaciones y respuestas
 *   HTTP) de forma aislada. Con la base de datos real también se estaría probando
 *   MySQL y los procedimientos almacenados, que corresponde a otro nivel de prueba.
 * - Las pruebas quedan rápidas y deterministas: no dependen de red, de credenciales
 *   ni de los datos que existan en la base.
 * - Permite forzar errores de la base de datos (mockRejectedValue), difíciles de
 *   provocar con una base real.
 *
 * Tipo de doble: stub (mockResolvedValue y mockRejectedValue definen lo que devuelve
 * la base) y mock (toHaveBeenCalledWith verifica cómo se invocó el procedimiento).
 *
 * Pruebas que lo usan:
 * - "crea la reserva y responde 200 con datos válidos"
 * - "responde 500 cuando falla la base de datos"
 * - "cancela la reserva y responde 200"
 */

jest.mock("../models", () => ({ sequelize: { query: jest.fn() } }));

const models = require("../models");
const {
  createBooking,
  editBooking,
  cancelBooking,
  getAllBookingDetails,
} = require("../controllers/booking.controller");

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const flush = () => new Promise((resolve) => setImmediate(resolve));
const dateFromNow = (days) =>
  new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

beforeEach(() => {
  jest.clearAllMocks();
});

describe("createBooking", () => {
  const validBody = () => ({
    room_id: 1,
    customer_id: 2,
    check_in: dateFromNow(2),
    check_out: dateFromNow(4),
  });

  test.each([
    ["room_id", "Room ID is required"],
    ["customer_id", "Customer ID is required"],
    ["check_in", "Check-in date is required"],
    ["check_out", "Check-out date is required"],
  ])("responde 400 cuando falta %s", (campo, mensaje) => {
    const body = validBody();
    delete body[campo];
    const res = mockRes();

    createBooking({ body }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: mensaje });
    expect(models.sequelize.query).not.toHaveBeenCalled();
  });

  test("responde 400 cuando la fecha de entrada es posterior a la de salida", () => {
    const body = { ...validBody(), check_in: dateFromNow(5), check_out: dateFromNow(2) };
    const res = mockRes();

    createBooking({ body }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Check-in date should be less than check-out date",
    });
  });

  test("responde 400 cuando la fecha de salida ya pasó", () => {
    const body = { ...validBody(), check_in: dateFromNow(-5), check_out: dateFromNow(-2) };
    const res = mockRes();

    createBooking({ body }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Check-out date should be future date",
    });
    expect(models.sequelize.query).not.toHaveBeenCalled();
  });

  test("crea la reserva y responde 200 con datos válidos", async () => {
    const body = validBody();
    const res = mockRes();
    models.sequelize.query.mockResolvedValue([{ affectedRows: 1 }]);

    createBooking({ body }, res);
    await flush();

    expect(models.sequelize.query).toHaveBeenCalledWith(
      expect.stringContaining("CALL CreateBooking"),
      { replacements: body }
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Booking created successfully",
      data: [{ affectedRows: 1 }],
    });
  });

  test("responde 500 cuando falla la base de datos", async () => {
    const res = mockRes();
    models.sequelize.query.mockRejectedValue(new Error("fallo de base de datos"));

    createBooking({ body: validBody() }, res);
    await flush();

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Booking creation failed",
      error: "fallo de base de datos",
    });
  });
});

describe("editBooking", () => {
  const validBody = () => ({
    booking_id: 10,
    room_id: 1,
    check_in: dateFromNow(2),
    check_out: dateFromNow(4),
  });

  test("responde 400 cuando falta booking_id", () => {
    const body = validBody();
    delete body.booking_id;
    const res = mockRes();

    editBooking({ body }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Booking ID is required",
    });
  });

  test("edita la reserva y responde 200 con datos válidos", async () => {
    const body = validBody();
    const res = mockRes();
    models.sequelize.query.mockResolvedValue([{ affectedRows: 1 }]);

    editBooking({ body }, res);
    await flush();

    expect(models.sequelize.query).toHaveBeenCalledWith(
      expect.stringContaining("CALL EditBooking"),
      { replacements: body }
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, message: "Booking edited successfully" })
    );
  });

  test("responde 500 cuando falla la edición en la base de datos", async () => {
    const res = mockRes();
    models.sequelize.query.mockRejectedValue(new Error("fallo al editar"));

    editBooking({ body: validBody() }, res);
    await flush();

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Booking edit failed",
      error: "fallo al editar",
    });
  });
});

describe("cancelBooking", () => {
  test("responde 400 cuando falta booking_id", () => {
    const res = mockRes();

    cancelBooking({ params: {} }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Booking ID is required",
    });
  });

  test("cancela la reserva y responde 200", async () => {
    const res = mockRes();
    models.sequelize.query.mockResolvedValue([{ affectedRows: 1 }]);

    cancelBooking({ params: { booking_id: "7" } }, res);
    await flush();

    expect(models.sequelize.query).toHaveBeenCalledWith(
      expect.stringContaining("CALL CancelBooking"),
      { replacements: { booking_id: "7" } }
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, message: "Booking cancelled successfully" })
    );
  });

  test("responde 500 cuando falla la cancelación en la base de datos", async () => {
    const res = mockRes();
    models.sequelize.query.mockRejectedValue(new Error("fallo al cancelar"));

    cancelBooking({ params: { booking_id: "7" } }, res);
    await flush();

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Booking cancellation failed",
      error: "fallo al cancelar",
    });
  });
});

describe("getAllBookingDetails", () => {
  test("responde 200 con los datos de las reservas", async () => {
    const res = mockRes();
    models.sequelize.query.mockResolvedValue([[{ id: 1 }, { id: 2 }], {}]);

    getAllBookingDetails({}, res);
    await flush();

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Booking data fetched successfully",
      data: [{ id: 1 }, { id: 2 }],
    });
  });

  test("responde 400 cuando falla la consulta", async () => {
    const res = mockRes();
    models.sequelize.query.mockRejectedValue(new Error("consulta fallida"));

    getAllBookingDetails({}, res);
    await flush();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "consulta fallida",
    });
  });
});
