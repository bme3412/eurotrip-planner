"""
City data loading and saving utilities.
"""

import json
import hashlib
from pathlib import Path
from datetime import datetime
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any


@dataclass
class CityData:
    """Represents a city's data."""

    path: Path
    country: str
    city_slug: str
    data: Dict[str, Any]

    @property
    def display_name(self) -> str:
        return self.data.get("city") or self.data.get("name") or self.city_slug

    @property
    def attractions(self) -> List[Dict]:
        """Get attractions, handling nested structure."""
        attr = self.data.get("attractions", {})
        if isinstance(attr, list):
            return attr
        if isinstance(attr, dict) and "sites" in attr:
            return attr["sites"]
        return []

    @property
    def neighborhoods(self) -> List[Dict]:
        """Get neighborhoods, handling nested structure."""
        nb = self.data.get("neighborhoods", {})
        if isinstance(nb, list):
            return nb
        if isinstance(nb, dict) and "neighborhoods" in nb:
            return nb["neighborhoods"]
        return []

    @property
    def visit_calendar(self) -> Dict:
        """Get visit calendar."""
        return self.data.get("visitCalendar") or {}

    @property
    def months(self) -> List[Dict]:
        """Get calendar months as list."""
        cal = self.visit_calendar
        if not cal:
            return []
        months = cal.get("months", {})
        if isinstance(months, list):
            return months
        if isinstance(months, dict):
            return list(months.values())
        return []

    @property
    def coordinates(self) -> Optional[Dict]:
        """Get coordinates if present."""
        return self.data.get("coordinates")

    @property
    def tourism_categories(self) -> List[str]:
        """Get tourism categories."""
        return self.data.get("tourismCategories", [])

    @property
    def description(self) -> Optional[str]:
        """Get description from various locations."""
        if self.data.get("description"):
            return self.data["description"]
        overview = self.data.get("overview", {})
        if isinstance(overview, str):
            return overview
        if isinstance(overview, dict):
            return overview.get("brief_description")
        return None

    @property
    def quality_score(self) -> int:
        """Calculate simple quality score."""
        score = 0
        if len(self.attractions) > 0:
            score += 25
        if len(self.months) > 0:
            score += 20
        if self.coordinates:
            score += 15
        if len(self.neighborhoods) > 0:
            score += 15
        if self.description:
            score += 10
        if len(self.tourism_categories) > 0:
            score += 10
        if self.data.get("connections"):
            score += 5
        return score

    def is_empty(self) -> bool:
        """Check if city has minimal data."""
        return len(self.attractions) == 0 and len(self.neighborhoods) == 0


class CityLoader:
    """Load and save city data files."""

    def __init__(self, data_dir: str = "public/data"):
        self.data_dir = Path(data_dir)
        if not self.data_dir.is_absolute():
            # Try to find project root
            current = Path.cwd()
            while current != current.parent:
                if (current / "public" / "data").exists():
                    self.data_dir = current / "public" / "data"
                    break
                current = current.parent

    def find_cities(self, country: Optional[str] = None) -> List[CityData]:
        """Find all city data files."""
        cities = []

        for country_dir in self.data_dir.iterdir():
            if not country_dir.is_dir():
                continue
            if country_dir.name.startswith("."):
                continue
            if country_dir.name in ("generated", "monthly"):
                continue
            if country and country_dir.name.lower() != country.lower():
                continue

            for city_dir in country_dir.iterdir():
                if not city_dir.is_dir():
                    continue
                if city_dir.name in ("monthly", "generated"):
                    continue

                index_path = city_dir / "index.json"
                if index_path.exists():
                    try:
                        city = self.load_city(index_path)
                        if city:
                            cities.append(city)
                    except Exception as e:
                        print(f"Error loading {index_path}: {e}")

        return sorted(cities, key=lambda c: (c.country, c.city_slug))

    def load_city(self, path: Path) -> Optional[CityData]:
        """Load a single city data file."""
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)

            # Extract country and city from path
            parts = path.parts
            city_slug = parts[-2]
            country = parts[-3]

            return CityData(
                path=path,
                country=country,
                city_slug=city_slug,
                data=data
            )
        except Exception as e:
            print(f"Error loading {path}: {e}")
            return None

    def save_city(self, city: CityData, add_meta: bool = True) -> bool:
        """Save city data back to file."""
        try:
            if add_meta:
                city.data["_meta"] = self._generate_meta(city.data)

            with open(city.path, "w", encoding="utf-8") as f:
                json.dump(city.data, f, indent=2, ensure_ascii=False)

            return True
        except Exception as e:
            print(f"Error saving {city.path}: {e}")
            return False

    def _generate_meta(self, data: Dict) -> Dict:
        """Generate _meta block."""
        # Calculate content hash without meta
        data_copy = {k: v for k, v in data.items() if k != "_meta"}
        content_str = json.dumps(data_copy, sort_keys=True)
        content_hash = hashlib.sha256(content_str.encode()).hexdigest()[:12]

        now = datetime.now()
        version = f"{now.year}.{now.month:02d}"

        return {
            "schemaVersion": 2,
            "dataVersion": version,
            "generatedAt": now.isoformat() + "Z",
            "source": data.get("_meta", {}).get("source", "enrichment"),
            "contentHash": f"sha256:{content_hash}"
        }

    def get_empty_cities(self) -> List[CityData]:
        """Get cities with no attractions."""
        return [c for c in self.find_cities() if c.is_empty()]

    def get_cities_by_quality(self, max_score: int = 50) -> List[CityData]:
        """Get cities below a quality threshold."""
        return [c for c in self.find_cities() if c.quality_score < max_score]

    def get_stats(self) -> Dict:
        """Get statistics about all cities."""
        cities = self.find_cities()

        scores = [c.quality_score for c in cities]
        empty_count = len([c for c in cities if c.is_empty()])

        return {
            "total": len(cities),
            "empty": empty_count,
            "with_data": len(cities) - empty_count,
            "avg_quality": sum(scores) / len(scores) if scores else 0,
            "min_quality": min(scores) if scores else 0,
            "max_quality": max(scores) if scores else 0,
            "by_tier": {
                "excellent": len([s for s in scores if s >= 80]),
                "good": len([s for s in scores if 60 <= s < 80]),
                "fair": len([s for s in scores if 40 <= s < 60]),
                "poor": len([s for s in scores if s < 40]),
            }
        }
