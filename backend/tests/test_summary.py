"""Tests for summary statistics and quantile indices."""

from backend.app.models import SimulationRun
from backend.app.summary import compute_quantile_indices, summarize_results


def test_summary_counts_and_quantiles() -> None:
    """Validate summary counts and quantile bounds."""
    results: list[SimulationRun] = [
        {
            "start_year": 2000,
            "success": True,
            "ending_balance": 0.0,
            "yearly_balances": [0.0],
            "yearly_withdrawals": [10.0],
            "yearly_fees": [1.0],
            "highlight": False,
        },
        {
            "start_year": 2001,
            "success": False,
            "ending_balance": 10.0,
            "yearly_balances": [10.0],
            "yearly_withdrawals": [20.0],
            "yearly_fees": [2.0],
            "highlight": False,
        },
        {
            "start_year": 2002,
            "success": True,
            "ending_balance": 20.0,
            "yearly_balances": [20.0],
            "yearly_withdrawals": [30.0],
            "yearly_fees": [3.0],
            "highlight": False,
        },
        {
            "start_year": 2003,
            "success": True,
            "ending_balance": 30.0,
            "yearly_balances": [30.0],
            "yearly_withdrawals": [40.0],
            "yearly_fees": [4.0],
            "highlight": False,
        },
        {
            "start_year": 2004,
            "success": False,
            "ending_balance": 40.0,
            "yearly_balances": [40.0],
            "yearly_withdrawals": [50.0],
            "yearly_fees": [5.0],
            "highlight": False,
        },
    ]

    summary = summarize_results(results)

    assert summary.total_runs == 5
    assert summary.success_count == 3
    assert summary.failure_count == 2
    assert summary.portfolio_quantiles["p0"] == 0.0
    assert summary.portfolio_quantiles["p100"] == 40.0
    assert summary.spending_quantiles["p0"] == 10.0
    assert summary.spending_quantiles["p100"] == 50.0
    assert summary.fee_quantiles["p0"] == 1.0
    assert summary.fee_quantiles["p100"] == 5.0


def test_quantile_indices_rounding() -> None:
    """Ensure quantile indices use round on ranks."""
    results: list[SimulationRun] = [
        {
            "start_year": 2000,
            "success": True,
            "ending_balance": 0.0,
            "yearly_balances": [0.0],
            "yearly_withdrawals": [50.0],
            "yearly_fees": [0.0],
            "highlight": False,
        },
        {
            "start_year": 2001,
            "success": True,
            "ending_balance": 10.0,
            "yearly_balances": [10.0],
            "yearly_withdrawals": [40.0],
            "yearly_fees": [0.0],
            "highlight": False,
        },
        {
            "start_year": 2002,
            "success": True,
            "ending_balance": 20.0,
            "yearly_balances": [20.0],
            "yearly_withdrawals": [30.0],
            "yearly_fees": [0.0],
            "highlight": False,
        },
        {
            "start_year": 2003,
            "success": True,
            "ending_balance": 30.0,
            "yearly_balances": [30.0],
            "yearly_withdrawals": [20.0],
            "yearly_fees": [0.0],
            "highlight": False,
        },
        {
            "start_year": 2004,
            "success": True,
            "ending_balance": 40.0,
            "yearly_balances": [40.0],
            "yearly_withdrawals": [10.0],
            "yearly_fees": [0.0],
            "highlight": False,
        },
    ]

    indices = compute_quantile_indices(results)

    assert indices == [0, 1, 2, 3, 4]


def test_quantile_indices_merge_and_dedupe() -> None:
    """Ensure merged quantiles include portfolio and withdrawl indices."""
    results: list[SimulationRun] = [
        {
            "start_year": 2000,
            "success": True,
            "ending_balance": 100.0,
            "yearly_balances": [100.0],
            "yearly_withdrawals": [50.0],
            "yearly_fees": [0.0],
            "highlight": False,
        },
        {
            "start_year": 2001,
            "success": True,
            "ending_balance": 200.0,
            "yearly_balances": [200.0],
            "yearly_withdrawals": [10.0],
            "yearly_fees": [0.0],
            "highlight": False,
        },
        {
            "start_year": 2002,
            "success": True,
            "ending_balance": 300.0,
            "yearly_balances": [300.0],
            "yearly_withdrawals": [40.0],
            "yearly_fees": [0.0],
            "highlight": False,
        },
        {
            "start_year": 2003,
            "success": True,
            "ending_balance": 400.0,
            "yearly_balances": [400.0],
            "yearly_withdrawals": [20.0],
            "yearly_fees": [0.0],
            "highlight": False,
        },
        {
            "start_year": 2004,
            "success": True,
            "ending_balance": 500.0,
            "yearly_balances": [500.0],
            "yearly_withdrawals": [30.0],
            "yearly_fees": [0.0],
            "highlight": False,
        },
    ]

    indices = compute_quantile_indices(results)

    assert indices == [0, 1, 2, 3, 4]
