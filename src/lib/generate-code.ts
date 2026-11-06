import z from "zod";

const GenerateCodeSchema = z
  .object({
    length: z
      .int()
      .positive()
      .min(6, "The minimmum code length is 6")
      .max(12, "The maximum code length is 12")
      .optional()
      .default(7),
    mode: z.enum(["UPPER", "LOWER", "MIXED"]).optional().default("UPPER"),
  })
  .default({ length: 7, mode: "UPPER" });

type GenerateCodeInput = z.infer<typeof GenerateCodeSchema>;

export function GenerateCode(params?: GenerateCodeInput) {
  try {
    const safeParams = GenerateCodeSchema.parse(params);
    const { length, mode } = safeParams;
    let vaidChars;

    const chars = "1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    if (mode === "LOWER") {
      vaidChars = chars.toLowerCase();
    } else if (mode === "MIXED") {
      vaidChars = chars + "abcdefghijklmnopqrstuvwzy";
    } else {
      vaidChars = chars;
    }

    let invoiceCode: string = "";

    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * vaidChars.length);
      invoiceCode += vaidChars[randomIndex];
    }

    return invoiceCode;
  } catch (err: any) {
    console.error(err.message);
  }
}
