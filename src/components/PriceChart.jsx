import { useMemo, useState } from "react";
import { usePriceHistory } from "../hooks/usePriceHistory";
import SegmentedControl from "./SegmentedControl";
import "../styles/PriceChart.css";

const RANGES = [
  { label: "1D", value: 1 },
  { label: "7D", value: 7 },
  { label: "30D", value: 30 },
  { label: "90D", value: 90 },
];

// The SVG's own coordinate system. CSS scales it to fit the card.
const W = 600;
const H = 220;
const PAD = 12;

function formatMoney(value, currency) {
  // Cheap coins need more decimals or they all show as $0.00
  const maxDigits = value >= 1 ? 2 : value >= 0.01 ? 4 : 8;
  return new Intl.NumberFormat(currency === "NGN" ? "en-NG" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: maxDigits,
  }).format(value);
}

function formatWhen(timestamp, days) {
  const date = new Date(timestamp);
  return days <= 7
    ? date.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

export default function PriceChart({ coins, currency }) {
  const [selectedId, setSelectedId] = useState(null);
  const [days, setDays] = useState(7);
  const [hoverIndex, setHoverIndex] = useState(null);

  const code = (currency || "USD").toUpperCase();

  // Derived, not stored: if the selected coin was removed (or nothing is
  // selected yet), fall back to the first holding. No effect needed.
  const activeId = coins.some((c) => c.id === selectedId) ? selectedId : coins[0]?.id;

  const { status, data, error, retry } = usePriceHistory(activeId, code.toLowerCase(), days);

  // Turn prices into SVG coordinates. Only recomputed when data changes.
  const geometry = useMemo(() => {
    if (data.length < 2) return null;
    const prices = data.map((d) => d.p);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const span = max - min || 1; // avoids divide-by-zero on a perfectly flat line
    const x = (i) => PAD + (i / (data.length - 1)) * (W - 2 * PAD);
    const y = (p) => H - PAD - ((p - min) / span) * (H - 2 * PAD);
    const points = data.map((d, i) => [x(i), y(d.p)]);
    const line = points
      .map(([px, py], i) => `${i === 0 ? "M" : "L"}${px.toFixed(1)} ${py.toFixed(1)}`)
      .join(" ");
    const lastX = points[points.length - 1][0].toFixed(1);
    const firstX = points[0][0].toFixed(1);
    const area = `${line} L${lastX} ${H - PAD} L${firstX} ${H - PAD} Z`;
    return { points, line, area, min, max };
  }, [data]);

  if (coins.length === 0) return null; // after all hooks, so hook order stays stable

  function handleMove(e) {
    if (!geometry) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((svgX - PAD) / (W - 2 * PAD)) * (data.length - 1));
    setHoverIndex(Math.min(data.length - 1, Math.max(0, i)));
  }

  const first = data[0];
  const last = data[data.length - 1];
  const shown = hoverIndex !== null && data[hoverIndex] ? data[hoverIndex] : last;
  const change = first && last && first.p ? ((last.p - first.p) / first.p) * 100 : null;
  const isUp = change !== null && change >= 0;
  const hoverPoint = hoverIndex !== null && geometry ? geometry.points[hoverIndex] : null;

  return (
    <section className="pc">
      <div className="pc-top">
        <div className="pc-coins">
          {coins.map((c) => (
            <button
              key={c.id}
              className="pc-pill"
              aria-pressed={c.id === activeId}
              onClick={() => setSelectedId(c.id)}
            >
              {(c.symbol || c.id).toUpperCase()}
            </button>
          ))}
        </div>
        <SegmentedControl
          label="Time range"
          options={RANGES}
          value={days}
          onChange={setDays}
        />
      </div>

      <div className="pc-headline">
        <span className="pc-price">{shown ? formatMoney(shown.p, code) : "—"}</span>
        {change !== null && (
          <span className={`pc-change ${isUp ? "up" : "down"}`}>
            {isUp ? "+" : ""}
            {change.toFixed(2)}% · {days === 1 ? "24h" : `${days}d`}
          </span>
        )}
      </div>
      <div className="pc-when">
        {hoverIndex !== null && shown ? formatWhen(shown.t, days) : "\u00A0"}
      </div>

      <div className="pc-body">
        {status === "loading" && <p className="pc-msg">Loading chart…</p>}

        {status === "error" && (
          <div className="pc-msg">
            <p>{error}</p>
            <button className="pc-pill" onClick={retry}>Retry</button>
          </div>
        )}

        {status === "ready" && !geometry && <p className="pc-msg">Not enough data for this range.</p>}

        {status === "ready" && geometry && (
          <svg
            className="pc-svg"
            viewBox={`0 0 ${W} ${H}`}
            onPointerMove={handleMove}
            onPointerLeave={() => setHoverIndex(null)}
            role="img"
            aria-label={`Price chart, last ${days} days`}
          >
            <g className="pc-reveal">
              <path d={geometry.area} className="pc-area" />
              <path d={geometry.line} className="pc-line" vectorEffect="non-scaling-stroke" />
            </g>
            {hoverPoint && (
              <>
                <line
                  className="pc-cursor"
                  x1={hoverPoint[0]}
                  x2={hoverPoint[0]}
                  y1={PAD}
                  y2={H - PAD}
                  vectorEffect="non-scaling-stroke"
                />
                <circle className="pc-dot" cx={hoverPoint[0]} cy={hoverPoint[1]} r="6" />
              </>
            )}
          </svg>
        )}
      </div>

      {status === "ready" && geometry && (
        <div className="pc-meta">
          <span>Low {formatMoney(geometry.min, code)}</span>
          <span>High {formatMoney(geometry.max, code)}</span>
        </div>
      )}
    </section>
  );
}