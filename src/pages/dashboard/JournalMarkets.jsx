import React from "react";
import { useNavigate } from "react-router-dom";

function JournalMarkets({ onBack }) {
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const chartRef = React.useRef(null);
  const navigate = useNavigate();

  const handleFullscreen = () => {
    if (chartRef.current) {
      if (!document.fullscreenElement) {
        chartRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  return (
    <div className={`w-full min-h-screen flex flex-col ${isFullscreen ? 'fixed inset-0 z-50 bg-black' : ''}`} ref={chartRef}>
      <div
        className="flex-1 flex flex-col rounded-lg overflow-hidden shadow-lg border border-gray-200 dark:border-gray-700 w-full h-full relative"
        style={{ maxHeight: 'calc(100vh - 32px)' }}
      >
        <style>{`
          @media (min-width: 640px) {
            .markets-widget-desktop {
              max-height: calc(75vh - 32px) !important;
            }
          }
        `}</style>
        {/* Desktop: buttons at top right; Mobile: buttons float at bottom */}
        <div className="hidden sm:flex flex-row-reverse gap-2 items-center absolute top-2 right-2 z-10 pb-2 sm:pb-0">
          <button
            onClick={handleFullscreen}
            className="bg-gray-800 text-white px-3 py-1 rounded shadow hover:bg-gray-700 focus:outline-none w-fit"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          </button>
          <button
            onClick={() => navigate('/dashboard/journal')}
            className="bg-gray-800 text-white px-3 py-1 rounded shadow hover:bg-gray-700 focus:outline-none w-fit"
            title="Back to Journals"
          >
            Back to Journals
          </button>
        </div>
        <div className="flex sm:hidden flex-row-reverse gap-4 items-center w-full justify-end pb-2 z-10">
          <span
            onClick={() => navigate('/dashboard/journal')}
            className="text-2xl text-gray-800 dark:text-gray-100 cursor-pointer"
            title="Back to Journals"
            style={{ display: 'inline-flex', alignItems: 'center' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-7 h-7">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </span>
          <span
            onClick={handleFullscreen}
            className="text-2xl text-gray-800 dark:text-gray-100 cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            style={{ display: 'inline-flex', alignItems: 'center' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-7 h-7">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 12h16M12 4v16" />
            </svg>
          </span>
        </div>
        <iframe
          title="TradingView Advanced Chart"
          src="https://s.tradingview.com/widgetembed/?frameElementId=tradingview_advanced_12345&symbol=FX:EURUSD&interval=60&theme=dark&style=1&toolbarbg=f1f3f6&studies=%5B%5D&hideideas=0&withdateranges=1&saveimage=1&details=1&hotlist=1&calendar=1&widgetType=advanced_chart"
          width="100%"
          height="100%"
          allowtransparency="true"
          scrolling="no"
          allowFullScreen
          className="w-full flex-1"
          style={{ minHeight: 0, border: 'none', height: '100%' }}
        ></iframe>
      </div>
    </div>
  );
}

export default JournalMarkets;

