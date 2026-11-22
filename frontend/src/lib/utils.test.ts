import { describe, expect, it } from "vitest";
import { cn, formatBytes, formatNumber, friendlyType } from "./utils";

describe("formatBytes", () => {
  it("handles zero and scales units", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(100 * 1024 * 1024)).toBe("100.0 MB");
  });
});

describe("formatNumber", () => {
  it("shows a dash for missing values and rounds to two decimals", () => {
    expect(formatNumber(null)).toBe("—");
    expect(formatNumber(undefined)).toBe("—");
    expect(formatNumber(1234.5678)).toBe("1,234.57");
  });
});

describe("cn", () => {
  it("merges conflicting tailwind classes, last one wins", () => {
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
  });
});

describe("friendlyType", () => {
  it("translates pandas types into plain words", () => {
    expect(friendlyType("int64")).toBe("integer");
    expect(friendlyType("float64")).toBe("decimal");
    expect(friendlyType("bool")).toBe("yes / no");
    expect(friendlyType("datetime64[ns]")).toBe("date");
    expect(friendlyType("object")).toBe("text");
    expect(friendlyType("str")).toBe("text");
  });
});
