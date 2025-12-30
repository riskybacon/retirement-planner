import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

export default function Charts({ run }) {
  const { results, inputs } = run;
  const series = results.results;
  const maxYears = series.reduce(
    (max, item) => Math.max(max, item.yearly_balances.length),
    0
  );
  const chartData = Array.from({ length: maxYears }, (_, index) => {
    const row = { year: index };
    series.forEach((item) => {
      row[seriesKey(item.start_year)] = item.yearly_balances[index] ?? null;
    });
    return row;
  });
  const range = getBalanceRange(series);
  const ticks = buildTicks(range.min, range.max, 5);

  return (
    <div className="charts">
      <div className="chart-card">
        <h2>Portfolio Balance by Year</h2>
        <p className="chart-meta">{formatInputs(inputs)}</p>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#233" />
            <XAxis dataKey="year" stroke="#9fb" />
            <YAxis
              stroke="#9fb"
              type="number"
              domain={[range.min, range.max]}
              tickFormatter={formatCompactCurrency}
              ticks={ticks}
              width={90}
            />
            <ReferenceLine y={0} stroke="#ffb347" strokeDasharray="6 6" />
            {series.map((item) => (
              <Line
                key={item.start_year}
                type="monotone"
                dataKey={seriesKey(item.start_year)}
                stroke={item.highlight ? "#ffb347" : "rgba(84, 224, 164, 0.3)"}
                strokeWidth={item.highlight ? 2.5 : 1}
                dot={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-card">
        <h2>Summary</h2>
        <p className="chart-meta">{formatInputs(inputs)}</p>
        <p>Simulations: {results.summary.total_runs}</p>
        <p>Successes: {results.summary.success_count}</p>
        <p>Failures: {results.summary.failure_count}</p>
        <p>Success rate: {(results.summary.success_rate * 100).toFixed(1)}%</p>
        <p>Start year range: {results.series.min_year} - {results.series.max_year}</p>
      </div>
    </div>
  );
}

function seriesKey(startYear) {
  return `start_${startYear}`;
}

function formatCurrency(value) {
  if (value === null || value === undefined) {
    return "";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCompactCurrency(value) {
  if (value === null || value === undefined) {
    return "";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function getBalanceRange(series) {
  let min = 0;
  let max = 0;
  series.forEach((item) => {
    item.yearly_balances.forEach((value) => {
      if (value === null || value === undefined) {
        return;
      }
      if (value < min) {
        min = value;
      }
      if (value > max) {
        max = value;
      }
    });
  });
  min = Math.min(min, 0);
  max = Math.max(max, 0);
  return { min, max };
}

function buildTicks(min, max, count) {
  if (count <= 1 || min === max) {
    return [min, max];
  }
  const step = (max - min) / (count - 1);
  const ticks = [];
  for (let i = 0; i < count; i += 1) {
    ticks.push(min + step * i);
  }
  return ticks;
}

function formatInputs(inputs) {
  if (!inputs) {
    return "Parameters unavailable";
  }
  const allocation = `${formatPercent(inputs.stock_allocation)} / ${formatPercent(inputs.bond_allocation)}`;
  const wr = `${formatPercent(inputs.withdrawal_rate_start)} (${formatPercent(inputs.withdrawal_rate_min)}–${formatPercent(inputs.withdrawal_rate_max)})`;
  const ssCount = inputs.ss_recipients?.length || 0;
  return [
    `Start ${inputs.start_year}`,
    `${inputs.retirement_years}y`,
    formatCurrency(inputs.portfolio_start),
    `Alloc ${allocation}`,
    `WR ${wr}`,
    `Infl ${formatPercent(inputs.inflation_rate)}`,
    `SS ${ssCount}`,
  ].join(" • ");
}

function formatPercent(value) {
  if (value === null || value === undefined) {
    return "--";
  }
  return `${(value * 100).toFixed(1)}%`;
}
