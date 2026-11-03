import Brand from "./Brand";
import "../styles/Footer.css";

export default function Footer() {
  // Generated, so the year never goes stale
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="site-footer-top">
        <Brand size={22} />
      </div>

      <p className="site-footer-trust">
        Portiva is non-custodial: it never holds your funds or asks for your
        keys. Portfolio data is stored locally on your device.
      </p>

      <p className="site-footer-small">
        Prices by{" "}
        <a href="https://www.coingecko.com/" target="_blank" rel="noopener noreferrer">
          CoinGecko
        </a>{" "}
        · Not financial advice
      </p>

      <p className="site-footer-small">&copy; {year} Portiva. All rights reserved.</p>
    </footer>
  );
}