import React, { useMemo, useState } from "react";

// TutorCostCalculator.jsx
// Tailwind-based React component. Default export a component that computes costs
// Usage: drop this file into a React + Tailwind project and import the component.

export default function TutorCostCalculator() {
  // Inputs
  const [students, setStudents] = useState(10);
  const [qaPerDay, setQaPerDay] = useState(10);
  const [daysPerMonth, setDaysPerMonth] = useState(30);
  const [percentImages, setPercentImages] = useState(30);
  const [tokensIn, setTokensIn] = useState(300);
  const [tokensOut, setTokensOut] = useState(500);
  const [ttsChars, setTtsChars] = useState(500);
  const [exchangeRate, setExchangeRate] = useState(85);
  const [selectedCurrency, setSelectedCurrency] = useState("USD"); // New state for currency selection

  // Provider selections
  const [imageProvider, setImageProvider] = useState("OpenAI"); // OpenAI | Wolfram
  const [ttsProvider, setTtsProvider] = useState("OpenAI"); // OpenAI | ElevenLabs
  const [vectorProvider, setVectorProvider] = useState("Pinecone"); // Pinecone | pgvector
  const [n8nMode, setN8nMode] = useState("SelfHost"); // SelfHost | Cloud

  // Pricing defaults (USD) — editable here if you want to tune
  const PRICING = useMemo(() => ({
    tokenInputPer1M: 0.15, // $ per 1M input tokens
    tokenOutputPer1M: 0.60, // $ per 1M output tokens
    openaiImagePerUnit: 0.04, // $ per image
    wolframPerCall: 0.03, // $ per precise diagram call
    openaiTtsPer1kChars: 0.015, // $ per 1k chars
    elevenLabsPerMinute: 0.30, // $ per minute (approx)
    pineconeMonthly: 50, // $ baseline
    pgvectorMonthly: 0, // assume self-hosted included in VPS
    n8nCloudMonthly: 24, // $ per month
    n8nSelfHostVPS: 30, // $ VPS cost to run n8n (if self-host)
    appVPSMonthly: 30, // $ for app + Postgres + files
    monitoringMonthly: 20, // $ misc
    // Additional infrastructure costs
    fileStorageMonthly: 5, // $ for file storage and CDN
    securitySSLMonthly: 3, // $ for SSL certificates and security tools
    backupRecoveryMonthly: 7, // $ for backup and recovery services
  }), []);

  // Computations
  const results = useMemo(() => {
    const interactions = students * qaPerDay * daysPerMonth;

    // Tokens
    const totalInputTokens = interactions * tokensIn; // raw tokens
    const totalOutputTokens = interactions * tokensOut;

    const costTokensUSD =
      (totalInputTokens / 1_000_000) * PRICING.tokenInputPer1M +
      (totalOutputTokens / 1_000_000) * PRICING.tokenOutputPer1M;

    // Images count
    const imageCount = Math.round((interactions * percentImages) / 100);
    const costImagesUSD =
      imageProvider === "OpenAI"
        ? imageCount * PRICING.openaiImagePerUnit
        : imageCount * PRICING.wolframPerCall; // if using Wolfram for diagrams

    // Wolfram & OpenAI split for detailed view
    const wolframCalls = imageProvider === "Wolfram" ? imageCount : 0;
    const openAiImageCalls = imageProvider === "OpenAI" ? imageCount : 0;

    // TTS
    const ttsCount = interactions;
    const totalTtsChars = ttsCount * ttsChars;
    const ttsCostUSD =
  ttsProvider === "OpenAI"
    ? (totalTtsChars / 1000) * PRICING.openaiTtsPer1kChars
    : // ElevenLabs: chars -> minutes + tiered pricing
      (() => {
        const minutesPerConversion = ttsChars / 750; 
        // ~750 chars = 1 min (approx: 5 chars/word, 150 wpm)
        const totalMinutes = minutesPerConversion * ttsCount;

        const basePlanMinutes = 1000;
        const baseCost = 99;
        const extraMinuteRate = 0.12;

        if (totalMinutes <= basePlanMinutes) {
          return baseCost;
        } else {
          const extraMinutes = totalMinutes - basePlanMinutes;
          return baseCost + extraMinutes * extraMinuteRate;
        }
      })();

    // Vector DB
    const vectorCostUSD = vectorProvider === "Pinecone" ? PRICING.pineconeMonthly : PRICING.pgvectorMonthly;

    // n8n + infra
    const n8nCostUSD = n8nMode === "Cloud" ? PRICING.n8nCloudMonthly : PRICING.n8nSelfHostVPS;
    const appVpsUSD = PRICING.appVPSMonthly;
    const monitoringUSD = PRICING.monitoringMonthly;

    // Calculate total based on the 7 displayed items only
    const totalUSD = costTokensUSD + costImagesUSD + ttsCostUSD + vectorCostUSD + n8nCostUSD + appVpsUSD + monitoringUSD;
    const totalINR = totalUSD * exchangeRate;

    return {
      interactions,
      totalInputTokens,
      totalOutputTokens,
      costTokensUSD,
      imageCount,
      openAiImageCalls,
      wolframCalls,
      costImagesUSD,
      ttsCount,
      totalTtsChars,
      ttsCostUSD,
      vectorCostUSD,
      n8nCostUSD,
      appVpsUSD,
      monitoringUSD,
      totalUSD,
      totalINR,
    };
  }, [
    students,
    qaPerDay,
    daysPerMonth,
    percentImages,
    tokensIn,
    tokensOut,
    ttsChars,
    exchangeRate,
    imageProvider,
    ttsProvider,
    vectorProvider,
    n8nMode,
    PRICING,
  ]);

  // CSV / Download helper
  const downloadCSV = () => {
    const rows = [
      ["Item", "Value (USD)", "Value (INR)"],
      ["Total interactions", results.interactions, ""],
      ["Total input tokens", results.totalInputTokens, ""],
      ["Total output tokens", results.totalOutputTokens, ""],
      ["LLM (tokens)", results.costTokensUSD.toFixed(4), ""],
      [
        `${imageProvider} images (${results.imageCount})`,
        results.costImagesUSD.toFixed(4),
        "",
      ],
      ["TTS", results.ttsCostUSD.toFixed(4), ""],
      ["Vector DB", results.vectorCostUSD.toFixed(2), ""],
      ["n8n", results.n8nCostUSD.toFixed(2), ""],
      ["App VPS", results.appVpsUSD.toFixed(2), ""],
      ["Monitoring", results.monitoringUSD.toFixed(2), ""],
      ["Total (USD)", results.totalUSD.toFixed(2), ""],
      ["Total (INR)", (results.totalINR).toFixed(0), ""],
    ];

    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tutor_costs.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Small pie chart data for visual
  const breakdown = useMemo(() => {
    const parts = [
      { key: "LLM", value: results.costTokensUSD },
      { key: "Images", value: results.costImagesUSD },
      { key: "TTS", value: results.ttsCostUSD },
      { key: "Infra", value: results.vectorCostUSD + results.n8nCostUSD + results.appVpsUSD + results.monitoringUSD },
    ];
    const total = Math.max(results.totalUSD, 1);
    return parts.map((p) => ({ ...p, pct: (p.value / total) * 100 }));
  }, [results]);

  // Small UI helpers
  const formatUSD = (v) => `$${Number(v).toFixed(2)}`;
  const formatINR = (v) => `₹${Number(v).toFixed(0)}`;
  
  // New helper function to format based on selected currency
  const formatCurrency = (usdValue) => {
    if (selectedCurrency === "USD") {
      return formatUSD(usdValue);
    } else {
      return formatINR(usdValue * exchangeRate);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* INPUTS */}
        <div className="col-span-1 md:col-span-2 bg-white shadow rounded p-6">
          <h3 className="text-lg font-semibold mb-4">Tutor Cost Calculator</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <div className="text-sm text-gray-600">Students</div>
              <input
                type="number"
                min={1}
                value={students}
                onChange={(e) => setStudents(Number(e.target.value))}
                className="mt-1 w-full border rounded p-2"
              />
            </label>

            <label className="block">
              <div className="text-sm text-gray-600">Q&A per student / day</div>
              <input
                type="number"
                min={1}
                value={qaPerDay}
                onChange={(e) => setQaPerDay(Number(e.target.value))}
                className="mt-1 w-full border rounded p-2"
              />
            </label>

            <label className="block">
              <div className="text-sm text-gray-600">Days / month</div>
              <input
                type="number"
                min={1}
                value={daysPerMonth}
                onChange={(e) => setDaysPerMonth(Number(e.target.value))}
                className="mt-1 w-full border rounded p-2"
              />
            </label>

            <label className="block">
              <div className="text-sm text-gray-600">% interactions with images</div>
              <input
                type="number"
                min={0}
                max={100}
                value={percentImages}
                onChange={(e) => setPercentImages(Number(e.target.value))}
                className="mt-1 w-full border rounded p-2"
              />
            </label>

            <label className="block">
              <div className="text-sm text-gray-600">Tokens (input)</div>
              <input
                type="number"
                min={0}
                value={tokensIn}
                onChange={(e) => setTokensIn(Number(e.target.value))}
                className="mt-1 w-full border rounded p-2"
              />
            </label>

            <label className="block">
              <div className="text-sm text-gray-600">Tokens (output)</div>
              <input
                type="number"
                min={0}
                value={tokensOut}
                onChange={(e) => setTokensOut(Number(e.target.value))}
                className="mt-1 w-full border rounded p-2"
              />
            </label>

            <label className="block">
              <div className="text-sm text-gray-600">Avg TTS characters</div>
              <input
                type="number"
                min={10}
                value={ttsChars}
                onChange={(e) => setTtsChars(Number(e.target.value))}
                className="mt-1 w-full border rounded p-2"
              />
            </label>

            <label className="block">
              <div className="text-sm text-gray-600">Exchange rate ($ → ₹)</div>
              <input
                type="number"
                min={1}
                value={exchangeRate}
                onChange={(e) => setExchangeRate(Number(e.target.value))}
                className="mt-1 w-full border rounded p-2"
              />
            </label>

            <label className="block">
              <div className="text-sm text-gray-600">Image provider</div>
              <select
                value={imageProvider}
                onChange={(e) => setImageProvider(e.target.value)}
                className="mt-1 w-full border rounded p-2"
              >
                <option>OpenAI</option>
                <option>Wolfram</option>
              </select>
            </label>

            <label className="block">
              <div className="text-sm text-gray-600">TTS provider</div>
              <select
                value={ttsProvider}
                onChange={(e) => setTtsProvider(e.target.value)}
                className="mt-1 w-full border rounded p-2"
              >
                <option>OpenAI</option>
                <option>ElevenLabs</option>
              </select>
            </label>

            <label className="block">
              <div className="text-sm text-gray-600">Vector DB</div>
              <select
                value={vectorProvider}
                onChange={(e) => setVectorProvider(e.target.value)}
                className="mt-1 w-full border rounded p-2"
              >
                <option>Pinecone</option>
                <option>pgvector (Self-host)</option>
              </select>
            </label>

            <label className="block">
              <div className="text-sm text-gray-600">n8n mode</div>
              <select
                value={n8nMode}
                onChange={(e) => setN8nMode(e.target.value)}
                className="mt-1 w-full border rounded p-2"
              >
                <option value="SelfHost">Self-host</option>
                <option value="Cloud">n8n Cloud</option>
              </select>
            </label>

            {/* New currency dropdown */}
            <label className="block">
              <div className="text-sm text-gray-600">Display Currency</div>
              <select
                value={selectedCurrency}
                onChange={(e) => setSelectedCurrency(e.target.value)}
                className="mt-1 w-full border rounded p-2"
              >
                <option value="USD">USD ($)</option>
                <option value="INR">INR (₹)</option>
              </select>
            </label>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={downloadCSV}
              className="bg-indigo-600 text-white px-4 py-2 rounded shadow"
            >
              Download CSV
            </button>

            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="bg-gray-200 px-4 py-2 rounded"
            >
              Reset view
            </button>
          </div>
        </div>

        {/* RESULTS */}
        <div className="col-span-1 bg-gradient-to-br from-blue-50 to-indigo-100 shadow-xl rounded-xl p-6 border border-indigo-200">
          {/* Header with enhanced styling */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full mb-3">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <h4 className="text-xl font-bold text-gray-800 mb-1">Cost Summary</h4>
            <p className="text-sm text-gray-600">Monthly breakdown in {selectedCurrency}</p>
          </div>

          {/* Key Metrics Cards */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
              <div className="text-xs text-gray-500 uppercase tracking-wide">Total Interactions</div>
              <div className="text-lg font-bold text-indigo-600">{results.interactions.toLocaleString()}</div>
            </div>
            <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
              <div className="text-xs text-gray-500 uppercase tracking-wide">Per Student</div>
              <div className="text-lg font-bold text-green-600">{formatCurrency(results.totalUSD / Math.max(1, students))}</div>
            </div>
          </div>

          {/* Cost Breakdown with enhanced styling */}
          <div className="space-y-3 mb-6">
            <h5 className="font-semibold text-gray-700 text-sm uppercase tracking-wide border-b border-gray-200 pb-2">Cost Breakdown</h5>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center p-2 bg-white rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-indigo-500 rounded-full mr-2"></div>
                  <span className="text-sm text-gray-700">LLM Tokens</span>
                </div>
                <strong className="text-indigo-600">{formatCurrency(results.costTokensUSD)}</strong>
              </div>
              
              <div className="flex justify-between items-center p-2 bg-white rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-sm text-gray-700">OpenAI images ({results.imageCount})</span>
                </div>
                <strong className="text-green-600">{formatCurrency(results.costImagesUSD)}</strong>
              </div>
              
              <div className="flex justify-between items-center p-2 bg-white rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                  <span className="text-sm text-gray-700">TTS (OpenAI)</span>
                </div>
                <strong className="text-yellow-600">{formatCurrency(results.ttsCostUSD)}</strong>
              </div>
              
              <div className="flex justify-between items-center p-2 bg-white rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                  <span className="text-sm text-gray-700">Vector DB</span>
                </div>
                <strong className="text-red-600">{formatCurrency(results.vectorCostUSD)}</strong>
              </div>
              
              <div className="flex justify-between items-center p-2 bg-white rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-purple-500 rounded-full mr-2"></div>
                  <span className="text-sm text-gray-700">n8n</span>
                </div>
                <strong className="text-purple-600">{formatCurrency(results.n8nCostUSD)}</strong>
              </div>
              
              <div className="flex justify-between items-center p-2 bg-white rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                  <span className="text-sm text-gray-700">App VPS</span>
                </div>
                <strong className="text-blue-600">{formatCurrency(results.appVpsUSD)}</strong>
              </div>
              
              <div className="flex justify-between items-center p-2 bg-white rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-teal-500 rounded-full mr-2"></div>
                  <span className="text-sm text-gray-700">Monitoring</span>
                </div>
                <strong className="text-teal-600">{formatCurrency(results.monitoringUSD)}</strong>
              </div>
            </div>
          </div>

          {/* Total Cost Highlight */}
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-4 text-white text-center mb-4 shadow-lg">
            <div className="text-sm opacity-90 mb-1">Total Monthly Cost</div>
            <div className="text-3xl font-bold mb-1">{formatCurrency(results.totalUSD)}</div>
            <div className="text-xs opacity-75">
              {selectedCurrency === "USD" ? `₹${(results.totalUSD * exchangeRate).toFixed(0)}` : `$${(results.totalUSD / exchangeRate).toFixed(2)}`}
            </div>
          </div>

          {/* Enhanced pie chart with legend */}
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
            <h5 className="font-semibold text-gray-700 text-sm uppercase tracking-wide mb-3 text-center">Cost Distribution</h5>
            <div className="flex items-center justify-center mb-3">
              <svg viewBox="0 0 32 32" width="120" height="120" className="mx-auto">
                {(() => {
                  let start = 0;
                  const center = 16;
                  const radius = 12;
                  const colors = ["#6366F1", "#10B981", "#F59E0B", "#EF4444"];
                  return breakdown.map((b, i) => {
                    const slice = Math.max(0.001, b.pct / 100) * Math.PI * 2;
                    const x1 = center + radius * Math.cos(start);
                    const y1 = center + radius * Math.sin(start);
                    start += slice;
                    const x2 = center + radius * Math.cos(start);
                    const y2 = center + radius * Math.sin(start);
                    const large = slice > Math.PI ? 1 : 0;
                    const d = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2} Z`;
                    return <path key={i} d={d} fill={colors[i % colors.length]} stroke="#fff" strokeWidth="0.3" />;
                  });
                })()}
              </svg>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {breakdown.map((b, i) => {
                const colors = ["#6366F1", "#10B981", "#F59E0B", "#EF4444"];
                return (
                  <div key={b.key} className="flex items-center justify-center">
                    <div 
                      className="w-3 h-3 rounded-full mr-2" 
                      style={{ backgroundColor: colors[i % colors.length] }}
                    ></div>
                    <div className="text-center">
                      <div className="font-semibold text-gray-700">{b.key}</div>
                      <div className="text-gray-500">{b.pct.toFixed(0)}%</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Additional Insights */}
          <div className="mt-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-3 border border-green-200">
            <div className="flex items-center mb-2">
              <svg className="w-4 h-4 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-semibold text-green-800">Insights</span>
            </div>
            <div className="text-xs text-green-700 space-y-1">
              <div>• {Math.round((results.costTokensUSD / results.totalUSD) * 100)}% of costs are from LLM usage</div>
              <div>• {results.interactions.toLocaleString()} interactions per month</div>
              <div>• Cost per interaction: {formatCurrency(results.totalUSD / Math.max(1, results.interactions))}</div>
              <div>• Infrastructure: {Math.round(((results.vectorCostUSD + results.n8nCostUSD + results.appVpsUSD + results.monitoringUSD) / results.totalUSD) * 100)}% of total costs</div>
              <div>• {vectorProvider === "Pinecone" ? "Pinecone" : "Self-hosted"} vector DB saves {formatCurrency(PRICING.pineconeMonthly - PRICING.pgvectorMonthly)}/month</div>
            </div>
          </div>

          {/* Infrastructure Optimization Tips */}
          <div className="mt-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-200">
            <div className="flex items-center mb-2">
              <svg className="w-4 h-4 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <span className="text-sm font-semibold text-blue-800">Infrastructure Tips</span>
            </div>
            <div className="text-xs text-blue-700 space-y-1">
              {n8nMode === "Cloud" && (
                <div>• Switch to self-hosted n8n to save {formatCurrency(PRICING.n8nCloudMonthly - PRICING.n8nSelfHostVPS)}/month</div>
              )}
              {vectorProvider === "Pinecone" && (
                <div>• Consider pgvector for {formatCurrency(PRICING.pineconeMonthly)}/month savings</div>
              )}
              <div>• Monitor usage to optimize VPS sizing</div>
              <div>• Regular backups prevent data loss costs</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 text-sm text-gray-600 bg-white p-4 rounded shadow">
        <strong>Notes:</strong>
        <ul className="mt-2 list-disc ml-4">
          <li>Prices are conservative defaults (USD). You can edit them in code or expand the UI to allow editable unit prices.</li>
          <li>TTS minute estimate = chars / 750 (approx). Adjust if you want faster/slower speech.</li>
          <li>For precise math plotting, prefer Wolfram; for illustrative diagrams, prefer OpenAI images.</li>
        </ul>
      </div>
    </div>
  );
}
