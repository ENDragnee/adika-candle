import { axiosInstance } from "@/lib/axios";
import type { RoleDTO, RolesResponse } from "../validators/role.schema";

export async function FetchRoles(): Promise<RolesResponse> {
  const { data } = await axiosInstance.get<RolesResponse>("/api/v1/roles");
  return data;
}

export async function UpdateRolePermissions(
  roleId: string,
  permissionIds: string[],
): Promise<RoleDTO> {
  const { data } = await axiosInstance.patch<RoleDTO>(
    `/api/v1/roles/${roleId}/permissions`,
    { permissionIds },
  );
  return data;
}
