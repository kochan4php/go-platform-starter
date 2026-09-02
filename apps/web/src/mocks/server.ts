import { setupServer } from "msw/node";
import { handlers } from "./handlers.ts";

export const mockServer = setupServer(...handlers);
