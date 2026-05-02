import { formatElevation, formatWind } from "@/lib/utils";

describe("utility formatting", () => {
  it("formats elevation values", () => {
    expect(formatElevation(10420)).toBe("10,420 ft");
  });

  it("formats wind values", () => {
    expect(formatWind(32, "W")).toBe("W 32 mph");
  });
});
