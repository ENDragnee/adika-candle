import { hash, compare, genSalt } from "bcrypt";

export async function HashPassword(password: string): Promise<string> {
  const saltRound = Number(process.env.ROUND_SALT);

  if (!saltRound || Number.isNaN(saltRound)) {
    throw new Error(
      "ROUND_SALT has not been loaded or it is not a vaild number",
    );
  }
  const salt = await genSalt(saltRound);

  return await hash(password, salt);
}

export async function ValidatePassword(
  password: string,
  hashed_password: string,
): Promise<boolean> {
  return await compare(password, hashed_password);
}
