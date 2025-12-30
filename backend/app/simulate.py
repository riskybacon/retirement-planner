from typing import Dict, Tuple

from .models import SimulationInput


def clamp(value: float, low: float, high: float) -> float:
    return max(low, min(value, high))


def simulate_one_start_year(
    req: SimulationInput,
    series: Dict[int, Tuple[float, float]],
    start_year: int,
) -> dict:
    portfolio = req.portfolio_start
    withdrawal_rate = clamp(
        req.withdrawal_rate_start, req.withdrawal_rate_min, req.withdrawal_rate_max
    )
    withdrawal_amount = portfolio * withdrawal_rate
    yearly_balances = [portfolio]
    yearly_withdrawals = []
    failed = portfolio <= 0

    for year_idx in range(req.retirement_years):
        year = start_year + year_idx
        stock_return, bond_return = series[year]

        stock_value = portfolio * req.stock_allocation
        bond_value = portfolio * req.bond_allocation

        stock_value *= 1 + stock_return
        bond_value *= 1 + bond_return
        portfolio = stock_value + bond_value

        if year_idx > 0:
            withdrawal_amount *= 1 + req.inflation_rate
        if portfolio > 0:
            current_rate = withdrawal_amount / portfolio
            target_rate = clamp(
                current_rate, req.withdrawal_rate_min, req.withdrawal_rate_max
            )
            target_withdrawal = portfolio * target_rate
            delta = target_withdrawal - withdrawal_amount
            if delta >= 0:
                smoothing = req.withdrawal_smoothing_up
            else:
                smoothing = req.withdrawal_smoothing_down
            withdrawal_amount = withdrawal_amount + smoothing * delta

        withdrawal = withdrawal_amount
        yearly_withdrawals.append(withdrawal)

        ss_annual = sum(
            recipient.monthly_amount * 12
            for recipient in req.ss_recipients
            if year >= recipient.start_year
        )

        portfolio = portfolio - withdrawal + ss_annual
        yearly_balances.append(portfolio)
        if portfolio <= 0:
            failed = True

    return {
        "start_year": start_year,
        "success": not failed,
        "ending_balance": portfolio,
        "yearly_balances": yearly_balances,
        "yearly_withdrawals": yearly_withdrawals,
        "highlight": start_year == req.start_year,
    }
