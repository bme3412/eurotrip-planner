import { notFound } from "next/navigation";
import fsPromises from "fs/promises";
import path from "path";
import CityPageClient from "@/components/city-guides/CityPageClient";

// Function to capitalize the first letter of each word
const capitalize = (str) => {
  if (!str) return "";
  return str
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

// This file provides server-side data loading and passes it to the client UI component.

// Helper to check if a file path exists (optional but good practice)
async function pathExists(filePath) {
  try {
    await fsPromises.access(filePath);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return false;
    } else {
      throw error;
    }
  }
}

// Fetch manifest file helper using fs
async function getManifest() {
  const manifestPath = path.join(process.cwd(), 'public', 'data', 'manifest.json');
  try {
    // Check if manifest exists before reading
    if (!(await pathExists(manifestPath))) {
        console.error(`Manifest file not found at: ${manifestPath}`);
        return null;
    }
    const fileContent = await fsPromises.readFile(manifestPath, "utf8");
    return JSON.parse(fileContent);
  } catch (error) {
    console.error(`Error reading or parsing manifest.json from ${manifestPath}:`, error);
    return null; // Indicate failure
  }
}

export async function generateStaticParams() {
  const manifest = await getManifest();
  if (!manifest || !manifest.cities) {
    console.error('No manifest or cities found, returning empty array');
    return [];
  }

  return Object.keys(manifest.cities).map((cityName) => ({
    city: cityName.toLowerCase(),
  }));
}

async function readJsonFile(filePath) {
  try {
    const fileContent = await fsPromises.readFile(filePath, "utf8");
    return JSON.parse(fileContent);
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return null;
  }
}

async function getCityData(cityName) {
  const manifest = await getManifest();
  if (!manifest || !manifest.cities) {
    console.error('No manifest or cities found');
    return null;
  }

  const cityData = manifest.cities[cityName.toLowerCase()];

  if (!cityData) {
    console.error(`City ${cityName} not found in manifest`);
    return null;
  }

  const baseDir = path.join(process.cwd(), 'public', 'data', cityData.country, cityData.directoryName);
  
  // Helper function to read files with fallbacks
  const readWithFallbacks = async (baseDir, filenames) => {
    for (const filename of filenames) {
      const filePath = path.join(baseDir, filename);
      if (await pathExists(filePath)) {
        const data = await readJsonFile(filePath);
        if (data) return data;
      }
    }
    return null;
  };

  try {
    // Load critical data first, defer non-essential data
    const [
      overview,
      attractions
    ] = await Promise.all([
      readWithFallbacks(baseDir, [`${cityName.toLowerCase()}-overview.json`, `${cityName.toLowerCase()}_overview.json`, 'overview.json', 'city_overview.json']),
      readWithFallbacks(baseDir, [`${cityName.toLowerCase()}_attractions.json`, 'attractions.json', 'sites.json'])
    ]);

    // Load remaining data in parallel but separately
    const [
      neighborhoods,
      culinaryGuide,
      connections,
      seasonalActivities,
      summary,
      visitCalendar
    ] = await Promise.all([
      readWithFallbacks(baseDir, [`${cityName.toLowerCase()}_neighborhoods.json`, 'neighborhoods.json', 'areas.json']),
      readWithFallbacks(baseDir, [`${cityName.toLowerCase()}_culinary_guide.json`, 'culinary_guide.json', 'food.json']),
      readWithFallbacks(baseDir, [`${cityName.toLowerCase()}_connections.json`, 'connections.json', 'transport.json']),
      readWithFallbacks(baseDir, [`${cityName.toLowerCase()}_seasonal_activities.json`, 'seasonal_activities.json', 'activities.json']),
      readWithFallbacks(baseDir, ['summary.json', 'visit_summary.json']),
      readWithFallbacks(baseDir, [`${cityName.toLowerCase()}-visit-calendar.json`, 'visit-calendar.json'])
    ]);

    // Load monthly data more efficiently - only load current and next month initially
    const monthlyDir = path.join(baseDir, 'monthly');
    const currentMonth = new Date().getMonth();
    const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 
                       'july', 'august', 'september', 'october', 'november', 'december'];
    
    const monthlyData = {};
    
    // Load only current and next month for faster initial load
    const priorityMonths = [
      monthNames[currentMonth],
      monthNames[(currentMonth + 1) % 12]
    ];
    
    for (const monthName of priorityMonths) {
      const filePath = path.join(monthlyDir, `${monthName}.json`);
      if (await pathExists(filePath)) {
        const monthData = await readJsonFile(filePath);
        if (monthData) {
          const monthKey = Object.keys(monthData)[0];
          if (monthKey) {
            monthlyData[monthKey.toLowerCase()] = monthData[monthKey];
          }
        }
      }
    }

    return {
      cityName: cityName.charAt(0).toUpperCase() + cityName.slice(1),
      country: cityData.country,
      overview,
      attractions,
      neighborhoods,
      culinaryGuide,
      connections,
      seasonalActivities,
      monthlyEvents: monthlyData,
      summary,
      visitCalendar
    };
  } catch (error) {
    console.error(`Error loading data for ${cityName}:`, error);
    return null;
  }
}

export default async function CityPage({ params }) {
  const { city } = await params;
  const cityName = decodeURIComponent(city);
  
  const cityData = await getCityData(cityName);
  
  if (!cityData) {
    console.log(`City data returned null for param: ${cityName}. Triggering notFound().`);
    notFound();
  }

  return <CityPageClient cityData={cityData} cityName={cityName} />;
}
