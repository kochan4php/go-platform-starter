import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type Mock, afterEach, expect, it, vi } from "vitest";
import UsersPage from "./UsersPage";

const getMock = vi.fn();
const deleteMock = vi.fn();

vi.mock("./api-client", () => ({
  api: {
    GET: (...a: unknown[]) => getMock(...a),
    POST: (...a: unknown[]) => deleteMock(...a),
    PATCH: (...a: unknown[]) => deleteMock(...a),
    DELETE: (...a: unknown[]) => deleteMock(...a),
  },
}));

afterEach(() => {
  cleanup();
  getMock.mockReset();
  deleteMock.mockReset();
});

function mount() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <UsersPage />
    </QueryClientProvider>,
  );
}

it("renders the paginated table and deletes a profile", async () => {
  (getMock as Mock).mockResolvedValue({
    data: {
      success: true,
      message: "ok",
      data: {
        items: [{ id: "11111111-1111-1111-1111-111111111111", displayName: "Ada", avatarUrl: "" }],
        meta: { limit: 20, offset: 0, total: 1 },
      },
    },
  });
  (deleteMock as Mock).mockResolvedValue({ data: { success: true }, error: undefined });

  mount();
  await waitFor(() => expect(screen.getByText("Users (1)")).toBeTruthy());
  // the name renders twice by design: latest-arrival card + table row
  expect(screen.getAllByText("Ada").length).toBeGreaterThan(0);

  await userEvent.click(screen.getByRole("button", { name: "Delete" }));
  await waitFor(() => expect(deleteMock).toHaveBeenCalledTimes(1));
  const [, opts] = (deleteMock as Mock).mock.calls[0] as [string, { params: { path: { id: string } } }];
  expect(opts.params.path.id).toBe("11111111-1111-1111-1111-111111111111");
});
