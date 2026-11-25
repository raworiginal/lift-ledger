import { describe, expect, it } from "vitest";
import { formatSetWeight, formatWeightOneDecimal } from "~/utils/format-weight";

describe("formatWeightOneDecimal", () => {
  it("pads whole and two-decimal values to one decimal", () => {
    expect(formatWeightOneDecimal("80")).toBe("80.0");
    expect(formatWeightOneDecimal("80.00")).toBe("80.0");
    expect(formatWeightOneDecimal("2.5")).toBe("2.5");
  });

  it("rounds a second decimal half up", () => {
    expect(formatWeightOneDecimal("82.25")).toBe("82.3");
    expect(formatWeightOneDecimal("82.24")).toBe("82.2");
    expect(formatWeightOneDecimal("9.96")).toBe("10.0");
    expect(formatWeightOneDecimal("0.15")).toBe("0.2");
  });

  it("keeps the sign on negative weights", () => {
    expect(formatWeightOneDecimal("-27.50")).toBe("-27.5");
    expect(formatWeightOneDecimal("-9.96")).toBe("-10.0");
  });
});

describe("formatSetWeight", () => {
  it("shows regular weights with the unit", () => {
    expect(formatSetWeight("135.00", "lb", false)).toBe("135 lb");
    expect(formatSetWeight("82.50", "kg", false)).toBe("82.5 kg");
  });

  it("shows assisted weights as positive assistance", () => {
    expect(formatSetWeight("-20.00", "lb", true)).toBe("20 lb assist");
    expect(formatSetWeight("-2.50", "kg", true)).toBe("2.5 kg assist");
  });

  it("shows zero assistance as bodyweight", () => {
    expect(formatSetWeight("0.00", "lb", true)).toBe("Bodyweight");
  });

  it("applies a custom number format", () => {
    expect(formatSetWeight("-82.25", "kg", true, formatWeightOneDecimal)).toBe(
      "82.3 kg assist",
    );
  });
});
