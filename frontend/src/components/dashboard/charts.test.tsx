import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Charts from "./charts";

describe("Charts", () => {
  it("shows a message instead of drawing a broken chart when there is no data", () => {
    render(<Charts charts={[{ chart_type: "bar", title: "Count by region", labels: ["a", "b"], values: [0, 0], column: "region" }]} />);
    expect(screen.getByText("Count by region")).toBeInTheDocument();
    expect(screen.getByText(/not enough data/i)).toBeInTheDocument();
  });

  it("labels each chart with its type", () => {
    render(<Charts charts={[
      { chart_type: "histogram", title: "Distribution of sales", labels: [], values: [], column: "sales" },
      { chart_type: "pie", title: "Share by region", labels: [], values: [], column: "region" },
    ]} />);
    expect(screen.getByText("Histogram")).toBeInTheDocument();
    expect(screen.getByText("Pie")).toBeInTheDocument();
  });
});
