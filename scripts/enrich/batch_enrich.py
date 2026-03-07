#!/usr/bin/env python3
"""
Batch City Data Enrichment Script

Generates missing data sections (overview, culinaryGuide, seasonalActivities)
for all cities using LLM.

Usage:
    python batch_enrich.py --phase overview              # Generate overviews for cities missing them
    python batch_enrich.py --phase culinary              # Generate culinary guides
    python batch_enrich.py --phase seasonal              # Generate seasonal activities
    python batch_enrich.py --all                         # Generate all missing sections
    python batch_enrich.py --phase overview --dry-run    # Preview without saving
    python batch_enrich.py --phase overview --limit 5    # Process only 5 cities
    python batch_enrich.py --phase overview --country Germany  # Only German cities
    python batch_enrich.py --resume-from germany/berlin  # Resume from specific city
"""

import os
import sys
import json
import argparse
import time
from pathlib import Path
from datetime import datetime
from typing import Optional, List, Dict, Set

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from dotenv import load_dotenv
from rich.console import Console
from rich.table import Table
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, TaskProgressColumn
from rich import print as rprint

from utils.city_loader import CityLoader, CityData
from utils.llm_client import LLMClient


console = Console()

# Checkpoint file for resuming
CHECKPOINT_FILE = Path(__file__).parent / ".enrichment_checkpoint.json"


def load_checkpoint() -> Dict:
    """Load checkpoint data for resuming interrupted runs."""
    if CHECKPOINT_FILE.exists():
        try:
            with open(CHECKPOINT_FILE, "r") as f:
                return json.load(f)
        except:
            pass
    return {"completed": [], "phase": None}


def save_checkpoint(phase: str, completed: List[str]):
    """Save checkpoint data."""
    with open(CHECKPOINT_FILE, "w") as f:
        json.dump({"phase": phase, "completed": completed}, f)


def clear_checkpoint():
    """Clear checkpoint file."""
    if CHECKPOINT_FILE.exists():
        CHECKPOINT_FILE.unlink()


def needs_overview(city: CityData) -> bool:
    """Check if city needs overview generation."""
    overview = city.data.get("overview")
    return overview is None or (isinstance(overview, dict) and not overview.get("city_name"))


def needs_culinary(city: CityData) -> bool:
    """Check if city needs culinary guide generation."""
    culinary = city.data.get("culinaryGuide")
    if not culinary:
        return True
    # Check if it has actual restaurant data
    restaurants = culinary.get("restaurants", {})
    if isinstance(restaurants, list):
        # Some cities have restaurants as a list
        return len(restaurants) == 0
    if isinstance(restaurants, dict):
        has_restaurants = any(
            len(restaurants.get(tier, [])) > 0
            for tier in ["fine_dining", "casual_dining", "street_food"]
        )
        return not has_restaurants
    return True


def needs_seasonal(city: CityData) -> bool:
    """Check if city needs seasonal activities generation."""
    seasonal = city.data.get("seasonalActivities")
    if not seasonal:
        return True
    # Check if it has actual activity data
    has_activities = any(
        isinstance(seasonal.get(season), dict) and len(seasonal[season].get("activities", [])) > 0
        for season in ["Spring", "Summer", "Fall", "Winter"]
    )
    return not has_activities


def validate_json_structure(data: Dict, section: str) -> bool:
    """Validate that generated JSON has expected structure."""
    if not data:
        return False

    if section == "overview":
        required = ["city_name", "brief_description"]
        return all(key in data for key in required)

    elif section == "culinary":
        return "restaurants" in data

    elif section == "seasonal":
        seasons = ["Spring", "Summer", "Fall", "Winter"]
        return any(s in data for s in seasons)

    return True


def estimate_cost(cities: List[CityData], phase: str) -> float:
    """Estimate API cost for processing cities."""
    # Rough estimate: ~$0.05 per city for overview, ~$0.03 for others
    cost_per_call = {
        "overview": 0.05,
        "culinary": 0.03,
        "seasonal": 0.02,
    }
    return len(cities) * cost_per_call.get(phase, 0.04)


def process_city(
    city: CityData,
    llm: LLMClient,
    phase: str,
    dry_run: bool = False,
) -> Dict:
    """
    Process a single city for the specified phase.

    Returns dict with status and any generated data.
    """
    result = {"status": "skipped", "data": None, "error": None}

    try:
        if phase == "overview":
            if not needs_overview(city):
                result["status"] = "skipped"
                return result

            console.print(f"  [cyan]Generating overview...[/cyan]")
            data = llm.generate_overview(
                city.display_name,
                city.country,
                existing_data=city.data
            )

            if data and validate_json_structure(data, "overview"):
                result["data"] = {"overview": data}
                result["status"] = "success"
            else:
                result["status"] = "failed"
                result["error"] = "Invalid JSON structure returned"

        elif phase == "culinary":
            if not needs_culinary(city):
                result["status"] = "skipped"
                return result

            console.print(f"  [cyan]Generating culinary guide...[/cyan]")
            data = llm.generate_culinary_guide(
                city.display_name,
                city.country,
                existing_data=city.data
            )

            if data and validate_json_structure(data, "culinary"):
                result["data"] = {"culinaryGuide": data}
                result["status"] = "success"
            else:
                result["status"] = "failed"
                result["error"] = "Invalid JSON structure returned"

        elif phase == "seasonal":
            if not needs_seasonal(city):
                result["status"] = "skipped"
                return result

            console.print(f"  [cyan]Generating seasonal activities...[/cyan]")
            data = llm.generate_seasonal_activities(
                city.display_name,
                city.country,
                existing_data=city.data
            )

            if data and validate_json_structure(data, "seasonal"):
                result["data"] = {"seasonalActivities": data}
                result["status"] = "success"
            else:
                result["status"] = "failed"
                result["error"] = "Invalid JSON structure returned"

    except Exception as e:
        result["status"] = "error"
        result["error"] = str(e)

    return result


def main():
    # Load environment variables from .env.local in project root
    project_root = Path(__file__).parent.parent.parent
    env_file = project_root / ".env.local"
    if env_file.exists():
        load_dotenv(env_file)
    else:
        load_dotenv()  # Try default locations

    parser = argparse.ArgumentParser(description="Batch enrich city data with LLM")
    parser.add_argument("--phase", choices=["overview", "culinary", "seasonal"],
                        help="Which data section to generate")
    parser.add_argument("--all", action="store_true",
                        help="Generate all missing sections")
    parser.add_argument("--country", help="Only process cities in this country")
    parser.add_argument("--city", help="Process specific city (slug)")
    parser.add_argument("--limit", type=int, help="Maximum cities to process")
    parser.add_argument("--dry-run", action="store_true",
                        help="Preview changes without saving")
    parser.add_argument("--resume", action="store_true",
                        help="Resume from last checkpoint")
    parser.add_argument("--resume-from", help="Resume from specific city (country/city)")
    parser.add_argument("--delay", type=float, default=3.0,
                        help="Delay between API calls (seconds, default 3.0 to avoid rate limits)")
    parser.add_argument("--provider", choices=["anthropic", "openai"], default=None,
                        help="LLM provider (auto-detects if not specified)")
    parser.add_argument("--model", help="LLM model to use")
    args = parser.parse_args()

    # Validate args
    if not args.phase and not args.all:
        console.print("[red]Error: Must specify --phase or --all[/red]")
        return 1

    phases = ["overview", "culinary", "seasonal"] if args.all else [args.phase]

    # Initialize loader
    loader = CityLoader()

    # Initialize LLM (skip for dry-run mode)
    llm = None
    if not args.dry_run:
        # Auto-detect provider based on available API keys
        provider = args.provider
        if not provider:
            if os.environ.get("ANTHROPIC_API_KEY"):
                provider = "anthropic"
            elif os.environ.get("OPENAI_API_KEY"):
                provider = "openai"
            else:
                console.print("[red]No API key found. Set ANTHROPIC_API_KEY or OPENAI_API_KEY[/red]")
                return 1

        try:
            llm = LLMClient(provider=provider, model=args.model)
            console.print(f"[green]Using {provider}: {llm.model}[/green]")
        except Exception as e:
            console.print(f"[red]Failed to initialize LLM: {e}[/red]")
            return 1

    # Process each phase
    for phase in phases:
        console.print(f"\n[bold]{'='*50}[/bold]")
        console.print(f"[bold]Phase: {phase.upper()}[/bold]")
        console.print(f"[bold]{'='*50}[/bold]\n")

        # Find cities needing this phase
        all_cities = loader.find_cities(country=args.country)

        if args.city:
            all_cities = [c for c in all_cities if args.city.lower() in c.city_slug.lower()]

        # Filter to cities that need this phase
        if phase == "overview":
            cities = [c for c in all_cities if needs_overview(c)]
        elif phase == "culinary":
            cities = [c for c in all_cities if needs_culinary(c)]
        elif phase == "seasonal":
            cities = [c for c in all_cities if needs_seasonal(c)]
        else:
            cities = all_cities

        # Handle resume
        checkpoint = load_checkpoint()
        completed_keys: Set[str] = set()

        if args.resume and checkpoint.get("phase") == phase:
            completed_keys = set(checkpoint.get("completed", []))
            console.print(f"[yellow]Resuming from checkpoint ({len(completed_keys)} completed)[/yellow]")

        if args.resume_from:
            # Find index to start from
            start_key = args.resume_from.lower()
            found = False
            for i, city in enumerate(cities):
                city_key = f"{city.country.lower()}/{city.city_slug.lower()}"
                if start_key in city_key:
                    cities = cities[i:]
                    found = True
                    console.print(f"[yellow]Starting from {city.display_name}, {city.country}[/yellow]")
                    break
            if not found:
                console.print(f"[red]City '{args.resume_from}' not found[/red]")
                return 1

        # Remove already completed
        cities = [c for c in cities if f"{c.country}/{c.city_slug}" not in completed_keys]

        if args.limit:
            cities = cities[:args.limit]

        if not cities:
            console.print(f"[green]All cities already have {phase} data![/green]")
            continue

        # Show summary
        est_cost = estimate_cost(cities, phase)
        console.print(f"Cities to process: {len(cities)}")
        console.print(f"Estimated cost: ${est_cost:.2f}")

        if args.dry_run:
            console.print(f"\n[yellow]DRY RUN - showing cities that would be processed:[/yellow]")
            for city in cities[:20]:
                console.print(f"  - {city.display_name}, {city.country}")
            if len(cities) > 20:
                console.print(f"  ... and {len(cities) - 20} more")
            continue

        # Process cities
        stats = {"success": 0, "failed": 0, "skipped": 0, "error": 0}
        completed_list = list(completed_keys)

        console.print()
        for i, city in enumerate(cities, 1):
            city_key = f"{city.country}/{city.city_slug}"
            console.print(f"[bold][{i}/{len(cities)}] {city.display_name}, {city.country}[/bold]")

            result = process_city(city, llm, phase, args.dry_run)
            stats[result["status"]] += 1

            if result["status"] == "success" and result["data"]:
                # Update city data
                for key, value in result["data"].items():
                    city.data[key] = value

                # Save
                loader.save_city(city)
                console.print(f"  [green]+ Saved {phase} data[/green]")

                completed_list.append(city_key)
                save_checkpoint(phase, completed_list)

            elif result["status"] == "skipped":
                console.print(f"  [dim]Skipped (already has {phase} data)[/dim]")

            elif result["status"] in ("failed", "error"):
                console.print(f"  [red]Error: {result['error']}[/red]")

            # Rate limiting
            if i < len(cities) and result["status"] == "success":
                time.sleep(args.delay)

        # Summary
        console.print(f"\n[bold]Phase Complete: {phase}[/bold]")
        console.print(f"  Success: {stats['success']}")
        console.print(f"  Skipped: {stats['skipped']}")
        console.print(f"  Failed: {stats['failed']}")
        console.print(f"  Errors: {stats['error']}")

        # Clear checkpoint if completed successfully
        if stats["failed"] == 0 and stats["error"] == 0:
            clear_checkpoint()

    return 0


if __name__ == "__main__":
    sys.exit(main())
