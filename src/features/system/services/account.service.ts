import { axiosInstance } from "@/lib/axios";
import type { ChangeOwnPasswordInput } from "../validators/account.schema";

export async function ChangeOwnPassword(
  input: ChangeOwnPasswordInput,
): Promise<void> {
  await axiosInstance.post("/api/v1/account/password", input);
}
