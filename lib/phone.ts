import {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js/max";

export const PHONE_COUNTRIES = getCountries()
  .map((code) => ({
    code,
    callingCode: `+${getCountryCallingCode(code)}`,
    name: new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code,
  }))
  .sort((left, right) => left.code === "NA" ? -1 : right.code === "NA" ? 1 : left.name.localeCompare(right.name));

function regionFor(value: string): CountryCode | undefined {
  if (!value.startsWith("+")) return value as CountryCode;
  const dial = value.replace(/\D/g, "");
  return PHONE_COUNTRIES.find((country) => country.callingCode.replace(/\D/g, "") === dial)?.code;
}

export function normalizeAdminPhone(country: string, phone: string): string {
  const trimmed = phone.trim();
  const region = regionFor(country);
  const parsed = trimmed.startsWith("+")
    ? parsePhoneNumberFromString(trimmed)
    : region ? parsePhoneNumberFromString(trimmed, region) : undefined;
  return parsed?.isValid() ? parsed.number : "";
}

export function isValidInternationalPhone(phone: string): boolean {
  return parsePhoneNumberFromString(phone)?.isValid() ?? false;
}

export function normalizeInternationalPhone(phone: string): string | null {
  const parsed = parsePhoneNumberFromString(phone);
  return parsed?.isValid() ? parsed.number : null;
}

export function countryForPhone(phone: string, fallback: CountryCode = "NA"): CountryCode {
  return parsePhoneNumberFromString(phone)?.country ?? fallback;
}
