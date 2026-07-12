"use server";

import { redirect } from "next/navigation";

import { signIn } from "@/lib/auth";

function isRedirectError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    String((error as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT")
  );
}

function isAuthFailure(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const maybeError = error as { name?: unknown; type?: unknown };
  return maybeError.name === "CredentialsSignin" || maybeError.type === "CredentialsSignin";
}

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "").trim();

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    if (isAuthFailure(error)) {
      redirect("/login?error=CredentialsSignin");
    }

    console.error("Login failed with an unexpected auth error.", error);
    redirect("/login?error=ServerError");
  }
}

export async function googleLoginAction() {
  await signIn("google", { redirectTo: "/dashboard" });
}
