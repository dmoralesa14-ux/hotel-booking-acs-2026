import { describe, test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import StatusBadge from "./StatusBadge";

describe("StatusBadge", () => {
  test.each([
    ["checked_out", "Check Out"],
    ["checked_in", "Check In"],
    ["confirmed", "Confirmed"],
    ["cancelled", "Cancelled"],
    ["Canceled", "Canceled"],
  ])("muestra el texto correcto para el estado %s", (status, texto) => {
    render(<StatusBadge status={status} />);

    expect(screen.getByText(texto)).toBeInTheDocument();
  });

  test("muestra Pending cuando el estado no es conocido", () => {
    render(<StatusBadge status="otro_estado" />);

    expect(screen.getByText("Pending")).toBeInTheDocument();
  });

  test("muestra Pending cuando no hay estado", () => {
    render(<StatusBadge />);

    expect(screen.getByText("Pending")).toBeInTheDocument();
  });

  test("cambia el color de checked_out cuando se indica checkedOutColor", () => {
    const { container: porDefecto } = render(<StatusBadge status="checked_out" />);
    const { container: conColor } = render(
      <StatusBadge status="checked_out" checkedOutColor="success" />
    );

    expect(conColor.innerHTML).not.toEqual(porDefecto.innerHTML);
  });

  test("ignora checkedOutColor en los estados distintos de checked_out", () => {
    const { container: sinColor } = render(<StatusBadge status="confirmed" />);
    const { container: conColor } = render(
      <StatusBadge status="confirmed" checkedOutColor="pink" />
    );

    expect(conColor.innerHTML).toEqual(sinColor.innerHTML);
  });
});
