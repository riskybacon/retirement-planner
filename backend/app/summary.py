from typing import List


def percentile(values: List[float], p: float) -> float:
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


def summarize_results(results: List[dict]) -> dict:
    if not results:
        return {
            "total_runs": 0,
            "success_count": 0,
            "failure_count": 0,
            "success_rate": 0.0,
            "ending_balance_percentiles": {},
        }
    successes = sum(1 for item in results if item["success"])
    ending_balances = [item["ending_balance"] for item in results]
    total_runs = len(results)
    return {
        "total_runs": total_runs,
        "success_count": successes,
        "failure_count": total_runs - successes,
        "success_rate": successes / total_runs,
        "ending_balance_percentiles": {
            "p10": percentile(ending_balances, 10),
            "p50": percentile(ending_balances, 50),
            "p90": percentile(ending_balances, 90),
        },
    }
