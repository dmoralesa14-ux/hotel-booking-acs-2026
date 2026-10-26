import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AboutUs from "./AboutUs";
import Booking from "./Booking";
import Home from "./Home";

const categorias = [
  {
    id: 1,
    category_name: "Suite Presidencial",
    image: "suite.png",
    price: 150,
    description: "Habitación amplia",
  },
];

describe("Páginas públicas con categorías de habitación", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", (query) => ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
    }));
    vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
    vi.stubGlobal("IntersectionObserver", class { observe() {} unobserve() {} disconnect() {} });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, roomcategories: categorias }),
      })
    );
    window.scrollTo = vi.fn();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test.each([
    ["AboutUs", AboutUs],
    ["Booking", Booking],
    ["Home", Home],
  ])("%s consulta las categorías y muestra su imagen desde /uploads", async (nombre, Pagina) => {
    const { container } = render(
      <MemoryRouter>
        <Pagina />
      </MemoryRouter>
    );

    expect((await screen.findAllByText("Suite Presidencial")).length).toBeGreaterThan(0);
    expect(fetch).toHaveBeenCalledWith("/api/roomcategory/getroomcategories");
    expect(container.querySelector('img[src="/uploads/suite.png"]')).not.toBeNull();
  });
});
