import { parsePhoneNumberFromString } from "libphonenumber-js";

export function normalizePhoneNumber(value) {
  if (typeof value !== "string") return value;

  const parsedNumber = parsePhoneNumberFromString(value, "EG");
  return parsedNumber?.isValid() ? parsedNumber.number : value.trim();
}
