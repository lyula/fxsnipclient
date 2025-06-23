import { useEffect, useState } from "react";
import { AdvancedRealTimeChart } from "react-ts-tradingview-widgets";

export default function Markets() {
  // Detect browser theme (light/dark)
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    const match = window.matchMedia("(prefers-color-scheme: dark)");
    setTheme(match.matches ? "dark" : "light");
    const handler = (e) => setTheme(e.matches ? "dark" : "light");
    match.addEventListener("change", handler);
    return () => match.removeEventListener("change", handler);
  }, []);

  return (
    <section className="bg-gradient-to-b from-white via-blue-50 to-blue-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 min-h-screen flex flex-col items-center px-0 py-0">
      <div className="w-full flex flex-col items-center justify-center flex-1">
        <div className="w-full flex items-center justify-center flex-1">
          <div className="w-full max-w-7xl h-[calc(100vh-120px)] md:h-[calc(100vh-120px)] px-2 md:px-8 flex-1">
            <AdvancedRealTimeChart
              theme={theme}
              autosize
              symbol="OANDA:EURUSD"
              interval="60"
              locale="en"
              style="1"
              hide_side_toolbar={false}
              allow_symbol_change={true}
              container_id="tradingview_chart"
              width="100%"
              height="100%"
            />
          </div>
        </div>
        <div className="max-w-2xl mx-auto text-center mt-8 mb-4 text-gray-500 dark:text-gray-400 text-sm tracking-wide">
          <p>
            <span className="tracking-widest">Powered by</span>
            <span className="mx-2"></span>
            <a
              href="https://www.tradingview.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#1E3A8A] dark:text-[#a99d6b] font-semibold hover:underline tracking-widest"
            >
              TradingView
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}