import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, expect, it } from "vitest";
import {
  DateRangePicker,
  I18nProvider,
  LocaleSwitch,
  ReorderList,
  StatTrend,
  useI18n,
  useVirtualList,
} from "./index";

afterEach(cleanup);

it("defaults to Indonesian and switches to English", () => {
  localStorage.clear();
  function Probe() {
    const { locale, t } = useI18n();
    return <p>{`${locale}:${t("nav.users")}`}</p>;
  }
  render(
    <I18nProvider>
      <LocaleSwitch />
      <Probe />
    </I18nProvider>,
  );
  expect(screen.getByText("id:Pengguna")).toBeTruthy();
  fireEvent.change(screen.getByLabelText("Language"), { target: { value: "en" } });
  expect(screen.getByText("en:Users")).toBeTruthy();
});

it("exposes deterministic virtual-list bounds", () => {
  function Probe() {
    const range = useVirtualList({ count: 100, rowHeight: 40, viewportHeight: 200, scrollTop: 400 });
    return <output>{JSON.stringify(range)}</output>;
  }
  render(<Probe />);
  expect(screen.getByText('{"start":6,"end":19,"paddingTop":240,"paddingBottom":3240}')).toBeTruthy();
});

it("announces invalid date ranges and trend direction", () => {
  render(
    <>
      <DateRangePicker start="2026-09-02" end="2026-09-01" onChange={() => undefined} />
      <StatTrend label="Active users" value="42" change={-3} />
    </>,
  );
  expect(screen.getByRole("alert")).toBeTruthy();
  expect(screen.getByLabelText("3 percent down")).toBeTruthy();
});

it("offers keyboard-operable reorder controls", () => {
  function Probe() {
    const [items, setItems] = useState(["alpha", "beta"]);
    return <ReorderList items={items} getKey={(item) => item} render={(item) => item} onReorder={setItems} />;
  }
  render(<Probe />);
  fireEvent.click(screen.getByRole("button", { name: "Move alpha down" }));
  expect(screen.getAllByRole("listitem").map((item) => item.textContent?.slice(0, 4))).toEqual([
    "beta",
    "alph",
  ]);
});
