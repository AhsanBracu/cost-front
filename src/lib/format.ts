export const CURRENCIES = ["SEK", "BDT", "USD", "CAD", "AUD"];

/** Must stay in sync with the backend schema defaults. */
export const DEFAULT_CURRENCY = "SEK";

export const currencyFormatter = (amount: number, currency: string) => {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
};

// Tuned for the dark canvas -- each hue is light enough to read against
// near-black, which the earlier light-background palette was not. Used for
// series that aren't category-based (e.g. currency lines), for new-category
// color defaults, and as the fallback pool for unknown categories.
export const CATEGORICAL_PALETTE = [
  "#6ea8ff",
  "#ff8a4c",
  "#00d68f",
  "#ffc857",
  "#ff85c0",
  "#37cdd6",
  "#a78bfa",
  "#ff6b6b",
];
