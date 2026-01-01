"""Tests for the simulation engine."""

from backend.app.models import SimulationInput
from backend.app.simulate import simulate_one_start_year


def test_simulation_tracks_withdrawals_and_fees() -> None:
    """Ensure withdrawals and fees are recorded per year."""
    series = {
        2000: (0.0, 0.0),
        2001: (0.0, 0.0),
    }
    req = SimulationInput(
        start_year=2000,
        retirement_years=2,
        portfolio_start=100.0,
        stock_allocation=1.0,
        bond_allocation=0.0,
        withdrawal_rate_start=0.01,
        withdrawal_rate_min=0.01,
        withdrawal_rate_max=0.01,
        withdrawal_smoothing_up=1.0,
        withdrawal_smoothing_down=1.0,
        management_fee=0.1,
        inflation_rate=0.0,
        ss_recipients=[],
    )

    result = simulate_one_start_year(req, series, 2000)

    assert len(result["yearly_withdrawals"]) == 2
    assert len(result["yearly_fees"]) == 2
    assert result["yearly_fees"][0] == 10.0
    assert result["yearly_withdrawals"][0] == 0.9


def test_simulation_allows_negative_balances() -> None:
    """Ensure simulations continue after falling below zero."""
    series = {
        2000: (0.0, 0.0),
        2001: (0.0, 0.0),
    }
    req = SimulationInput(
        start_year=2000,
        retirement_years=2,
        portfolio_start=1.0,
        stock_allocation=1.0,
        bond_allocation=0.0,
        withdrawal_rate_start=1.0,
        withdrawal_rate_min=1.0,
        withdrawal_rate_max=1.0,
        withdrawal_smoothing_up=1.0,
        withdrawal_smoothing_down=1.0,
        management_fee=0.0,
        inflation_rate=0.0,
        ss_recipients=[],
    )

    result = simulate_one_start_year(req, series, 2000)

    assert result["success"] is False
    assert len(result["yearly_balances"]) == 3
    assert result["yearly_balances"][1] <= 0
