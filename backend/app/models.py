from pydantic import BaseModel, confloat, conint


class SSRecipient(BaseModel):
    start_year: conint(ge=1900)
    monthly_amount: confloat(ge=0)


class SimulationInput(BaseModel):
    start_year: conint(ge=1900)
    retirement_years: conint(gt=0, le=100)
    portfolio_start: confloat(gt=0)
    stock_allocation: confloat(ge=0, le=1)
    bond_allocation: confloat(ge=0, le=1)
    withdrawal_rate_start: confloat(gt=0, le=1)
    withdrawal_rate_min: confloat(gt=0, le=1)
    withdrawal_rate_max: confloat(gt=0, le=1)
    withdrawal_smoothing_up: confloat(ge=0, le=1) = 1.0
    withdrawal_smoothing_down: confloat(ge=0, le=1) = 1.0
    management_fee: confloat(ge=0, le=1.0) = 0.0
    inflation_rate: confloat(ge=0, le=0.2)
    ss_recipients: list[SSRecipient] = []


class PerStartYearResult(BaseModel):
    start_year: int
    success: bool
    ending_balance: float
    yearly_balances: list[float]
    yearly_withdrawals: list[float]
    yearly_fees: list[float]
    highlight: bool = False


class Summary(BaseModel):
    total_runs: int
    success_count: int
    failure_count: int
    success_rate: float
    ending_balance_percentiles: dict
    portfolio_quantiles: dict
    spending_quantiles: dict
    fee_quantiles: dict


class SimulationResponse(BaseModel):
    series: dict
    results: list[PerStartYearResult]
    summary: Summary
    quantile_indices: list[int]
