import PromptFlow from "./components/PromptFlow.jsx";

export default function App() {
  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <span className="brand-mark">$</span>
          <div>
            <h1>Retirement Planner</h1>
            <p>Historical simulations with guardrail withdrawals.</p>
          </div>
        </div>
      </header>
      <main className="layout">
        <PromptFlow />
      </main>
    </div>
  );
}
