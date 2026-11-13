export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days, in seconds

// The factory's local time zone. Every "day"/"week"/"month" bucket in
// analytics is cut at local midnight here, not UTC midnight — otherwise a
// sale at 01:30 local time lands on the previous day. See
// docs/DECISIONS.md, "Epic 21 decisions".
export const BUSINESS_TIMEZONE = "Africa/Addis_Ababa";

// Display currency for every money amount in the UI. Amounts are stored as
// plain Decimals with no currency column — the business trades in one
// currency only.
export const BUSINESS_CURRENCY = "ETB";
export const BUSINESS_LOCALE = "en-US";
