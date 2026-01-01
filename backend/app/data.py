import csv
from functools import lru_cache
from pathlib import Path

DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "historical.csv"


@lru_cache(maxsize=1)
def load_historical_series() -> dict[int, tuple[float, float]]:
    if not DATA_PATH.exists():
        raise FileNotFoundError(
            f"Missing historical data at {DATA_PATH}. Run scripts/fetch_fred.py first."
        )

    series = {}
    with DATA_PATH.open(newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            year = int(row["year"])
            series[year] = (
                float(row["stock_return"]),
                float(row["bond_return"]),
            )

    if not series:
        raise ValueError("Historical series is empty; check data/historical.csv.")
    return series


def series_year_bounds(series: dict[int, tuple[float, float]]) -> tuple[int, int]:
    years = sorted(series.keys())
    return years[0], years[-1]
