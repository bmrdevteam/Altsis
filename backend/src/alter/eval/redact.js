/** Remove provider keys from anything the eval prints. */
export const redactSecrets = (text, secrets = []) => {
  let out = String(text ?? "");
  for (const secret of secrets) {
    const value = String(secret || "");
    if (value.length < 8) continue;
    out = out.split(value).join("[redacted]");
  }
  return out;
};
