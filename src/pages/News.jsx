import { useState } from "react";
import Footer from "../components/layout/Footer"; // Import Footer

const mockNews = [
	{
		id: 1,
		title: "USD Surges After Fed Rate Decision",
		summary:
			"The US dollar rallied sharply against major currencies following the Federal Reserve's latest interest rate announcement. Analysts expect continued volatility.",
		source: "Reuters",
		time: "5 mins ago",
		impact: "High",
		currency: "USD",
		flag: "🇺🇸",
	},
	{
		id: 2,
		title: "EUR/USD Hits 3-Month High",
		summary:
			"The euro gained ground as positive economic data from the Eurozone boosted investor confidence. Traders eye ECB comments for further direction.",
		source: "Bloomberg",
		time: "20 mins ago",
		impact: "Medium",
		currency: "EUR",
		flag: "🇪🇺",
	},
	{
		id: 3,
		title: "GBP Weakens Amid Political Uncertainty",
		summary:
			"The British pound slipped as political uncertainty in the UK weighed on market sentiment. Analysts warn of further downside if instability persists.",
		source: "Financial Times",
		time: "1 hour ago",
		impact: "High",
		currency: "GBP",
		flag: "🇬🇧",
	},
	{
		id: 4,
		title: "Gold Prices Steady as Traders Await US Data",
		summary:
			"Gold prices held steady in early trading as forex traders await key US economic data releases later today.",
		source: "CNBC",
		time: "2 hours ago",
		impact: "Low",
		currency: "XAU",
		flag: "🥇",
	},
];

const impactColors = {
	High: "bg-red-100 text-red-700 border-red-400",
	Medium: "bg-yellow-100 text-yellow-700 border-yellow-400",
	Low: "bg-green-100 text-green-700 border-green-400",
};

export default function News() {
	const [showAlert, setShowAlert] = useState(true);

	return (
		<>
			<section className="bg-gradient-to-b from-white via-blue-50 to-blue-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 min-h-[80vh] flex flex-col items-center px-2 py-8">
				<div
					className="max-w-4xl w-full mx-auto text-center mb-6"
					data-aos="fade-down"
				>
					<h1 className="text-4xl md:text-5xl font-extrabold text-[#1E3A8A] dark:text-white mb-2 font-inter">
						Forex News
					</h1>
					<p className="text-lg text-gray-700 dark:text-gray-300 mb-4">
						Stay updated with the latest forex market headlines and insights.
					</p>
					{showAlert && (
						<div className="mb-6 flex items-center justify-center gap-3 bg-[#a99d6b] text-white px-4 py-3 rounded shadow font-semibold text-base">
							<svg
								className="w-5 h-5 text-white"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								viewBox="0 0 24 24"
							>
								<path
									d="M12 9v2m0 4h.01M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z"
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
							</svg>
							Live news support coming soon!
							<button
								onClick={() => setShowAlert(false)}
								className="ml-3 text-white hover:text-blue-100 font-bold"
								aria-label="Close"
							>
								×
							</button>
						</div>
					)}
				</div>

				<div className="w-full max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow border border-blue-100 dark:border-gray-700 overflow-x-auto">
					<table className="min-w-full divide-y divide-blue-100 dark:divide-gray-700">
						<thead>
							<tr className="bg-[#f5f7fa] dark:bg-gray-900">
								<th className="px-4 py-3 text-left text-xs font-semibold text-[#1E3A8A] dark:text-[#a99d6b] uppercase tracking-wider">
									Time
								</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-[#1E3A8A] dark:text-[#a99d6b] uppercase tracking-wider">
									Currency
								</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-[#1E3A8A] dark:text-[#a99d6b] uppercase tracking-wider">
									Impact
								</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-[#1E3A8A] dark:text-[#a99d6b] uppercase tracking-wider">
									Headline
								</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-[#1E3A8A] dark:text-[#a99d6b] uppercase tracking-wider">
									Source
								</th>
							</tr>
						</thead>
						<tbody className="bg-white dark:bg-gray-800">
							{mockNews.map((news) => (
								<tr
									key={news.id}
									className="hover:bg-blue-50 dark:hover:bg-gray-700 transition"
								>
									<td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
										{news.time}
									</td>
									<td className="px-4 py-4 whitespace-nowrap text-base font-bold flex items-center gap-2">
										<span className="text-xl">{news.flag}</span>
										<span className="text-[#1E3A8A] dark:text-[#a99d6b]">
											{news.currency}
										</span>
									</td>
									<td className="px-4 py-4 whitespace-nowrap">
										<span
											className={`inline-block px-3 py-1 rounded-full border text-xs font-semibold ${impactColors[news.impact]}`}
										>
											{news.impact}
										</span>
									</td>
									<td className="px-4 py-4 whitespace-normal min-w-[180px]">
										<div className="font-semibold text-[#1E3A8A] dark:text-[#a99d6b]">
											{news.title}
										</div>
										<div className="text-xs text-gray-500 dark:text-gray-400">
											{news.summary}
										</div>
									</td>
									<td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
										{news.source}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</section>
			<Footer /> {/* Add Footer component here */}
		</>
	);
}