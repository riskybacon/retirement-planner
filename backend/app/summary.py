from .models import SimulationRun, Summary


def percentile(values: list[float], p: float) -> float:
    if not values:
        return 0.0
    values = sorted(values)
    if p <= 0:
        return values[0]
    if p >= 100:
        return values[-1]
    k = (len(values) - 1) * (p / 100.0)
    f = int(k)
    c = min(f + 1, len(values) - 1)
    if f == c:
        return values[f]
    d0 = values[f] * (c - k)
    d1 = values[c] * (k - f)
    return d0 + d1


def summarize_results(results: list[SimulationRun]) -> Summary:
    if not results:
        return Summary(
            total_runs=0,
            success_count=0,
            failure_count=0,
            success_rate=0.0,
            ending_balance_percentiles={},
            portfolio_quantiles={},
            spending_quantiles={},
            fee_quantiles={},
        )
    successes = sum(1 for item in results if item["success"])
    ending_balances = [item["ending_balance"] for item in results]
    total_spend_per_run = [sum(item.get("yearly_withdrawals", [])) for item in results]
    total_fees_per_run = [sum(item.get("yearly_fees", [])) for item in results]
    total_runs = len(results)
    return Summary(
        total_runs=total_runs,
        success_count=successes,
        failure_count=total_runs - successes,
        success_rate=successes / total_runs,
        ending_balance_percentiles={
            "p10": percentile(ending_balances, 10),
            "p50": percentile(ending_balances, 50),
            "p90": percentile(ending_balances, 90),
        },
        portfolio_quantiles={
            "p0": percentile(ending_balances, 0),
            "p25": percentile(ending_balances, 25),
            "p50": percentile(ending_balances, 50),
            "p75": percentile(ending_balances, 75),
            "p100": percentile(ending_balances, 100),
        },
        spending_quantiles={
            "p0": percentile(total_spend_per_run, 0),
            "p25": percentile(total_spend_per_run, 25),
            "p50": percentile(total_spend_per_run, 50),
            "p75": percentile(total_spend_per_run, 75),
            "p100": percentile(total_spend_per_run, 100),
        },
        fee_quantiles={
            "p0": percentile(total_fees_per_run, 0),
            "p25": percentile(total_fees_per_run, 25),
            "p50": percentile(total_fees_per_run, 50),
            "p75": percentile(total_fees_per_run, 75),
            "p100": percentile(total_fees_per_run, 100),
        },
    )


def compute_quantile_indices(results: list[SimulationRun]) -> list[int]:
    if not results:
        return []

    def total_withdrawals(item: SimulationRun) -> float:
        return sum(item["yearly_withdrawals"])

    def rank_indices(values: list[tuple[int, float]]) -> list[int]:
        values = sorted(values, key=lambda item: (item[1], item[0]))
        last = len(values) - 1
        quantiles = [0, 0.25, 0.5, 0.75, 1.0]
        indices = []
        for q in quantiles:
            rank = round(q * last)
            indices.append(values[rank][0])
        return indices

    portfolio = [(idx, item["ending_balance"]) for idx, item in enumerate(results)]
    withdrawl = [(idx, total_withdrawals(item)) for idx, item in enumerate(results)]

    combined = rank_indices(portfolio) + rank_indices(withdrawl)
    return sorted(set(combined))
