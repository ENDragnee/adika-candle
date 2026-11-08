import { axiosInstance } from "@/lib/axios";
import type {
  CreateUserInput,
  CreateUserResponse,
  UpdateUserInput,
  UserDTO,
} from "../validators/user.schema";

export async function FetchUsers(): Promise<UserDTO[]> {
  const { data } = await axiosInstance.get<UserDTO[]>("/api/v1/users");
  return data;
}

export async function CreateUser(
  input: CreateUserInput,
): Promise<CreateUserResponse> {
  const { data } = await axiosInstance.post<CreateUserResponse>(
    "/api/v1/users",
    input,
  );
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
