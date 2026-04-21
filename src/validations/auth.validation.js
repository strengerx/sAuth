import { z } from "zod";

const requiredString = (field) => {
    return z
        .string({
            required_error: `${field} is required`,
            invalid_type_error: `${field} must be a string`
        })
        .trim()
        .min(1, `${field} is required`);
};

const emailField = requiredString("Email")
    .email("Email must be a valid email")
    .transform((value) => value.toLowerCase());

const passwordField = requiredString("Password")
    .min(6, "Password must be at least 6 characters")
    .max(72, "Password must not exceed 72 characters");

export const registerSchema = z
    .object({
        name: requiredString("Name").max(100, "Name must not exceed 100 characters"),
        email: emailField,
        password: passwordField
    })
    .strict("Unexpected field(s) in request body");

export const authenticateSchema = z
    .object({
        email: emailField,
        password: requiredString("Password")
    })
    .strict("Unexpected field(s) in request body");

export const refreshSchema = z
    .object({
        refreshToken: requiredString("Refresh token")
    })
    .strict("Unexpected field(s) in request body");
