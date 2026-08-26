import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConfirmProvider, DrawerProvider, ToastProvider, useConfirm, useDrawer, useToast } from "./ui";

function mount(ui: React.ReactNode) {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ConfirmProvider>
          <DrawerProvider>{ui}</DrawerProvider>
        </ConfirmProvider>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.useRealTimers();
});

describe("useToast", () => {
  it("surfaces a success message", () => {
    function Probe() {
      const toast = useToast();
      return (
        <button type="button" onClick={() => toast("success", "Saved!")}>
          ping
        </button>
      );
    }
    mount(<Probe />);
    fireEvent.click(screen.getByText("ping"));
    expect(screen.getByText("Saved!")).toBeTruthy();
  });

  it("renders an undo action that triggers a callback", () => {
    const run = vi.fn();
    function Probe() {
      const toast = useToast();
      return (
        <button type="button" onClick={() => toast.undo("Item deleted", run)}>
          ping
        </button>
      );
    }
    mount(<Probe />);
    fireEvent.click(screen.getByText("ping"));
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(run).toHaveBeenCalled();
  });
});

describe("useConfirm", () => {
  it("resolves true on confirm and false on cancel", async () => {
    let resolveP: Promise<boolean> | undefined;
    function Probe() {
      const confirm = useConfirm();
      return (
        <button
          type="button"
          onClick={() => {
            resolveP = confirm("Delete this?", "Cannot be undone", { danger: true, label: "Delete" });
          }}
        >
          ask
        </button>
      );
    }
    mount(<Probe />);
    fireEvent.click(screen.getByText("ask"));
    expect(screen.getByText("Delete this?")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(async () => {
      expect(await resolveP).toBe(true);
    });
  });

  it("ESC resolves false", async () => {
    let resolved: boolean | undefined;
    function Probe() {
      const confirm = useConfirm();
      return (
        <button
          type="button"
          onClick={() => {
            confirm("Sure?").then((ok) => {
              resolved = ok;
            });
          }}
        >
          ask
        </button>
      );
    }
    mount(<Probe />);
    fireEvent.click(screen.getByText("ask"));
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => {
      expect(resolved).toBe(false);
    });
  });
});

describe("useDrawer", () => {
  it("opens and closes", () => {
    function Probe() {
      const drawer = useDrawer();
      return (
        <button
          type="button"
          onClick={() => drawer.open({ title: "Inspect", content: <p>contents here</p> })}
        >
          open
        </button>
      );
    }
    mount(<Probe />);
    fireEvent.click(screen.getByText("open"));
    expect(screen.getByRole("dialog", { name: /inspect/i })).toBeTruthy();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: /inspect/i })).toBeNull();
  });
});
