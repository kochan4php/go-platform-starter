import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { createRef } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../auth-context";
import { CommandPalette } from "./CommandPalette";
import { MobileBottomNav } from "./MobileBottomNav";
import { ShortcutsHelp } from "./ShortcutsHelp";

function mount(ui: React.ReactNode) {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider initialUser={null}>
        <MemoryRouter initialEntries={["/admin/users"]}>{ui}</MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("CommandPalette", () => {
  it("renders and accepts input", () => {
    mount(<CommandPalette onClose={() => {}} />);
    const input = screen.getByPlaceholderText(/type a command/i);
    expect(input).toBeTruthy();
    fireEvent.change(input, { target: { value: "users" } });
    expect(screen.getByRole("button", { name: /users/i })).toBeTruthy();
  });

  it("filters via fuzzy match — substring", () => {
    mount(<CommandPalette onClose={() => {}} />);
    const input = screen.getByPlaceholderText(/type a command/i);
    fireEvent.change(input, { target: { value: "role" } });
    expect(screen.getByRole("button", { name: /roles/i })).toBeTruthy();
  });

  it("closes on Escape", () => {
    const onClose = vi.fn();
    mount(<CommandPalette onClose={onClose} />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });
});

describe("ShortcutsHelp", () => {
  it("lists every documented shortcut", () => {
    mount(<ShortcutsHelp onClose={() => {}} />);
    expect(screen.getByText(/keyboard shortcuts/i)).toBeTruthy();
    expect(screen.getByText(/open command palette/i)).toBeTruthy();
    expect(screen.getByText(/go to users/i)).toBeTruthy();
  });

  it("closes on Escape", () => {
    const onClose = vi.fn();
    mount(<ShortcutsHelp onClose={onClose} />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });
});

describe("MobileBottomNav", () => {
  it("shows at most four priority links plus the sidebar toggle", () => {
    const onToggleMenu = vi.fn();
    mount(
      <MobileBottomNav
        menuOpen={false}
        onToggleMenu={onToggleMenu}
        menuButtonRef={createRef<HTMLButtonElement>()}
      />,
    );

    const navigation = screen.getByRole("navigation", { name: "Mobile navigation" });
    expect(navigation.classList.contains("ui-mobile-nav")).toBe(true);
    expect(within(navigation).getAllByRole("link").length).toBeLessThanOrEqual(4);
    const navigationIcons = Array.from(navigation.querySelectorAll("svg"));
    expect(navigationIcons).toHaveLength(4);
    expect(navigationIcons.every((icon) => icon.classList.contains("size-6"))).toBe(true);
    expect(within(navigation).getAllByRole("link").length + 1).toBeLessThanOrEqual(5);
    expect(within(navigation).getByText("Roles")).toBeTruthy();
    expect(within(navigation).queryByText("Roles & Permissions")).toBeNull();

    fireEvent.click(within(navigation).getByRole("button", { name: "Open menu" }));
    expect(onToggleMenu).toHaveBeenCalledTimes(1);
  });
});
