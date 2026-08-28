// Where an agency operates decides three things at once: the currency it bills
// in, what its sales tax is called, and what its tax registration number is
// called. Picking a country at signup sets all of them, so nobody has to know
// what "TCS" is to use the product outside India.
//
// Each entry is a starting point, not a rule — every field is editable in
// Settings afterwards, because rates change and agencies bill in currencies
// other than their own.

export type CountryPreset = {
  code: string; // ISO 3166-1 alpha-2
  name: string;
  currency: string; // ISO 4217
  locale: string; // drives digit grouping — en-IN groups as 1,00,000
  taxLabel: string; // the primary sales tax
  taxRate: number; // sensible default for a tour package, in percent
  taxLabel2: string; // a second levy, only India has one worth modelling
  taxRate2: number;
  taxIdLabel: string; // what the registration number is called
  dial: string; // international dialling code, for WhatsApp links
};

// India first — it's where the product started and most users still are.
export const COUNTRIES: CountryPreset[] = [
  { code: "IN", name: "India",          currency: "INR", locale: "en-IN", taxLabel: "GST", taxRate: 5,  taxLabel2: "TCS", taxRate2: 2, taxIdLabel: "GSTIN" , dial: "91" },
  { code: "AE", name: "United Arab Emirates", currency: "AED", locale: "en-AE", taxLabel: "VAT", taxRate: 5,  taxLabel2: "", taxRate2: 0, taxIdLabel: "TRN" , dial: "971" },
  { code: "AU", name: "Australia",      currency: "AUD", locale: "en-AU", taxLabel: "GST", taxRate: 10, taxLabel2: "", taxRate2: 0, taxIdLabel: "ABN" , dial: "61" },
  { code: "CA", name: "Canada",         currency: "CAD", locale: "en-CA", taxLabel: "GST/HST", taxRate: 5, taxLabel2: "", taxRate2: 0, taxIdLabel: "GST number" , dial: "1" },
  { code: "DE", name: "Germany",        currency: "EUR", locale: "de-DE", taxLabel: "VAT", taxRate: 19, taxLabel2: "", taxRate2: 0, taxIdLabel: "VAT ID" , dial: "49" },
  { code: "ES", name: "Spain",          currency: "EUR", locale: "es-ES", taxLabel: "IVA", taxRate: 21, taxLabel2: "", taxRate2: 0, taxIdLabel: "NIF" , dial: "34" },
  { code: "FR", name: "France",         currency: "EUR", locale: "fr-FR", taxLabel: "TVA", taxRate: 20, taxLabel2: "", taxRate2: 0, taxIdLabel: "VAT ID" , dial: "33" },
  { code: "ID", name: "Indonesia",      currency: "IDR", locale: "id-ID", taxLabel: "PPN", taxRate: 11, taxLabel2: "", taxRate2: 0, taxIdLabel: "NPWP" , dial: "62" },
  { code: "IT", name: "Italy",          currency: "EUR", locale: "it-IT", taxLabel: "IVA", taxRate: 22, taxLabel2: "", taxRate2: 0, taxIdLabel: "P.IVA" , dial: "39" },
  { code: "KE", name: "Kenya",          currency: "KES", locale: "en-KE", taxLabel: "VAT", taxRate: 16, taxLabel2: "", taxRate2: 0, taxIdLabel: "KRA PIN" , dial: "254" },
  { code: "LK", name: "Sri Lanka",      currency: "LKR", locale: "en-LK", taxLabel: "VAT", taxRate: 18, taxLabel2: "", taxRate2: 0, taxIdLabel: "VAT number" , dial: "94" },
  { code: "MY", name: "Malaysia",       currency: "MYR", locale: "ms-MY", taxLabel: "SST", taxRate: 6,  taxLabel2: "", taxRate2: 0, taxIdLabel: "SST number" , dial: "60" },
  { code: "NP", name: "Nepal",          currency: "NPR", locale: "ne-NP", taxLabel: "VAT", taxRate: 13, taxLabel2: "", taxRate2: 0, taxIdLabel: "PAN" , dial: "977" },
  { code: "NZ", name: "New Zealand",    currency: "NZD", locale: "en-NZ", taxLabel: "GST", taxRate: 15, taxLabel2: "", taxRate2: 0, taxIdLabel: "GST number" , dial: "64" },
  { code: "PH", name: "Philippines",    currency: "PHP", locale: "en-PH", taxLabel: "VAT", taxRate: 12, taxLabel2: "", taxRate2: 0, taxIdLabel: "TIN" , dial: "63" },
  { code: "SG", name: "Singapore",      currency: "SGD", locale: "en-SG", taxLabel: "GST", taxRate: 9,  taxLabel2: "", taxRate2: 0, taxIdLabel: "GST number" , dial: "65" },
  { code: "TH", name: "Thailand",       currency: "THB", locale: "th-TH", taxLabel: "VAT", taxRate: 7,  taxLabel2: "", taxRate2: 0, taxIdLabel: "Tax ID" , dial: "66" },
  { code: "TR", name: "Türkiye",        currency: "TRY", locale: "tr-TR", taxLabel: "KDV", taxRate: 20, taxLabel2: "", taxRate2: 0, taxIdLabel: "Tax number" , dial: "90" },
  { code: "GB", name: "United Kingdom", currency: "GBP", locale: "en-GB", taxLabel: "VAT", taxRate: 20, taxLabel2: "", taxRate2: 0, taxIdLabel: "VAT number" , dial: "44" },
  { code: "US", name: "United States",  currency: "USD", locale: "en-US", taxLabel: "Sales tax", taxRate: 0, taxLabel2: "", taxRate2: 0, taxIdLabel: "EIN" , dial: "1" },
  { code: "VN", name: "Vietnam",        currency: "VND", locale: "vi-VN", taxLabel: "VAT", taxRate: 8,  taxLabel2: "", taxRate2: 0, taxIdLabel: "Tax code" , dial: "84" },
  { code: "ZA", name: "South Africa",   currency: "ZAR", locale: "en-ZA", taxLabel: "VAT", taxRate: 15, taxLabel2: "", taxRate2: 0, taxIdLabel: "VAT number" , dial: "27" },
];

export const DEFAULT_COUNTRY = COUNTRIES[0]; // India

export function countryPreset(code: string | null | undefined): CountryPreset {
  return COUNTRIES.find((c) => c.code === code) ?? DEFAULT_COUNTRY;
}

// Currencies an agency might bill in even when it isn't their own — an Indian
// operator selling a European tour often prices in euros.
export const CURRENCIES = [...new Set(COUNTRIES.map((c) => c.currency))].sort();
