import { z } from "zod";
import { PASSWORD_MAX } from "../domain/user";

/** Contratos de entrada de los endpoints de autenticación. */
export const registerSchema = z.object({
  email: z.string().min(3).max(254),
  password: z.string().min(1).max(PASSWORD_MAX),
  displayName: z.string().max(80).default(""),
});

export const loginSchema = z.object({
  email: z.string().min(3).max(254),
  password: z.string().min(1).max(PASSWORD_MAX),
});
