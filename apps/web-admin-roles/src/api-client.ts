import { createApiClient } from "@starter/contracts";

export const api = createApiClient();

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
}
