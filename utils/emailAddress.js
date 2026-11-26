export const isGmailAddress = (email) =>
  typeof email === "string" && /^[^\s@]+@gmail\.com$/i.test(email.trim());
