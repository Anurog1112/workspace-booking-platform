import { afterEach, describe, expect, it, vi } from "vitest";

import { UploadValidationError, uploadPaymentProof } from "@/server/services/upload-service";

describe("upload-service", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("stores a small payment proof inline when Supabase Storage is not configured", async () => {
    vi.stubEnv("SUPABASE_STORAGE_BUCKET", "");
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    const file = new File([new Uint8Array([1, 2, 3])], "proof.png", { type: "image/png" });

    await expect(uploadPaymentProof(file, "profile_1")).resolves.toBe("data:image/png;base64,AQID");
  });

  it("rejects files larger than the inline-safe limit", async () => {
    const file = new File([new Uint8Array(1024 * 1024 + 1)], "proof.jpg", { type: "image/jpeg" });

    await expect(uploadPaymentProof(file, "profile_1")).rejects.toThrow(UploadValidationError);
  });

  it("rejects unsupported file types", async () => {
    const file = new File(["not a payment proof"], "proof.txt", { type: "text/plain" });

    await expect(uploadPaymentProof(file, "profile_1")).rejects.toThrow("Payment proof must be a JPG, PNG, WEBP, or PDF file.");
  });
});
