import { describe, it, expect } from "vitest";
import { signUpSchema, signInSchema } from "./auth";

describe("signUpSchema", () => {
  it("acepta correo y contraseña válidos", () => {
    const result = signUpSchema.safeParse({ email: "a@b.com", password: "Segura123!" });
    expect(result.success).toBe(true);
  });

  it("rechaza correo inválido", () => {
    const result = signUpSchema.safeParse({ email: "no-es-correo", password: "Segura123!" });
    expect(result.success).toBe(false);
  });

  it("rechaza contraseñas de menos de 8 caracteres", () => {
    const result = signUpSchema.safeParse({ email: "a@b.com", password: "corta" });
    expect(result.success).toBe(false);
  });
});

describe("signInSchema", () => {
  it("acepta correo y contraseña no vacíos", () => {
    const result = signInSchema.safeParse({ email: "a@b.com", password: "cualquiera" });
    expect(result.success).toBe(true);
  });

  it("rechaza contraseña vacía", () => {
    const result = signInSchema.safeParse({ email: "a@b.com", password: "" });
    expect(result.success).toBe(false);
  });
});
