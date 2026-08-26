import { createApiClient } from "@starter/contracts";

export const api = createApiClient();

export interface Role {
  id: number;
  name: string;
  description: string;
  permissions: string[];
}
