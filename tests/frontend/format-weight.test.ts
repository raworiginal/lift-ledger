import { describe, expect, it } from "vitest";
import { formatWeightOneDecimal } from "~/utils/format-weight";

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
});
