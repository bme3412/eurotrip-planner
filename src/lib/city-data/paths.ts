export type CitySlug = string;
export type CountrySlug = string;

export type CityDataPaths = {
  base: string;
  city: string;
  attractions: string;
  experiences: string;
  food: string;
  neighborhoods: string;
  monthly: string;
  monthlyBase: string;
  monthlyTaglines: string;
  monthlyThingsToDo: string;
  monthlyIndex: string;
  photos: string;
};

const normalizeCountry = (value?: string) => (value || 'unknown').trim() || 'unknown';
const normalizeCity = (value?: string) =>
  (value || 'unknown')
    .trim()
    .toLowerCase();

export function getCityPaths(country?: CountrySlug, city?: CitySlug): CityDataPaths {
  const countrySlug = normalizeCountry(country);
  const citySlug = normalizeCity(city);
  const base = `/data/${countrySlug}/${citySlug}`;
  const cityFile = (suffix: string) => `${base}/${citySlug}${suffix}`;
  const monthlyBase = `${base}/monthly`;

  return {
    base,
    city: `${base}/city.json`,
    attractions: cityFile('-attractions.json'),
    experiences: cityFile('-experiences.json'),
    food: `${base}/food.json`,
    neighborhoods: `${base}/neighborhoods.json`,
    monthly: `${base}/monthly.json`,
    monthlyBase,
    monthlyTaglines: `${monthlyBase}/monthly-taglines.json`,
    monthlyThingsToDo: `${monthlyBase}/things-to-do.json`,
    monthlyIndex: `${monthlyBase}/index.json`,
    photos: `${base}/photos.json`
  };
}

export function buildCityDataUrl(country?: CountrySlug, city?: CitySlug, file?: string) {
  const { base } = getCityPaths(country, city);
  return file ? `${base}/${file}` : base;
}

