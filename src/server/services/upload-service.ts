import { randomUUID } from "node:crypto";

import { isDemoMode } from "@/lib/demo-mode";
import { createSupabaseAdminClient } from "@/lib/supabase";

const MAX_PAYMENT_PROOF_SIZE = 1 * 1024 * 1024;
const allowedPaymentProofTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["application/pdf", "pdf"],
]);

export class UploadValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UploadValidationError";
  }
}

export async function uploadPaymentProof(file: File, profileId: string) {
  if (file.size <= 0) {
    throw new UploadValidationError("Payment proof file is required.");
  }

  if (file.size > MAX_PAYMENT_PROOF_SIZE) {
    throw new UploadValidationError("Payment proof file must be 1MB or smaller.");
  }

  const extension = allowedPaymentProofTypes.get(file.type);

  if (!extension) {
    throw new UploadValidationError("Payment proof must be a JPG, PNG, WEBP, or PDF file.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const objectPath = `payment-proofs/${profileId}/${randomUUID()}.${extension}`;

  if (isDemoMode) {
    return `https://example.com/demo-storage/${objectPath}`;
  }

  const bucket = process.env.SUPABASE_STORAGE_BUCKET;
  const hasStorageConfig = Boolean(bucket && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!hasStorageConfig || !bucket) {
    return `data:${file.type};base64,${buffer.toString("base64")}`;
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.storage.from(bucket).upload(objectPath, buffer, {
    contentType: file.type,
    upsert: false,
  });

  if (error) {
    throw new UploadValidationError("Payment proof upload failed.");
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(objectPath);

  return data.publicUrl;
}
