# API Reference

## Base URL
- Local: `http://localhost:8000`

## Data Coverage Notes
- Data is downloaded from the public Shiller dataset spreadsheet.
- Stocks use the Shiller price series (price index; not total return).
- Bonds use the Shiller long-rate series as a proxy return via annual average yield.
- Date range reflects the earliest overlap between the two series.

## GET /api/v1/series/metadata
Returns the available historical series bounds.

Example response:
```json
{
  "min_year": 1928,
  "max_year": 2023,
  "stocks": "SP500",
  "bonds": "DGS10"
}
```

## POST /api/v1/simulate
Runs rolling historical simulations for each start year in the dataset.

Example request:
```json
{
  "start_year": 2030,
  "retirement_years": 30,
  "portfolio_start": 1000000,
  "stock_allocation": 0.6,
  "bond_allocation": 0.4,
  "withdrawal_rate_start": 0.04,
  "withdrawal_rate_min": 0.03,
  "withdrawal_rate_max": 0.06,
  "inflation_rate": 0.02,
  "ss_recipients": [
    { "start_year": 2035, "monthly_amount": 2000 },
    { "start_year": 2038, "monthly_amount": 1500 }
  ]
}
```

Example response:
```json
{
  "series": { "min_year": 1928, "max_year": 2023 },
  "results": [
    {
      "start_year": 1970,
      "success": true,
      "ending_balance": 1250000,
      "yearly_balances": [1000000, 980000, 1020000],
      "highlight": false
    }
  ],
  "summary": {
    "total_runs": 94,
    "success_count": 77,
    "failure_count": 17,
    "success_rate": 0.82,
    "ending_balance_percentiles": {
      "p10": 250000,
      "p50": 800000,
      "p90": 2200000
    }
  }
}
```
