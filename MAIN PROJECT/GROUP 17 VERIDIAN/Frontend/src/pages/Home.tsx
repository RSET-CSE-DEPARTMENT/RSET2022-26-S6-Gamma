import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Search, RefreshCw, Plus } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
// @ts-ignore
import { db } from '../firebase';

// --- Interfaces ---
interface StockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  exchange?: string;
  country?: string;
}


interface NewsItem {
  title: string;
  source: string;
  time: string;
  image: string;
  url: string;
  description?: string;
  content?: string;
}

interface ChartDataPoint {
  time: string;
  value: number;
}

interface PortfolioData {
  currentValue: number;
  investedValue: number;
  previousValue: number;
  change: number;
  changePercent: number;
  holdings: Array<{
    id: string;
    symbol: string;
    shares: number;
    buyPrice: number;
    name?: string;
    currentPrice?: number;
    totalValue?: number;
    profitLoss?: number;
    profitLossPercent?: number;
  }>;
}

interface HomeProps {
  user: any;
  portfolioData: PortfolioData;
  chartData: ChartDataPoint[];
  topGainers: StockData[];
  topLosers: StockData[];
  news: NewsItem[];
  activeTab: 'gainers' | 'losers';
  setActiveTab: (tab: 'gainers' | 'losers') => void;
  selectedNews: NewsItem | null;
  setSelectedNews: (news: NewsItem | null) => void;
  apiError: string | null;
  niftyData: StockData | null;
}

const Home: React.FC<HomeProps> = ({
  user,
  portfolioData,
  chartData,
  topGainers,
  topLosers,
  news,
  activeTab,
  setActiveTab,
  selectedNews,
  setSelectedNews,
  apiError,
  niftyData
}) => {
  const [mainTab, setMainTab] = useState<'market' | 'portfolio'>('market');
  const [isAddStockOpen, setIsAddStockOpen] = useState(false);
  const [stockForm, setStockForm] = useState({ symbol: '', quantity: '', buyPrice: '', date: '' });
  const [isAddingStock, setIsAddingStock] = useState(false);

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return alert("You must be logged in");
    if (!stockForm.symbol || !stockForm.quantity || !stockForm.buyPrice) return;

    try {
      setIsAddingStock(true);
      await addDoc(collection(db, 'portfolios'), {
        uid: user.uid,
        symbol: stockForm.symbol.toUpperCase(),
        quantity: Number(stockForm.quantity),
        buyPrice: Number(stockForm.buyPrice),
        createdAt: serverTimestamp()
      });
      setIsAddStockOpen(false);
      setStockForm({ symbol: '', quantity: '', buyPrice: '', date: '' });
    } catch (err) {
      console.error("Error adding stock:", err);
      alert("Failed to add stock.");
    } finally {
      setIsAddingStock(false);
    }
  };
  const StockItem: React.FC<{ stock: StockData }> = ({ stock }) => (
    <div className="flex justify-between items-center p-4 border-b border-slate-100 transition-colors duration-200 hover:bg-slate-50 last:border-b-0">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm text-white sm:w-10 sm:h-10 sm:text-xs ${stock.change >= 0 ? 'bg-gradient-to-br from-emerald-500 to-emerald-600' : 'bg-gradient-to-br from-red-500 to-red-600'}`}>
          {stock.symbol.substring(0, 2)}
        </div>
        <div className="flex flex-col gap-1">
          <div className="font-bold text-base text-slate-900 sm:text-sm">{stock.symbol}</div>
          <div className="text-xs text-slate-500 sm:text-[0.7rem]">{stock.name}</div>
        </div>
      </div>
      <div className="text-right">
        <div className="font-bold text-base text-slate-900 mb-1 sm:text-sm">
          ₹{stock.price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
        </div>
        <div className={`text-sm font-semibold sm:text-xs ${stock.change >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
          {stock.change >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="mb-6">
        <div className="text-slate-500 text-sm mb-1">
          {user?.displayName ? `Hello, ${user.displayName.split(' ')[0]}` : 'Hello, Investor'}
        </div>
        <h1 className="text-slate-900 text-2xl sm:text-3xl font-bold mb-2">Dashboard</h1>
        {apiError && (
          <div className="bg-red-100 text-red-800 px-4 py-3 rounded-lg text-sm text-center border border-red-300 animate-[fadeIn_0.3s_ease] mt-2">
            ⚠️ {apiError}
            <button className="flex items-center gap-2 mx-auto mt-2 bg-white px-3 py-1 rounded-md text-red-800 font-medium" onClick={() => window.location.reload()}>
              <RefreshCw size={12} /> Retry
            </button>
          </div>
        )}
      </div>

      <div className="mb-6 border-b border-slate-200">
        <div className="flex gap-6">
          <button
            className={`pb-3 text-sm font-semibold transition-colors relative border-none bg-transparent cursor-pointer ${mainTab === 'market' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
            onClick={() => setMainTab('market')}
          >
            Overall Market
            {mainTab === 'market' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full"></div>}
          </button>
          <button
            className={`pb-3 text-sm font-semibold transition-colors relative border-none bg-transparent cursor-pointer ${mainTab === 'portfolio' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
            onClick={() => setMainTab('portfolio')}
          >
            My Portfolio
            {mainTab === 'portfolio' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full"></div>}
          </button>
        </div>
      </div>

      {mainTab === 'market' && (
        <>
          <div className="mb-6">
            <div className="relative flex items-center bg-white rounded-xl border border-slate-200 transition-all duration-200 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10">
              <Search className="absolute left-4 text-slate-500" size={20} />
              <input type="text" placeholder="Search stocks (e.g. RELIANCE)..." className="w-full py-3.5 pr-4 pl-12 border-none rounded-xl text-base bg-transparent text-slate-800 placeholder:text-slate-400 focus:outline-none transition-all duration-200" />
            </div>
          </div>

          <div className="mb-6">
            <div className="bg-gradient-to-br from-blue-900 to-blue-800 rounded-2xl p-6 text-white shadow-[0_10px_25px_-5px_rgba(30,58,138,0.15)]">
              <div className="text-sm text-white/90 mb-2">NIFTY 50</div>
              {niftyData ? (
                <>
                  <div className="text-4xl sm:text-[2rem] font-bold mb-2">
                    ₹{niftyData.price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </div>
                  <div className={`text-sm mb-6 font-medium ${niftyData.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {niftyData.change >= 0 ? '+' : ''}₹{Math.abs(niftyData.change).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    ({niftyData.change >= 0 ? '+' : ''}{niftyData.changePercent.toFixed(2)}%) Today
                  </div>
                </>
              ) : (
                <div className="text-4xl sm:text-[2rem] font-bold mb-2">Loading...</div>
              )}

              {chartData.length > 0 && (
                <div className="h-[180px] mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <XAxis dataKey="time" stroke="#fff" strokeOpacity={0.5} tick={{ fill: '#fff', fontSize: 10 }} tickLine={false} minTickGap={30} />
                      <YAxis hide domain={['auto', 'auto']} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1e40af', border: 'none', borderRadius: '8px', color: '#fff' }}
                        labelStyle={{ color: '#fff' }}
                        formatter={(value: any) => [`₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`, 'Price']}
                      />
                      <Line type="monotone" dataKey="value" stroke="#fff" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          <div className="mb-4">
            <div className="flex gap-2 bg-slate-50 p-2 rounded-xl">
              <button onClick={() => setActiveTab('gainers')} className={`flex-1 flex items-center justify-center gap-2 p-3 border-none bg-transparent rounded-lg text-sm font-semibold cursor-pointer transition-all duration-200 ${activeTab === 'gainers' ? 'bg-white text-blue-800 shadow-sm' : 'text-slate-500 hover:bg-slate-200 hover:text-slate-700'}`}>
                <TrendingUp size={16} />
                Top Gainers
              </button>
              <button onClick={() => setActiveTab('losers')} className={`flex-1 flex items-center justify-center gap-2 p-3 border-none bg-transparent rounded-lg text-sm font-semibold cursor-pointer transition-all duration-200 ${activeTab === 'losers' ? 'bg-white text-blue-800 shadow-sm' : 'text-slate-500 hover:bg-slate-200 hover:text-slate-700'}`}>
                <TrendingDown size={16} />
                Top Losers
              </button>
            </div>
          </div>

          <div className="mb-6">
            <div className="bg-white rounded-2xl overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.05)] border border-slate-200">
              {activeTab === 'gainers' && topGainers.length > 0 ? (
                topGainers.map((stock) => <StockItem key={stock.symbol} stock={stock} />)
              ) : activeTab === 'losers' && topLosers.length > 0 ? (
                topLosers.map((stock) => <StockItem key={stock.symbol} stock={stock} />)
              ) : (
                <div className="text-center p-8 text-slate-500 text-sm">
                  {apiError ? 'Check Backend Connection' : 'No dynamic market data available'}
                </div>
              )}
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-slate-900 text-xl font-bold mb-4">Market News</h2>
            {news.map((item, index) => (
              <div key={index} onClick={() => setSelectedNews(item)} className="flex gap-4 p-4 rounded-xl bg-white shadow-sm transition-all duration-200 cursor-pointer mb-4 border border-slate-200 hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300">
                <img src={item.image} alt={item.title} className="w-[100px] h-[100px] rounded-lg object-cover shrink-0 border border-slate-200 sm:w-20 sm:h-20" />
                <div className="flex-1 flex flex-col justify-center gap-2">
                  <h3 className="text-[0.9rem] font-semibold text-slate-900 leading-relaxed line-clamp-3">{item.title}</h3>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>{item.source}</span>
                    <span>•</span>
                    <span>{item.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {mainTab === 'portfolio' && (
        <>
          <div className="bg-gradient-to-br from-indigo-900 to-indigo-800 rounded-2xl p-6 text-white shadow-[0_10px_25px_-5px_rgba(49,46,129,0.15)] mb-6 relative">
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="text-sm text-white/80 mb-1">Total Portfolio Value</div>
                <div className="text-3xl sm:text-4xl font-bold">
                  ₹{portfolioData.currentValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </div>
              </div>
              <button
                onClick={() => setIsAddStockOpen(true)}
                className="bg-white/10 hover:bg-white/20 text-white border-none p-2 rounded-xl flex items-center justify-center transition-colors cursor-pointer"
              >
                <Plus size={20} /> <span className="ml-1 pr-1 font-semibold text-sm hidden sm:inline">Add Stock</span>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-white/70 mb-1">Total Invested</div>
                <div className="font-semibold text-lg">₹{(portfolioData.investedValue || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
              </div>
              <div>
                <div className="text-xs text-white/70 mb-1">Total Returns</div>
                <div className={`font-semibold text-lg flex items-center gap-1 ${portfolioData.currentValue >= (portfolioData.investedValue || 0) ? 'text-emerald-400' : 'text-red-400'}`}>
                  {portfolioData.currentValue >= (portfolioData.investedValue || 0) ? '+' : ''}
                  ₹{Math.abs(portfolioData.currentValue - (portfolioData.investedValue || 0)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  <span className="text-sm ml-1">
                    ({(portfolioData.investedValue || 0) > 0 ? ((portfolioData.currentValue - portfolioData.investedValue) / portfolioData.investedValue * 100).toFixed(2) : '0.00'}%)
                  </span>
                </div>
              </div>
            </div>
          </div>

          <h2 className="text-slate-900 text-xl font-bold mb-4">Your Holdings</h2>
          <div className="bg-white rounded-2xl overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.05)] border border-slate-200 mb-6">
            {portfolioData.holdings.length > 0 ? (
              portfolioData.holdings.map((stock) => (
                <div key={stock.id} className="flex justify-between items-center p-4 border-b border-slate-100 transition-colors duration-200 hover:bg-slate-50 last:border-b-0">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm text-white sm:w-10 sm:h-10 sm:text-xs ${(stock.profitLoss || 0) >= 0 ? 'bg-gradient-to-br from-emerald-500 to-emerald-600' : 'bg-gradient-to-br from-red-500 to-red-600'}`}>
                      {stock.symbol.substring(0, 2)}
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="font-bold text-base text-slate-900 sm:text-sm">{stock.symbol}</div>
                      <div className="text-xs text-slate-500 sm:text-[0.7rem]">{stock.shares} Shares • Avg ₹{stock.buyPrice.toLocaleString('en-IN')}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-base text-slate-900 mb-1 sm:text-sm">
                      ₹{(stock.currentPrice || stock.buyPrice).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </div>
                    <div className={`text-sm font-semibold sm:text-xs ${(stock.profitLoss || 0) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {(stock.profitLoss || 0) >= 0 ? '+' : ''}₹{Math.abs(stock.profitLoss || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })} ({(stock.profitLossPercent || 0).toFixed(2)}%)
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center p-8 text-slate-500 text-sm">
                You haven't added any stocks to your portfolio yet.
              </div>
            )}
          </div>
        </>
      )}

      {/* News Modal */}
      {selectedNews && (
        <div className="fixed inset-0 bg-black/50 z-[1000] flex items-start justify-center overflow-y-auto p-5 animate-[fadeIn_0.2s_ease]" onClick={() => setSelectedNews(null)}>
          <div className="bg-white rounded-2xl max-w-[700px] w-full m-auto relative overflow-hidden shadow-2xl border border-slate-200 animate-[slideUp_0.3s_ease]" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white p-4 flex justify-end z-10 border-b border-gray-200">
              <button className="bg-slate-50 border-none w-9 h-9 rounded-full text-xl cursor-pointer flex items-center justify-center transition-all duration-200 text-slate-500 hover:bg-slate-200 hover:scale-110 hover:text-slate-800" onClick={() => setSelectedNews(null)}>
                ✕
              </button>
            </div>
            <img src={selectedNews.image} alt={selectedNews.title} className="w-full h-[250px] object-cover border-b border-slate-200" />
            <div className="p-6">
              <div className="flex items-center gap-2 text-slate-500 text-sm mb-4">
                <span className="font-semibold text-blue-500">{selectedNews.source}</span>
                <span>•</span>
                <span>{selectedNews.time}</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-4 leading-tight">{selectedNews.title}</h1>
              {selectedNews.description && (
                <p className="text-lg text-slate-600 mb-6 leading-relaxed font-medium">{selectedNews.description}</p>
              )}
              {selectedNews.content && (
                <div className="text-base text-slate-700 leading-relaxed space-y-4">
                  {selectedNews.content.split('\n').map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
              )}
              {selectedNews.url !== '#' && (
                <a
                  href={selectedNews.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-6 text-blue-500 font-semibold no-underline py-3 px-6 border-2 border-blue-500 rounded-lg transition-all duration-200 hover:bg-blue-500 hover:text-white"
                >
                  Read full article →
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Stock Modal */}
      {isAddStockOpen && (
        <div className="fixed inset-0 bg-black/50 z-[1000] flex items-center justify-center overflow-y-auto p-5 animate-[fadeIn_0.2s_ease]" onClick={() => setIsAddStockOpen(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full m-auto relative overflow-hidden shadow-2xl border border-slate-200 animate-[slideUp_0.3s_ease]" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900 m-0">Add Stock</h2>
              <button
                className="bg-slate-50 border-none w-8 h-8 rounded-full flex items-center justify-center text-slate-500 cursor-pointer hover:bg-slate-200 transition-colors"
                onClick={() => setIsAddStockOpen(false)}
              >✕</button>
            </div>
            <form onSubmit={handleAddStock} className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">Stock Symbol (e.g., RELIANCE.NS)</label>
                <input
                  type="text"
                  value={stockForm.symbol}
                  onChange={(e) => setStockForm({ ...stockForm, symbol: e.target.value.toUpperCase() })}
                  className="w-full p-3 border border-slate-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all uppercase"
                  placeholder="INFY.NS"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">Quantity</label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={stockForm.quantity}
                  onChange={(e) => setStockForm({ ...stockForm, quantity: e.target.value })}
                  className="w-full p-3 border border-slate-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  placeholder="10"
                  required
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-1">Buy Price (₹)</label>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  value={stockForm.buyPrice}
                  onChange={(e) => setStockForm({ ...stockForm, buyPrice: e.target.value })}
                  className="w-full p-3 border border-slate-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  placeholder="1500.50"
                  required
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddStockOpen(false)}
                  className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors cursor-pointer border-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingStock}
                  className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors cursor-pointer disabled:opacity-70 border-none flex items-center justify-center gap-2"
                >
                  {isAddingStock ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : "Save Holding"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Home;
