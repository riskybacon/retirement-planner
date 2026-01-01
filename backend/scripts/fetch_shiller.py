"""Fetch and convert Shiller data into annual returns."""

import io
import os
from collections.abc import Iterable
from pathlib import Path
from urllib.request import urlopen

import pandas as pd
from pandas._libs.tslibs.nattype import NaTType

SHILLER_URL = "https://www.econ.yale.edu/~shiller/data/ie_data.xls"
LOCAL_DEFAULT = Path(__file__).resolve().parents[1] / "data" / "ie_data.xls"


def fetch_shiller_data(local_path: Path | None = None) -> pd.DataFrame:
    """Load the Shiller dataset from a local file or the public URL."""
    if local_path and local_path.exists():
        return pd.read_excel(local_path, sheet_name="Data", skiprows=7)

    try:
        with urlopen(SHILLER_URL) as response:
            data = response.read()
        return pd.read_excel(io.BytesIO(data), sheet_name="Data", skiprows=7)
    except Exception as exc:
        raise RuntimeError(
            "Unable to download Shiller data. Download ie_data.xls manually and "
            f"place it at {LOCAL_DEFAULT}, or set SHILLER_XLS_PATH to the file."
        ) from exc


def normalize_columns(frame: pd.DataFrame) -> pd.DataFrame:
    """Strip whitespace from column labels."""
    frame = frame.copy()
    frame.columns = [str(col).strip() for col in frame.columns]
    return frame


def find_column(frame: pd.DataFrame, candidates: Iterable[str]) -> str:
    """Find the first matching column name."""
    for candidate in candidates:
        if candidate in frame.columns:
            return candidate
    raise KeyError(f"Missing column. Tried: {candidates}")


def parse_date_column(series: pd.Series) -> pd.Series:
    """Parse the Shiller date column into a datetime index."""
    if pd.api.types.is_datetime64_any_dtype(series):
        return series

    def to_datetime(value: object) -> pd.Timestamp | NaTType:
        if pd.isna(value):
            return pd.NaT
        if isinstance(value, str) and value.strip():
            try:
                return pd.to_datetime(value)
            except ValueError:
                pass
        if isinstance(value, (int, float)):
            numeric = float(value)
        else:
            numeric = float(str(value))
        year = int(numeric)
        month = int(round((numeric - year) * 100))
        if month < 1 or month > 12:
            return pd.NaT
        return pd.Timestamp(year=year, month=month, day=1)

    return series.apply(to_datetime)


def build_annual_returns(frame: pd.DataFrame) -> pd.DataFrame:
    """Compute annual stock and bond return series."""
    date_col = find_column(frame, ["Date", "date"])
    price_col = find_column(frame, ["P", "Price", "SP500"])
    bond_col = find_column(frame, ["Rate GS10", "GS10", "LT", "Long Interest Rate"])

    frame = frame[[date_col, price_col, bond_col]].dropna()
    frame[date_col] = parse_date_column(frame[date_col])
    frame = frame.dropna(subset=[date_col])
    frame = frame.set_index(date_col).sort_index()

    prices = frame[price_col].astype(float)
    yields = frame[bond_col].astype(float)

    stock_annual = prices.resample("YE").last().pct_change().dropna()
    bond_annual = yields.resample("YE").mean().dropna() / 100.0

    annual = pd.concat(
        [stock_annual.rename("stock_return"), bond_annual.rename("bond_return")],
        axis=1,
    ).dropna()
    annual.index = annual.index.year
    annual.index.name = "year"
    return annual


def main() -> None:
    """Entry point for building the historical returns CSV."""
    local_path = Path(os.environ.get("SHILLER_XLS_PATH", str(LOCAL_DEFAULT)))
    data = normalize_columns(fetch_shiller_data(local_path))
    if os.environ.get("SHILLER_SHOW_COLUMNS") == "1":
        print("Available columns:", ", ".join(data.columns))
        return
    annual = build_annual_returns(data)

    output_path = Path(__file__).resolve().parents[1] / "data" / "historical.csv"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    annual.to_csv(output_path)
    print(f"Wrote {output_path}")
    print(f"Series coverage: {annual.index.min()} - {annual.index.max()} ({len(annual)} years)")


if __name__ == "__main__":
    main()
