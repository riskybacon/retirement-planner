import { useEffect, useRef, useState } from "react";
import Charts from "./Charts.jsx";

const baseSteps = [
  {
    id: "start_year",
    prompt: "Retirement start year? (e.g., 2030)",
    parse: (value) => parseInt(value, 10),
  },
  {
    id: "retirement_years",
    prompt: "Length of retirement in years?",
    parse: (value) => parseInt(value, 10),
  },
  {
    id: "portfolio_start",
    prompt: "Starting portfolio balance? (e.g., 1000000)",
    parse: (value) => parseFloat(value),
  },
  {
    id: "stock_allocation",
    prompt: "Stock allocation %? (e.g., 60)",
    parse: (value) => percentToFraction(value),
  },
  {
    id: "withdrawal_rate_start",
    prompt: "Starting withdrawal rate %? (e.g., 4)",
    parse: (value) => percentToFraction(value),
  },
  {
    id: "withdrawal_rate_min",
    prompt: "Minimum withdrawal rate %?",
    parse: (value) => percentToFraction(value),
  },
  {
    id: "withdrawal_rate_max",
    prompt: "Maximum withdrawal rate %?",
    parse: (value) => percentToFraction(value),
  },
  {
    id: "withdrawal_smoothing_up",
    prompt: "Withdrawal smoothing up %? (0-100, 50 = default)",
    parse: (value) => percentToFraction(value),
  },
  {
    id: "withdrawal_smoothing_down",
    prompt: "Withdrawal smoothing down %? (0-100, 100 = default)",
    parse: (value) => percentToFraction(value),
  },
  {
    id: "management_fee",
    prompt: "Management fee %? (annual, after returns)",
    parse: (value) => percentToFraction(value),
  },
  {
    id: "inflation_rate",
    prompt: "Inflation rate %? (fixed)",
    parse: (value) => percentToFraction(value),
  },
  {
    id: "ss_recipient_count",
    prompt: "Number of Social Security recipients? (0-3)",
    parse: (value) => parseInt(value, 10),
  },
];

function percentToFraction(value) {
  const parsed = parseFloat(value);
  if (Number.isNaN(parsed)) {
    return NaN;
  }
  return parsed / 100;
}

function validateStep(step, value, inputs, recipients) {
  if (step.id === "retirement_years" && value < 0) {
    return "Retirement length must be zero or greater.";
  }
  if (step.id === "portfolio_start" && value <= 0) {
    return "Portfolio balance must be greater than zero.";
  }
  if (step.id === "stock_allocation" && (value < 0 || value > 1)) {
    return "Stock allocation must be between 0 and 100%.";
  }
  if (
    ["withdrawal_rate_start", "withdrawal_rate_min", "withdrawal_rate_max"].includes(
      step.id
    ) &&
    (value < 0 || value > 1)
  ) {
    return "Withdrawal rates must be between 0 and 100%.";
  }
  if (
    ["withdrawal_smoothing_up", "withdrawal_smoothing_down"].includes(step.id) &&
    (value < 0 || value > 1)
  ) {
    return "Smoothing must be between 0 and 100%.";
  }
  if (step.id === "management_fee" && (value < 0 || value > 1)) {
    return "Management fee must be between 0 and 100%.";
  }
  if (step.id === "inflation_rate" && (value < 0 || value > 1)) {
    return "Inflation rate must be between 0 and 100%.";
  }
  if (step.id === "withdrawal_rate_min") {
    const maxRate = inputs.withdrawal_rate_max;
    const startRate = inputs.withdrawal_rate_start;
    if (maxRate !== undefined && value > maxRate) {
      return "Minimum withdrawal rate cannot exceed maximum.";
    }
    if (startRate !== undefined && startRate < value) {
      return "Minimum withdrawal rate cannot exceed starting rate.";
    }
  }
  if (step.id === "withdrawal_rate_max") {
    const minRate = inputs.withdrawal_rate_min;
    const startRate = inputs.withdrawal_rate_start;
    if (minRate !== undefined && value < minRate) {
      return "Maximum withdrawal rate must be at least the minimum.";
    }
    if (startRate !== undefined && startRate > value) {
      return "Maximum withdrawal rate must be at least the starting rate.";
    }
  }
  if (step.id === "withdrawal_rate_start") {
    const minRate = inputs.withdrawal_rate_min;
    const maxRate = inputs.withdrawal_rate_max;
    if (minRate !== undefined && value < minRate) {
      return "Starting withdrawal rate must be at least the minimum.";
    }
    if (maxRate !== undefined && value > maxRate) {
      return "Starting withdrawal rate must be at most the maximum.";
    }
  }
  if (step.id === "ss_recipient_count" && (value < 0 || value > 3)) {
    return "Social Security recipients must be between 0 and 3.";
  }
  if (step.recipientField === "monthly_amount" && value < 0) {
    return "Social Security amount must be zero or greater.";
  }
  if (step.recipientField === "start_year") {
    const retirementStart = inputs.start_year;
    if (retirementStart !== undefined && value < retirementStart) {
      return "Social Security start year must be on or after retirement start year.";
    }
    if (value < 0) {
      return "Social Security start year must be zero or greater.";
    }
  }
  return "";
}

function createRecipientSteps(count) {
  const steps = [];
  for (let i = 0; i < count; i += 1) {
    steps.push({
      id: `ss_${i}_start_year`,
      prompt: `SS recipient ${i + 1} start year?`,
      parse: (value) => parseInt(value, 10),
      recipientIndex: i,
      recipientField: "start_year",
    });
    steps.push({
      id: `ss_${i}_monthly_amount`,
      prompt: `SS recipient ${i + 1} monthly amount?`,
      parse: (value) => parseFloat(value),
      recipientIndex: i,
      recipientField: "monthly_amount",
    });
  }
  return steps;
}

export default function PromptFlow() {
  const [outputs, setOutputs] = useState([
    { type: "message", role: "system", text: "Retirement simulator ready." },
    {
      type: "message",
      role: "system",
      text: "Enter percentages as whole numbers (e.g., 20 for 20%).",
    },
    { type: "message", role: "system", text: baseSteps[0].prompt },
  ]);
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState(baseSteps);
  const [inputs, setInputs] = useState({});
  const [recipients, setRecipients] = useState([]);
  const [results, setResults] = useState(null);
  const [latestRun, setLatestRun] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showQuantiles, setShowQuantiles] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [outputs, loading]);

  const pushMessage = (role, text) => {
    setOutputs((prev) => [...prev, { type: "message", role, text }]);
  };

  const pushChart = (run) => {
    setOutputs((prev) => [...prev, { type: "chart", run }]);
  };

  const pushResponse = (response) => {
    setOutputs((prev) => [...prev, { type: "response", ...response }]);
  };

  const parseStructuredAnswer = (answer) => {
    if (typeof answer !== "string") {
      return { format: "text", text: String(answer) };
    }
    const raw = answer.trim();
    let normalized = raw;
    const fenceMatch = raw.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
    if (fenceMatch) {
      normalized = fenceMatch[1].trim();
    }
    if (normalized.toLowerCase().startsWith("json")) {
      normalized = normalized.replace(/^json\s+/i, "");
    }
    try {
      const parsed = JSON.parse(normalized);
      if (
        parsed &&
        typeof parsed === "object" &&
        typeof parsed.summary === "string" &&
        Array.isArray(parsed.suggestions)
      ) {
        return {
          format: "ai-json",
          summary: parsed.summary,
          suggestions: parsed.suggestions.filter((item) => typeof item === "string"),
        };
      }
    } catch {
      // fall through to plain text
    }
    return { format: "text", text: answer };
  };

  const askAssistant = async (question, inputsPayload, resultPayload) => {
    if (!latestRun && !resultPayload) {
      pushMessage("system", "Run a simulation before asking a question.");
      return;
    }
    pushMessage("system", "Thinking...");
    try {
      const payload = {
        question,
        inputs: inputsPayload,
        summary: resultPayload?.summary ?? latestRun?.results?.summary,
      };
      const response = await fetch("/api/v1/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const detail = await response.json();
        throw new Error(formatApiError(detail));
      }
      const data = await response.json();
      pushResponse(parseStructuredAnswer(data.answer));
    } catch (error) {
      pushMessage("system", error.message);
    }
  };

  const advancePrompt = (nextSteps = steps) => {
    const nextStep = nextSteps[currentStep + 1];
    if (nextStep) {
      pushMessage("system", nextStep.prompt);
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleRecipientInput = (step, value) => {
    setRecipients((prev) => {
      const updated = [...prev];
      updated[step.recipientIndex] = {
        ...updated[step.recipientIndex],
        [step.recipientField]: value,
      };
      return updated;
    });
  };

  const runSimulation = async (payload) => {
    setLoading(true);
    pushMessage("system", "Running simulation...");
    try {
      const response = await fetch("/api/v1/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const detail = await response.json();
        throw new Error(formatApiError(detail));
      }
      const data = await response.json();
      setResults(data);
      setLatestRun({ inputs: payload, results: data });
      pushChart({ inputs: payload, results: data });
      pushMessage("system", "Simulation complete. Use /set to adjust or ask a question.");
    } catch (error) {
      pushMessage("system", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInput = async (event) => {
    event.preventDefault();
    const text = event.target.elements.command.value.trim();
    if (!text) {
      return;
    }
    event.target.reset();
    pushMessage("user", text);

    if (results) {
      const parts = text.split(/\s+/);
      const command = parts[0]?.toLowerCase();
      if (command === "/set") {
        const tokens = parts.slice(1);
        if (tokens.length < 2 || tokens.length % 2 !== 0) {
          pushMessage("system", "Usage: /set <field> <value> [<field> <value> ...]");
          pushMessage(
            "system",
            "Fields: start, years, portfolio, stock, withdraw, min, max, smoothup, smoothdown, fee, inflation."
          );
          return;
        }
        const updates = {};
        for (let i = 0; i < tokens.length; i += 2) {
          const field = normalizeField(tokens[i]);
          const value = tokens[i + 1];
          if (!field || value === undefined) {
            pushMessage("system", "Usage: /set <field> <value> [<field> <value> ...]");
            pushMessage(
              "system",
              "Fields: start, years, portfolio, stock, withdraw, min, max, smoothup, smoothdown, fee, inflation."
            );
            return;
          }
          const parsed = parseEditValue(field, value);
          if (Number.isNaN(parsed)) {
            pushMessage("system", "Invalid value.");
            pushMessage(
              "system",
              "Fields: start, years, portfolio, stock, withdraw, min, max, smoothup, smoothdown, fee, inflation."
            );
            return;
          }
          updates[field] = parsed;
        }
        const updatedInputs = { ...inputs, ...updates };
        setInputs(updatedInputs);
        await runSimulation(buildPayload(updatedInputs, recipients));
        return;
      }
      if (command === "/help") {
        pushMessage("system", "Commands: /set <field> <value> [<field> <value> ...]");
        pushMessage("system", "Ask anything else without a leading '/'.");
        return;
      }
      if (command && command.startsWith("/")) {
        pushMessage("system", "Unknown command. Try: /set <field> <value>");
        return;
      }
      await askAssistant(text, inputs, results);
      return;
    }

    const step = steps[currentStep];
    const parsedValue = step.parse(text);
    if (Number.isNaN(parsedValue)) {
      pushMessage("system", "Invalid input, try again.");
      pushMessage("system", step.prompt);
      return;
    }

    const validationError = validateStep(step, parsedValue, inputs, recipients);
    if (validationError) {
      pushMessage("system", validationError);
      pushMessage("system", step.prompt);
      return;
    }

    if (step.id === "ss_recipient_count") {
      if (parsedValue < 0 || parsedValue > 3) {
        pushMessage("system", "Please enter a number between 0 and 3.");
        pushMessage("system", step.prompt);
        return;
      }
      const recipientSteps = createRecipientSteps(parsedValue);
      const newSteps = [...steps.slice(0, currentStep + 1), ...recipientSteps];
      setSteps(newSteps);
      setRecipients(Array.from({ length: parsedValue }, () => ({
        start_year: null,
        monthly_amount: null,
      })));
      setInputs((prev) => ({ ...prev, [step.id]: parsedValue }));
      if (parsedValue === 0) {
        const payload = buildPayload({ ...inputs, [step.id]: parsedValue }, []);
        await runSimulation(payload);
        return;
      }
      advancePrompt(newSteps);
      return;
    }

    const nextRecipients = step.recipientIndex !== undefined
      ? applyRecipientUpdate(recipients, step, parsedValue)
      : recipients;

    if (step.recipientIndex !== undefined) {
      handleRecipientInput(step, parsedValue);
    } else {
      setInputs((prev) => ({ ...prev, [step.id]: parsedValue }));
    }

    if (currentStep === steps.length - 1) {
      const nextInputs = step.recipientIndex !== undefined
        ? inputs
        : { ...inputs, [step.id]: parsedValue };
      const payload = buildPayload(nextInputs, nextRecipients);
      await runSimulation(payload);
      return;
    }

    advancePrompt();
  };

  return (
    <section className="terminal">
      <div className="terminal-controls">
        <label>
          <input
            type="checkbox"
            checked={showQuantiles}
            onChange={(event) => setShowQuantiles(event.target.checked)}
          />
          <span>Show quantiles</span>
        </label>
      </div>
      <div className="terminal-log">
        {outputs.map((item, index) => {
          if (item.type === "chart") {
            return (
              <Charts
                key={`chart-${index}`}
                run={item.run}
                showQuantiles={showQuantiles}
              />
            );
          }
          if (item.type === "response") {
            if (item.format === "ai-json") {
              const lines = [
                "Summary",
                item.summary,
                "Suggestions",
                ...item.suggestions.map((suggestion) => `- ${suggestion}`),
              ];
              return (
                <div key={`response-${index}`} className="response">
                  {lines.map((line, lineIndex) => (
                    <div key={`response-${index}-${lineIndex}`} className="line system">
                      <span className="prompt">$</span>
                      <span>{line}</span>
                    </div>
                  ))}
                </div>
              );
            }
            return (
              <div key={`response-${index}`} className="line system">
                <span className="prompt">$</span>
                <span>{item.text}</span>
              </div>
            );
          }
          return (
            <div key={`${item.role}-${index}`} className={`line ${item.role}`}>
              <span className="prompt">{item.role === "user" ? ">" : "$"}</span>
              <span>{item.text}</span>
            </div>
          );
        })}
        {loading && (
          <div className="line system">
            <span className="prompt">$</span>
            <span>Working...</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <form className="command" onSubmit={handleInput}>
        <span className="prompt">&gt;</span>
        <input name="command" placeholder="Type response here" autoComplete="off" />
      </form>
    </section>
  );
}

function buildPayload(inputs, recipients) {
  const stockAllocation = inputs.stock_allocation ?? 0;
  const clampedStock = Math.min(Math.max(stockAllocation, 0), 1);
  return {
    start_year: inputs.start_year,
    retirement_years: inputs.retirement_years,
    portfolio_start: inputs.portfolio_start,
    stock_allocation: clampedStock,
    bond_allocation: 1 - clampedStock,
    withdrawal_rate_start: inputs.withdrawal_rate_start,
    withdrawal_rate_min: inputs.withdrawal_rate_min,
    withdrawal_rate_max: inputs.withdrawal_rate_max,
    withdrawal_smoothing_up: inputs.withdrawal_smoothing_up ?? 0.5,
    withdrawal_smoothing_down: inputs.withdrawal_smoothing_down ?? 1.0,
    management_fee: inputs.management_fee ?? 0,
    inflation_rate: inputs.inflation_rate,
    ss_recipients: recipients
      .filter((recipient) => recipient.start_year && recipient.monthly_amount)
      .map((recipient) => ({
        start_year: recipient.start_year,
        monthly_amount: recipient.monthly_amount,
      })),
  };
}

function formatApiError(detail) {
  if (!detail) {
    return "Simulation failed.";
  }
  if (typeof detail === "string") {
    return detail;
  }
  if (typeof detail.detail === "string") {
    return detail.detail;
  }
  if (Array.isArray(detail.detail)) {
    return detail.detail
      .map((item) => {
        const loc = Array.isArray(item.loc) ? item.loc.join(".") : "input";
        return `${loc}: ${item.msg}`;
      })
      .join(" | ");
  }
  return JSON.stringify(detail);
}

function parseEditValue(field, value) {
  const percentFields = new Set([
    "stock_allocation",
    "withdrawal_rate_start",
    "withdrawal_rate_min",
    "withdrawal_rate_max",
    "withdrawal_smoothing_up",
    "withdrawal_smoothing_down",
    "management_fee",
    "inflation_rate",
  ]);
  const intFields = new Set(["start_year", "retirement_years"]);

  if (percentFields.has(field)) {
    return percentToFraction(value);
  }
  if (intFields.has(field)) {
    return parseInt(value, 10);
  }
  if (field === "portfolio_start") {
    return parseFloat(value);
  }
  return NaN;
}

function normalizeField(field) {
  if (!field) {
    return null;
  }
  const normalized = field.toLowerCase();
  const aliases = {
    start: "start_year",
    startyear: "start_year",
    years: "retirement_years",
    length: "retirement_years",
    portfolio: "portfolio_start",
    balance: "portfolio_start",
    stock: "stock_allocation",
    withdraw: "withdrawal_rate_start",
    wr: "withdrawal_rate_start",
    min: "withdrawal_rate_min",
    max: "withdrawal_rate_max",
    smoothup: "withdrawal_smoothing_up",
    smoothdown: "withdrawal_smoothing_down",
    smoothingup: "withdrawal_smoothing_up",
    smoothingdown: "withdrawal_smoothing_down",
    fee: "management_fee",
    management: "management_fee",
    managementfee: "management_fee",
    inflation: "inflation_rate",
  };
  return aliases[normalized] || normalized;
}

function applyRecipientUpdate(current, step, value) {
  const updated = [...current];
  updated[step.recipientIndex] = {
    ...updated[step.recipientIndex],
    [step.recipientField]: value,
  };
  return updated;
}
