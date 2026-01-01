from typing import TypedDict

from pydantic import BaseModel, Field


class SSRecipient(BaseModel):
    start_year: int = Field(ge=1900)
    monthly_amount: float = Field(ge=0)


class SimulationInput(BaseModel):
    start_year: int = Field(ge=1900)
    retirement_years: int = Field(gt=0, le=100)
    portfolio_start: float = Field(gt=0)
    stock_allocation: float = Field(ge=0, le=1)
    bond_allocation: float = Field(ge=0, le=1)
    withdrawal_rate_start: float = Field(gt=0, le=1)
    withdrawal_rate_min: float = Field(gt=0, le=1)
    withdrawal_rate_max: float = Field(gt=0, le=1)
    withdrawal_smoothing_up: float = Field(ge=0, le=1, default=1.0)
    withdrawal_smoothing_down: float = Field(ge=0, le=1, default=1.0)
    management_fee: float = Field(ge=0, le=1.0, default=0.0)
    inflation_rate: float = Field(ge=0, le=0.2)
    ss_recipients: list[SSRecipient] = Field(default_factory=list)


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
    ending_balance_percentiles: dict[str, float]
    portfolio_quantiles: dict[str, float]
    spending_quantiles: dict[str, float]
    fee_quantiles: dict[str, float]


class SimulationResponse(BaseModel):
    series: dict[str, int]
    results: list[PerStartYearResult]
    summary: Summary
    quantile_indices: list[int]


class SimulationRun(TypedDict):
    start_year: int
    success: bool
    ending_balance: float
    yearly_balances: list[float]
    yearly_withdrawals: list[float]
    yearly_fees: list[float]
    highlight: bool
