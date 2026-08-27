import { createApiClient } from "@starter/contracts";

export const api = createApiClient();

export interface Role {
  id: number;
  name: string;
  description: string;
  permissions: string[];
  color: string;
  icon: string;
  archived: boolean;
  createdAt: string;
  userCount: number;
  system: boolean;
}

export interface PermissionInfo {
  name: string;
  createdAt: string;
  roleCount: number;
}
