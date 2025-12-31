import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

export default function Charts({ run, showQuantiles }) {
  const { results, inputs } = run;
  const series = filterSeries(results, showQuantiles);
  const maxYears = series.length
    ? series.reduce((max, item) => Math.max(max, item.yearly_balances.length), 0)
    : 0;
  const balanceData = buildChartData(series, "yearly_balances", maxYears);
  const spendingData = buildChartData(series, "yearly_withdrawals", maxYears);
  const range = getValueRange(series, "yearly_balances");
  const spendingRange = getValueRange(series, "yearly_withdrawals");
  const ticks = buildTicks(range.min, range.max, 5);
  const spendingTicks = buildTicks(spendingRange.min, spendingRange.max, 5);

  return (
    <div className="charts">
      <div className="chart-card">
        <h2>Portfolio Balance by Year</h2>
        <p className="chart-meta">{formatInputs(inputs)}</p>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={balanceData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#233" />
            <XAxis
              dataKey="year"
              stroke="#9fb"
              tickFormatter={(value) => toYearLabel(value, inputs?.start_year)}
            />
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
                type="linear"
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
        <h2>Withdrawl by Year</h2>
        <p className="chart-meta">{formatInputs(inputs)}</p>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={spendingData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#233" />
            <XAxis
              dataKey="year"
              stroke="#9fb"
              tickFormatter={(value) => toYearLabel(value, inputs?.start_year)}
            />
            <YAxis
              stroke="#9fb"
              type="number"
              domain={[spendingRange.min, spendingRange.max]}
              tickFormatter={formatCompactCurrency}
              ticks={spendingTicks}
              width={90}
            />
            {series.map((item) => (
              <Line
                key={`spend-${item.start_year}`}
                type="linear"
                dataKey={seriesKey(item.start_year)}
                stroke={item.highlight ? "#ffb347" : "rgba(143, 242, 200, 0.25)"}
                strokeWidth={item.highlight ? 2 : 1}
                dot={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-card">
        <h2>Ending Portfolio Value Quantiles</h2>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={toQuantileBars(results.summary.portfolio_quantiles)}>
            <CartesianGrid strokeDasharray="3 3" stroke="#233" />
            <XAxis dataKey="name" stroke="#9fb" />
            <YAxis
              stroke="#9fb"
              tickFormatter={formatCompactCurrency}
              width={90}
            />
            <Bar dataKey="value" fill="#54e0a4" radius={[6, 6, 0, 0]}>
              <LabelList
                dataKey="value"
                position="insideTop"
                offset={12}
                formatter={formatCompactCurrency}
                fill="#0b1412"
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-card">
        <h2>Total Withdrawl Quantiles</h2>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={toQuantileBars(results.summary.spending_quantiles)}>
            <CartesianGrid strokeDasharray="3 3" stroke="#233" />
            <XAxis dataKey="name" stroke="#9fb" />
            <YAxis
              stroke="#9fb"
              tickFormatter={formatCompactCurrency}
              width={90}
            />
            <Bar dataKey="value" fill="#ffb347" radius={[6, 6, 0, 0]}>
              <LabelList
                dataKey="value"
                position="insideTop"
                offset={12}
                formatter={formatCompactCurrency}
                fill="#0b1412"
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-card">
        <h2>Total Fee Quantiles</h2>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={toQuantileBars(results.summary.fee_quantiles)}>
            <CartesianGrid strokeDasharray="3 3" stroke="#233" />
            <XAxis dataKey="name" stroke="#9fb" />
            <YAxis
              stroke="#9fb"
              tickFormatter={formatCompactCurrency}
              width={90}
            />
            <Bar dataKey="value" fill="#7cc6ff" radius={[6, 6, 0, 0]}>
              <LabelList
                dataKey="value"
                position="insideTop"
                offset={12}
                formatter={formatCompactCurrency}
                fill="#0b1412"
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-card">
        <h2>Summary</h2>
        <p className="chart-meta">{formatInputs(inputs)}</p>
        <p>Withdrawal smoothing up: {formatPercent(inputs.withdrawal_smoothing_up)}</p>
        <p>Withdrawal smoothing down: {formatPercent(inputs.withdrawal_smoothing_down)}</p>
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

function getValueRange(series, key) {
  let min = 0;
  let max = 0;
  series.forEach((item) => {
    (item[key] || []).forEach((value) => {
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

function buildChartData(series, key, length) {
  return Array.from({ length }, (_, index) => {
    const row = { year: index };
    series.forEach((item) => {
      row[seriesKey(item.start_year)] = item[key]?.[index] ?? null;
    });
    return row;
  });
}

function toYearLabel(index, startYear) {
  if (!startYear) {
    return index;
  }
  return startYear + index;
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
    `Smooth Up ${formatPercent(inputs.withdrawal_smoothing_up)}`,
    `Smooth Down ${formatPercent(inputs.withdrawal_smoothing_down)}`,
    `Fee ${formatPercent(inputs.management_fee)}`,
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

function toQuantileBars(quantiles) {
  if (!quantiles) {
    return [];
  }
  const keys = ["p0", "p25", "p50", "p75", "p100"];
  return keys.map((key) => ({
    name: key,
    value: quantiles[key] ?? 0,
  }));
}

function filterSeries(results, showQuantiles) {
  const series = results.results;
  if (!showQuantiles) {
    return series;
  }
  const indices = results.quantile_indices || [];
  const indexSet = new Set(indices);
  return series.filter((_, index) => indexSet.has(index));
}
