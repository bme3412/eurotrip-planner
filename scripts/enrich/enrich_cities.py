#!/usr/bin/env python3
"""
City Data Enrichment Script

Uses LLM to enrich city data with:
- Attractions (if missing or sparse)
- Neighborhoods
- Visit calendar
- Descriptions

Usage:
    python enrich_cities.py                    # Enrich all empty cities
    python enrich_cities.py --city paris       # Enrich specific city
    python enrich_cities.py --country France   # Enrich all cities in country
    python enrich_cities.py --max-quality 40   # Enrich cities below quality score
    python enrich_cities.py --dry-run          # Preview without saving
    python enrich_cities.py --limit 5          # Process only 5 cities
"""

import os
import sys
import argparse
import time
from pathlib import Path
from typing import Optional, List
from datetime import datetime

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from dotenv import load_dotenv
from rich.console import Console
from rich.table import Table
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn
from rich import print as rprint

from utils.city_loader import CityLoader, CityData
from utils.llm_client import LLMClient


console = Console()


def derive_coordinates(city: CityData) -> Optional[dict]:
    """Derive city coordinates from attractions."""
    attractions = city.attractions
    with_coords = [
        a for a in attractions
        if (a.get("latitude") and a.get("longitude")) or (a.get("lat") and a.get("lng"))
    ]

    if not with_coords:
        return None

    total_lat = sum(a.get("latitude") or a.get("lat") for a in with_coords)
    total_lng = sum(a.get("longitude") or a.get("lng") for a in with_coords)

    return {
        "lat": round(total_lat / len(with_coords), 4),
        "lng": round(total_lng / len(with_coords), 4),
        "derived": True,
        "fromAttractions": len(with_coords),
    }


def derive_tourism_categories(city: CityData) -> Optional[List[str]]:
    """Derive tourism categories from attractions."""
    attractions = city.attractions

    if not attractions:
        return None

    # Category mappings
    MAPPINGS = {
        "museum": ["Cultural", "Museums"],
        "church": ["Historical Landmarks", "Religious"],
        "cathedral": ["Historical Landmarks", "Religious"],
        "palace": ["Historical Landmarks", "Cultural"],
        "castle": ["Historical Landmarks", "Cultural"],
        "park": ["Nature", "Relaxation"],
        "garden": ["Nature", "Relaxation"],
        "market": ["Food & Wine", "Shopping"],
        "beach": ["Beach & Coastal", "Relaxation"],
        "historic": ["Historical Landmarks", "Urban Exploration"],
        "monument": ["Historical Landmarks", "Cultural"],
    }

    counts = {}
    for attr in attractions:
        attr_type = (attr.get("type") or attr.get("category") or "").lower()
        for keyword, categories in MAPPINGS.items():
            if keyword in attr_type:
                for cat in categories:
                    counts[cat] = counts.get(cat, 0) + 1

    # Add Urban Exploration if has neighborhoods
    if len(city.neighborhoods) >= 3:
        counts["Urban Exploration"] = counts.get("Urban Exploration", 0) + 3

    # Sort and return top 6
    sorted_cats = sorted(counts.items(), key=lambda x: -x[1])
    return [cat for cat, _ in sorted_cats[:6]] if sorted_cats else None


def enrich_city(
    city: CityData,
    llm: Optional[LLMClient],
    dry_run: bool = False,
    force_llm: bool = False,
) -> dict:
    """
    Enrich a single city with derived and LLM-generated data.

    Returns dict of changes made.
    """
    changes = {}

    # 1. Derive coordinates if missing
    if not city.coordinates:
        coords = derive_coordinates(city)
        if coords:
            city.data["coordinates"] = coords
            changes["coordinates"] = f"Derived from {coords['fromAttractions']} attractions"

    # 2. Derive tourism categories if missing
    if not city.tourism_categories:
        categories = derive_tourism_categories(city)
        if categories:
            city.data["tourismCategories"] = categories
            changes["tourismCategories"] = f"Derived {len(categories)} categories"

    # 3. LLM enrichment for missing data
    if llm and (city.is_empty() or force_llm):
        console.print(f"  [cyan]Using LLM to generate data...[/cyan]")

        try:
            llm_data = llm.enrich_city_full(
                city.display_name,
                city.country,
                existing_data=city.data
            )

            if llm_data.get("attractions"):
                city.data["attractions"] = llm_data["attractions"]
                count = len(llm_data["attractions"].get("sites", []))
                changes["attractions"] = f"Generated {count} attractions via LLM"

            if llm_data.get("neighborhoods"):
                city.data["neighborhoods"] = llm_data["neighborhoods"]
                count = len(llm_data["neighborhoods"].get("neighborhoods", []))
                changes["neighborhoods"] = f"Generated {count} neighborhoods via LLM"

            if llm_data.get("visitCalendar"):
                city.data["visitCalendar"] = llm_data["visitCalendar"]
                changes["visitCalendar"] = "Generated visit calendar via LLM"

            if llm_data.get("description"):
                city.data["description"] = llm_data["description"]
                changes["description"] = "Generated description via LLM"

            # Re-derive coordinates from new attractions
            if not city.coordinates and "attractions" in changes:
                coords = derive_coordinates(city)
                if coords:
                    city.data["coordinates"] = coords
                    changes["coordinates"] = f"Derived from {coords['fromAttractions']} new attractions"

            # Re-derive categories from new attractions
            if not city.tourism_categories and "attractions" in changes:
                categories = derive_tourism_categories(city)
                if categories:
                    city.data["tourismCategories"] = categories
                    changes["tourismCategories"] = f"Derived {len(categories)} categories"

        except Exception as e:
            console.print(f"  [red]LLM error: {e}[/red]")
            changes["_error"] = str(e)

    return changes


def main():
    load_dotenv()

    parser = argparse.ArgumentParser(description="Enrich city data with LLM")
    parser.add_argument("--city", help="Specific city slug to enrich")
    parser.add_argument("--country", help="Only enrich cities in this country")
    parser.add_argument("--max-quality", type=int, default=40,
                        help="Enrich cities below this quality score")
    parser.add_argument("--empty-only", action="store_true",
                        help="Only enrich cities with no attractions")
    parser.add_argument("--dry-run", action="store_true",
                        help="Preview changes without saving")
    parser.add_argument("--no-llm", action="store_true",
                        help="Only do derived enrichment (no LLM calls)")
    parser.add_argument("--force-llm", action="store_true",
                        help="Force LLM enrichment even for non-empty cities")
    parser.add_argument("--limit", type=int,
                        help="Maximum number of cities to process")
    parser.add_argument("--provider", default="anthropic",
                        choices=["anthropic", "openai"],
                        help="LLM provider to use")
    parser.add_argument("--model", help="Specific model to use")
    args = parser.parse_args()

    # Initialize loader
    loader = CityLoader()

    # Show stats first
    stats = loader.get_stats()
    console.print("\n[bold]Current Data Quality[/bold]")
    table = Table()
    table.add_column("Metric", style="cyan")
    table.add_column("Value", style="green")
    table.add_row("Total Cities", str(stats["total"]))
    table.add_row("Empty (no attractions)", str(stats["empty"]))
    table.add_row("Avg Quality", f"{stats['avg_quality']:.0f}/100")
    table.add_row("Excellent (80+)", str(stats["by_tier"]["excellent"]))
    table.add_row("Good (60-79)", str(stats["by_tier"]["good"]))
    table.add_row("Poor (<40)", str(stats["by_tier"]["poor"]))
    console.print(table)

    # Find cities to enrich
    all_cities = loader.find_cities(country=args.country)

    if args.city:
        cities = [c for c in all_cities if args.city.lower() in c.city_slug.lower()]
    elif args.empty_only:
        cities = [c for c in all_cities if c.is_empty()]
    else:
        cities = [c for c in all_cities if c.quality_score < args.max_quality]

    if args.limit:
        cities = cities[:args.limit]

    if not cities:
        console.print("\n[yellow]No cities match the criteria.[/yellow]")
        return

    console.print(f"\n[bold]Found {len(cities)} cities to enrich[/bold]")

    # Initialize LLM client if needed
    llm = None
    if not args.no_llm:
        try:
            llm = LLMClient(provider=args.provider, model=args.model)
            console.print(f"[green]Using {args.provider} ({llm.model})[/green]")
        except Exception as e:
            console.print(f"[yellow]LLM not available: {e}[/yellow]")
            console.print("[yellow]Proceeding with derived enrichment only.[/yellow]")

    # Process cities
    total_changes = 0
    cities_modified = 0

    console.print()
    for i, city in enumerate(cities, 1):
        console.print(f"[bold][{i}/{len(cities)}] {city.display_name}, {city.country}[/bold]")
        console.print(f"  Quality: {city.quality_score}/100, Attractions: {len(city.attractions)}")

        changes = enrich_city(
            city,
            llm=llm,
            dry_run=args.dry_run,
            force_llm=args.force_llm,
        )

        if changes and "_error" not in changes:
            cities_modified += 1
            total_changes += len(changes)

            for field, desc in changes.items():
                if field != "_error":
                    console.print(f"  [green]+ {field}: {desc}[/green]")

            if not args.dry_run:
                loader.save_city(city)
                console.print(f"  [dim]Saved to {city.path}[/dim]")

        # Rate limiting for LLM calls
        if llm and city.is_empty() and i < len(cities):
            time.sleep(1)  # Avoid rate limits

    # Summary
    console.print("\n" + "=" * 50)
    console.print(f"[bold]Enrichment Complete[/bold]")
    console.print(f"Cities processed: {len(cities)}")
    console.print(f"Cities modified: {cities_modified}")
    console.print(f"Total changes: {total_changes}")

    if args.dry_run:
        console.print("\n[yellow]DRY RUN - no files were modified[/yellow]")

    # Show updated stats
    if not args.dry_run and cities_modified > 0:
        console.print("\n[bold]Updated Data Quality[/bold]")
        new_stats = loader.get_stats()
        table = Table()
        table.add_column("Metric", style="cyan")
        table.add_column("Before", style="yellow")
        table.add_column("After", style="green")
        table.add_row("Avg Quality", f"{stats['avg_quality']:.0f}", f"{new_stats['avg_quality']:.0f}")
        table.add_row("Empty Cities", str(stats["empty"]), str(new_stats["empty"]))
        table.add_row("Excellent (80+)", str(stats["by_tier"]["excellent"]), str(new_stats["by_tier"]["excellent"]))
        console.print(table)


if __name__ == "__main__":
    main()
