/**
 * Country list for the onboarding wizard's combobox.
 *
 * A static list rather than Intl.DisplayNames output: the set of codes
 * available to Intl varies by runtime and ICU build, so generating it would
 * make the same form show different options on different machines, and the
 * value written to onboarding_responses.country would not be stable.
 */
export const COUNTRIES = [
  "Argentina", "Australia", "Austria", "Bangladesh", "Belgium", "Brazil",
  "Bulgaria", "Canada", "Chile", "China", "Colombia", "Croatia", "Czechia",
  "Denmark", "Egypt", "Estonia", "Ethiopia", "Finland", "France", "Germany",
  "Ghana", "Greece", "Hong Kong", "Hungary", "Iceland", "India", "Indonesia",
  "Iran", "Ireland", "Israel", "Italy", "Japan", "Jordan", "Kenya", "Latvia",
  "Lithuania", "Malaysia", "Mexico", "Morocco", "Netherlands", "New Zealand",
  "Nigeria", "Norway", "Pakistan", "Peru", "Philippines", "Poland", "Portugal",
  "Qatar", "Romania", "Saudi Arabia", "Serbia", "Singapore", "Slovakia",
  "Slovenia", "South Africa", "South Korea", "Spain", "Sri Lanka", "Sweden",
  "Switzerland", "Taiwan", "Thailand", "Tunisia", "Turkey", "Ukraine",
  "United Arab Emirates", "United Kingdom", "United States", "Uruguay",
  "Vietnam", "Other",
] as const;
