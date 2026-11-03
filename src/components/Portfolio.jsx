import { useEffect, useRef } from "react";
import { usePortfolio } from "../hooks/usePortfolio";
import { useTheme } from "../hooks/useTheme";
import { useAnimatedNumber } from "../hooks/useAnimatedNumber";
import AddHoldingForm from "./AddHoldingForm";
import HoldingRow from "./HoldingRow";
import PriceChart from "./PriceChart";
import ThemeToggle from "./ThemeToggle";
import Header from "./Header";
import Footer from "./Footer";
import { formatMoney } from "../utils/format";
import "../styles/Portfolio.css";
import "../styles/theme.css";
import "../styles/motion.css";

// Keyed to coinId, not array position — so a coin's color stays
// the same regardless of what order holdings were added in.
// The five original coins keep their hand-picked colors.
const COIN_COLORS = {
  bitcoin: "#0F0D0B",
  ethereum: "#C98A4B",
  solana: "#4E7A5C",
  ripple: "#7A8CA3",
  tether: "#71706B",
};

// Any other coin takes the next unused color in this list, in the order the
// coins appear — so two different coins never share a color (until the list
// runs out). The five coins above never change; extras can shift if you
// remove an earlier one.
const EXTRA_COLORS = [
  "#8B6F8E",
  "#B36B4F",
  "#5E8C8A",
  "#A89B5C",
  "#6B7A99",
  "#9A6B7A",
  "#7F9A6B",
  "#8C7A66",
];

// The app is USD only now.
const DISPLAY_CURRENCY = "usd";

function Portfolio() {
  const {
    holdings,
    totalValue,
    totalProfitLoss,
    totalProfitLossPct,
    currency,
    setCurrency,
    loading,
    error,
    addHolding,
    removeHolding,
    updateHolding,
  } = usePortfolio();

  const { theme, toggle: toggleTheme } = useTheme();

  const listRef = useRef(null);
  const removingRef = useRef(new Set());

  // If an older session saved NGN, switch back to USD. There's no toggle
  // anymore, so without this the app could get stuck showing NGN.
  useEffect(() => {
    if (currency !== DISPLAY_CURRENCY) setCurrency(DISPLAY_CURRENCY);
  }, [currency, setCurrency]);

  // Numbers glide to their new value instead of snapping
  const animatedTotal = useAnimatedNumber(totalValue);
  const animatedProfitLoss = useAnimatedNumber(totalProfitLoss);
  const animatedProfitLossPct = useAnimatedNumber(totalProfitLossPct);

  const colorById = {};
  let extraIndex = 0;
  for (const h of holdings) {
    if (colorById[h.coinId]) continue;
    colorById[h.coinId] =
      COIN_COLORS[h.coinId] ?? EXTRA_COLORS[extraIndex++ % EXTRA_COLORS.length];
  }

  // One entry per coin for the chart. A Map keyed by coinId drops duplicates
  // if the same coin was added as more than one holding.
  const chartCoins = [
    ...new Map(
      holdings.map((h) => [h.coinId, { id: h.coinId, symbol: h.symbol }])
    ).values(),
  ];

  // Slide a row out, then actually remove it. If anything about the row
  // can't be found, or the user prefers reduced motion, remove instantly.
  function handleRemove(arg) {
    const id = arg !== null && typeof arg === "object" ? arg.id : arg;
    if (removingRef.current.has(id)) return; // already on its way out

    const index = holdings.findIndex((h) => h.id === id);
    const el = index === -1 ? null : listRef.current?.children[index];
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (!el || reduceMotion) {
      removeHolding(arg);
      return;
    }

    removingRef.current.add(id);
    const finish = () => {
      removingRef.current.delete(id);
      removeHolding(arg);
    };

    const height = el.getBoundingClientRect().height;
    el.style.boxSizing = "border-box";
    el.style.overflow = "hidden";

    el.animate(
      [
        { height: `${height}px`, opacity: 1, transform: "translateX(0)" },
        {
          height: "0px",
          opacity: 0,
          transform: "translateX(32px)",
          marginTop: "0px",
          marginBottom: "0px",
          paddingTop: "0px",
          paddingBottom: "0px",
        },
      ],
      { duration: 300, easing: "cubic-bezier(0.32, 0.72, 0, 1)", fill: "forwards" }
    ).finished.then(finish, finish);
  }

  return (
    <div className="portfolio-page">
      <Header>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </Header>

      <div className="portfolio-header">
        <h1>Your Portfolio</h1>
      </div>

      <div className="total-value">
        <p className="total-value-label">Total value</p>
        <p className="total-value-amount">{formatMoney(animatedTotal, currency)}</p>

        {totalProfitLoss !== null && (
          <p
            className={`total-value-pl ${
              totalProfitLoss >= 0 ? "holding-up" : "holding-down"
            }`}
          >
            {formatMoney(animatedProfitLoss, currency, { signed: true })}
            {Number.isFinite(animatedProfitLossPct) &&
              ` (${animatedProfitLossPct >= 0 ? "+" : ""}${animatedProfitLossPct.toFixed(1)}%)`}{" "}
            overall
          </p>
        )}

        {holdings.length > 0 && (
          <div className="allocation-bar-wrap">
            <div className="allocation-bar">
              {holdings.map((h) => (
                <div
                  key={h.id}
                  style={{
                    width: `${h.allocationPct}%`,
                    background: colorById[h.coinId],
                  }}
                />
              ))}
            </div>
            <div className="allocation-legend">
              {holdings.map((h) => (
                <span key={h.id} className="allocation-legend-item">
                  <span
                    className="allocation-swatch"
                    style={{
                      background: colorById[h.coinId],
                    }}
                  />
                  {h.name} {h.allocationPct.toFixed(0)}%
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <PriceChart coins={chartCoins} currency={currency} />

      <AddHoldingForm onAdd={addHolding} currency={currency} />

      {loading && <p className="loading-text">Loading prices...</p>}
      {error && <p className="page-error">{error}</p>}

      <ul className="holding-list" ref={listRef}>
        {holdings.map((h) => (
          <HoldingRow
            key={h.id}
            holding={h}
            currency={currency}
            onRemove={handleRemove}
            onUpdate={updateHolding}
          />
        ))}
      </ul>

      <Footer />
    </div>
  );
}

export default Portfolio;