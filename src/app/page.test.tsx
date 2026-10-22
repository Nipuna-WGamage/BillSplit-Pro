import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import Home from "./page";

afterEach(cleanup);

describe("home page", () => {
  it("renders the dashboard heading", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /good afternoon, nipun/i,
      }),
    ).toBeTruthy();
  });

  it("clearly identifies the dashboard data as a demo", () => {
    render(<Home />);

    expect(screen.getByRole("note").textContent).toContain(
      "Sample data only — nothing here is saved or real.",
    );
  });

  it("provides labeled desktop and mobile navigation", () => {
    render(<Home />);

    expect(screen.getByRole("navigation", { name: "Main navigation" })).toBeTruthy();
    expect(screen.getByRole("navigation", { name: "Mobile navigation" })).toBeTruthy();
    expect(
      within(
        screen.getByRole("navigation", { name: "Main navigation" }),
      )
        .getByRole("link", { name: "Expenses" })
        .getAttribute("href"),
    ).toBe("#recent-activity");
  });

  it("labels the search field for assistive technology", () => {
    render(<Home />);

    expect(screen.getByRole("textbox", { name: "Search expenses" })).toBeTruthy();
  });
});
