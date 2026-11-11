import { axiosInstance } from "@/lib/axios";
import type { Paginated, PaginationParams } from "@/lib/pagination";
import type {
  CreateUserInput,
  SetUserPasswordInput,
  UpdateUserInput,
  UserDTO,
} from "../validators/user.schema";

export async function FetchUsers(
  params: PaginationParams = {},
): Promise<Paginated<UserDTO>> {
  const { data } = await axiosInstance.get<Paginated<UserDTO>>(
    "/api/v1/users",
    { params },
  );
  return data;
}

export async function CreateUser(input: CreateUserInput): Promise<UserDTO> {
  const { data } = await axiosInstance.post<UserDTO>("/api/v1/users", input);
  return data;
}

export async function UpdateUser(
  id: string,
  input: UpdateUserInput,
): Promise<UserDTO> {
  const { data } = await axiosInstance.patch<UserDTO>(
    `/api/v1/users/${id}`,
    input,
  );
  return data;
}

export async function SetUserPassword(
  id: string,
  input: SetUserPasswordInput,
): Promise<void> {
  await axiosInstance.patch(`/api/v1/users/${id}/password`, input);
}
