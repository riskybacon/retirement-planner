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
    prompt: "Stock allocation %? (e.g., 60 or 0.6)",
    parse: (value) => toPercent(value),
  },
  {
    id: "withdrawal_rate_start",
    prompt: "Starting withdrawal rate %? (e.g., 4)",
    parse: (value) => toPercent(value),
  },
  {
    id: "withdrawal_rate_min",
    prompt: "Minimum withdrawal rate %?",
    parse: (value) => toPercent(value),
  },
  {
    id: "withdrawal_rate_max",
    prompt: "Maximum withdrawal rate %?",
    parse: (value) => toPercent(value),
  },
  {
    id: "inflation_rate",
    prompt: "Inflation rate %? (fixed)",
    parse: (value) => toPercent(value),
  },
  {
    id: "ss_recipient_count",
    prompt: "Number of Social Security recipients? (0-3)",
    parse: (value) => parseInt(value, 10),
  },
];

function toPercent(value) {
  const parsed = parseFloat(value);
  if (Number.isNaN(parsed)) {
    return NaN;
  }
  return parsed > 1 ? parsed / 100 : parsed;
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
    { type: "message", role: "system", text: baseSteps[0].prompt },
  ]);
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState(baseSteps);
  const [inputs, setInputs] = useState({});
  const [recipients, setRecipients] = useState([]);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
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
        throw new Error(detail.detail || "Simulation failed.");
      }
      const data = await response.json();
      setResults(data);
      pushChart({ inputs: payload, results: data });
      pushMessage("system", "Simulation complete. Type 'edit <field> <value>' to adjust.");
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
      if (text.startsWith("edit ")) {
        const tokens = text.split(/\s+/).slice(1);
        if (tokens.length < 2 || tokens.length % 2 !== 0) {
          pushMessage("system", "Usage: edit <field> <value> [<field> <value> ...]");
          pushMessage(
            "system",
            "Fields: start, years, portfolio, stock, withdraw, min, max, inflation."
          );
          return;
        }
        const updates = {};
        for (let i = 0; i < tokens.length; i += 2) {
          const field = normalizeField(tokens[i]);
          const value = tokens[i + 1];
          if (!field || value === undefined) {
            pushMessage("system", "Usage: edit <field> <value> [<field> <value> ...]");
            pushMessage(
              "system",
              "Fields: start, years, portfolio, stock, withdraw, min, max, inflation."
            );
            return;
          }
          const parsed = parseEditValue(field, value);
          if (Number.isNaN(parsed)) {
            pushMessage("system", "Invalid value.");
            pushMessage(
              "system",
              "Fields: start, years, portfolio, stock, withdraw, min, max, inflation."
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
      pushMessage("system", "Unknown command. Try: edit <field> <value>");
      return;
    }

    const step = steps[currentStep];
    const parsedValue = step.parse(text);
    if (Number.isNaN(parsedValue)) {
      pushMessage("system", "Invalid input, try again.");
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
      <div className="terminal-log">
        {outputs.map((item, index) => {
          if (item.type === "chart") {
            return <Charts key={`chart-${index}`} run={item.run} />;
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
    inflation_rate: inputs.inflation_rate,
    ss_recipients: recipients
      .filter((recipient) => recipient.start_year && recipient.monthly_amount)
      .map((recipient) => ({
        start_year: recipient.start_year,
        monthly_amount: recipient.monthly_amount,
      })),
  };
}

function parseEditValue(field, value) {
  const percentFields = new Set([
    "stock_allocation",
    "withdrawal_rate_start",
    "withdrawal_rate_min",
    "withdrawal_rate_max",
    "inflation_rate",
  ]);
  const intFields = new Set(["start_year", "retirement_years"]);

  if (percentFields.has(field)) {
    return toPercent(value);
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
