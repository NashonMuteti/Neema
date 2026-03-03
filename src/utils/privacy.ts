export function maskEmail(email: string) {
  const value = String(email || "").trim();
  if (!value || !value.includes("@")) return value;

  const [localRaw, domainRaw] = value.split("@");
  const local = localRaw || "";
  const domain = domainRaw || "";

  const keepStart = Math.min(2, local.length);
  const keepEnd = local.length > 3 ? 1 : 0;
  const start = local.slice(0, keepStart);
  const end = keepEnd ? local.slice(-keepEnd) : "";
  const maskedLocal = `${start}${"*".repeat(Math.max(3, local.length - keepStart - keepEnd))}${end}`;

  // Keep domain readable but mask part of the first label.
  const domainParts = domain.split(".");
  const firstLabel = domainParts[0] || "";
  const maskedFirstLabel = firstLabel.length <= 2 ? `${firstLabel[0] || ""}***` : `${firstLabel.slice(0, 2)}***`;
  const maskedDomain = [maskedFirstLabel, ...domainParts.slice(1)].filter(Boolean).join(".");

  return `${maskedLocal}@${maskedDomain}`;
}

export function maskPhone(phone: string) {
  const value = String(phone || "").trim();
  if (!value) return value;

  const digits = value.replace(/\D/g, "");
  if (digits.length <= 4) return "****";

  const last4 = digits.slice(-4);
  const maskedDigits = `${"*".repeat(Math.max(4, digits.length - 4))}${last4}`;

  // Preserve the original formatting roughly by returning masked digits.
  return maskedDigits;
}
