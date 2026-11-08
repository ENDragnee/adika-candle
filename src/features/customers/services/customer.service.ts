import { axiosInstance } from "@/lib/axios";
import type {
  CreateCustomerInput,
  CustomerDTO,
  UpdateCustomerInput,
} from "../validators/customer.schema";

export async function FetchCustomers(): Promise<CustomerDTO[]> {
  const { data } = await axiosInstance.get<CustomerDTO[]>("/api/v1/customers");
  return data;
}

export async function FetchCustomer(id: string): Promise<CustomerDTO> {
  const { data } = await axiosInstance.get<CustomerDTO>(
    `/api/v1/customers/${id}`,
  );
  return data;
}

export async function CreateCustomer(
  input: CreateCustomerInput,
): Promise<CustomerDTO> {
  const { data } = await axiosInstance.post<CustomerDTO>(
    "/api/v1/customers",
    input,
  );
  return data;
}

export async function UpdateCustomer(
  id: string,
  input: UpdateCustomerInput,
): Promise<CustomerDTO> {
  const { data } = await axiosInstance.patch<CustomerDTO>(
    `/api/v1/customers/${id}`,
    input,
  );
  return data;
}
