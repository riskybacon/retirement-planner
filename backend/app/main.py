"""FastAPI application entrypoints."""

from fastapi import FastAPI, HTTPException

from .data import load_historical_series, series_year_bounds
from .models import PerStartYearResult, SimulationInput, SimulationResponse, SimulationRun
from .simulate import simulate_one_start_year
from .summary import compute_quantile_indices, summarize_results

EPSILON = 0.001

app = FastAPI()


@app.get("/api/v1/series/metadata")
def series_metadata() -> dict[str, int | str]:
    """Return metadata about the historical series coverage."""
    series = load_historical_series()
    min_year, max_year = series_year_bounds(series)
    return {
        "min_year": min_year,
        "max_year": max_year,
        "stocks": "Shiller P",
        "bonds": "Shiller Long Rate",
    }


@app.post("/api/v1/simulate")
def simulate(req: SimulationInput) -> SimulationResponse:
    """Run rolling historical simulations based on the request payload."""
    if abs((req.stock_allocation + req.bond_allocation) - 1.0) > EPSILON:
        raise HTTPException(status_code=400, detail="Allocations must sum to 1.0")
    if not (req.withdrawal_rate_min <= req.withdrawal_rate_start <= req.withdrawal_rate_max):
        raise HTTPException(
            status_code=400,
            detail="withdrawal_rate_start must be between min and max",
        )

    series = load_historical_series()
    min_year, max_year = series_year_bounds(series)
    max_horizon = max_year - min_year + 1
    if req.retirement_years > max_horizon:
        raise HTTPException(
            status_code=400,
            detail=f"Retirement horizon exceeds data. Max years available: {max_horizon}.",
        )

    last_start_year = max_year - req.retirement_years + 1
    results: list[SimulationRun] = [
        simulate_one_start_year(req, series, start_year)
        for start_year in range(min_year, last_start_year + 1)
    ]

    summary = summarize_results(results)
    typed_results = [PerStartYearResult(**item) for item in results]
    return SimulationResponse(
        series={"min_year": min_year, "max_year": max_year},
        results=typed_results,
        summary=summary,
        quantile_indices=compute_quantile_indices(results),
    )
