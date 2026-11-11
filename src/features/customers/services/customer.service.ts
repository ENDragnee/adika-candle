import { axiosInstance } from "@/lib/axios";
import type { Paginated, PaginationParams } from "@/lib/pagination";
import type {
  CreateCustomerInput,
  CustomerDTO,
  UpdateCustomerInput,
} from "../validators/customer.schema";

export type CustomersQueryParams = PaginationParams & { search?: string };

export async function FetchCustomers(
  params: CustomersQueryParams = {},
): Promise<Paginated<CustomerDTO>> {
  const { data } = await axiosInstance.get<Paginated<CustomerDTO>>(
    "/api/v1/customers",
    { params },
  );
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
