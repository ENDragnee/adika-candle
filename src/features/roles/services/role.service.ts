import { axiosInstance } from "@/lib/axios";
import type {
  CreateRoleInput,
  RoleDTO,
  RolesResponse,
  UpdateRoleInput,
} from "../validators/role.schema";

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

export async function CreateRole(input: CreateRoleInput): Promise<RoleDTO> {
  const { data } = await axiosInstance.post<RoleDTO>("/api/v1/roles", input);
  return data;
}

export async function UpdateRole(
  roleId: string,
  input: UpdateRoleInput,
): Promise<RoleDTO> {
  const { data } = await axiosInstance.patch<RoleDTO>(
    `/api/v1/roles/${roleId}`,
    input,
  );
  return data;
}

export async function DeleteRole(roleId: string): Promise<RoleDTO> {
  const { data } = await axiosInstance.delete<RoleDTO>(
    `/api/v1/roles/${roleId}`,
  );
  return data;
}
