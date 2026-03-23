import React, { useState, useEffect } from 'react';
import { Home as HomeIcon, Bot, User } from 'lucide-react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
// @ts-ignore
import { auth, db } from '../firebase';
import Home from './Home';
import Chatbot from './Chatbot';
import Profile from './Profile';

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

export interface FirestorePortfolioItem {
  id: string; // Document ID
  symbol: string;
  name?: string;
  quantity: number;
  buyPrice: number;
  createdAt: any;
}

export interface PortfolioData {
  currentValue: number;
  investedValue: number; // Added for Summary
  previousValue: number;
  change: number;
  changePercent: number;
  holdings: Array<{
    id: string; // Map to doc ID
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

// --- API KEYS ---
// GNews Key (Keep as is)
// const GNEWS_KEY = '3fdcb86666e1eeb08c7611a418bc3d9e';

const HomePage: React.FC = () => {
  const [user, setUser] = useState<FirebaseUser | null>(null);

  // INITIAL STATE: Empty Portfolio
  const [portfolioData, setPortfolioData] = useState<PortfolioData>({
    currentValue: 0,
    investedValue: 0,
    previousValue: 0,
    change: 0,
    changePercent: 0,
    holdings: []
  });

  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [niftyData, setNiftyData] = useState<StockData | null>(null);
  const [topGainers, setTopGainers] = useState<StockData[]>([]);
  const [topLosers, setTopLosers] = useState<StockData[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'gainers' | 'losers'>('gainers');
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [activeScreen, setActiveScreen] = useState<'home' | 'chat' | 'profile'>('home');

  useEffect(() => {
    initializeData();

    // Auth & Firestore Listener
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const q = query(collection(db, 'portfolios'), where('uid', '==', currentUser.uid));
        const unsubscribeDb = onSnapshot(q, (snapshot) => {
          const items: FirestorePortfolioItem[] = [];
          snapshot.forEach((doc) => {
            items.push({ id: doc.id, ...doc.data() } as FirestorePortfolioItem);
          });
          processPortfolioItems(items);
        });

        return () => unsubscribeDb();
      } else {
        setPortfolioData({
          currentValue: 0,
          investedValue: 0,
          previousValue: 0,
          change: 0,
          changePercent: 0,
          holdings: []
        });
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const initializeData = async () => {
    setLoading(true);
    setApiError(null);
    try {
      await Promise.all([
        fetchMarketData(),
        fetchNews()
      ]);
    } catch (error) {
      console.error("Init failed", error);
      setApiError("Failed to fetch live data. Using cached/demo data.");
    } finally {
      setLoading(false);
    }
  };

  // Helper to fetch data from Yahoo Finance via CORS Proxy
  const fetchYahooData = async (symbol: string) => {
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/stock/${symbol}`
      );

      const data = await response.json();

      const result = data?.chart?.result?.[0];
      if (!result) return null;

      let chartPoints: ChartDataPoint[] = [];

      if (result.timestamp && result.indicators?.quote?.[0]?.close) {
        chartPoints = result.timestamp
          .map((time: number, index: number) => {
            const val = result.indicators.quote[0].close[index];
            if (!val) return null;

            const date = new Date(time * 1000);
            return {
              time: date.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              }),
              value: val
            };
          })
          .filter(Boolean);
      }

      return {
        price: result.meta.regularMarketPrice,
        previousClose: result.meta.chartPreviousClose,
        change:
          result.meta.regularMarketPrice -
          result.meta.chartPreviousClose,
        changePercent:
          ((result.meta.regularMarketPrice -
            result.meta.chartPreviousClose) /
            result.meta.chartPreviousClose) *
          100,
        chartData: chartPoints
      };
    } catch (error) {
      console.warn(`Failed to fetch ${symbol}`, error);
      return null;
    }
  };

  // --- 1. Fetch Portfolio Data (Yahoo Finance + Firestore) ---
  const processPortfolioItems = async (items: FirestorePortfolioItem[]) => {
    try {
      let totalValue = 0;
      let previousTotalValue = 0;
      let totalInvested = 0;

      const updatedHoldings = await Promise.all(items.map(async (item) => {
        const data = await fetchYahooData(item.symbol);

        const currentPrice = data?.price || item.buyPrice;
        const previousClose = data?.previousClose || item.buyPrice;
        const itemValue = currentPrice * item.quantity;
        const itemInvested = item.buyPrice * item.quantity;

        totalValue += itemValue;
        previousTotalValue += previousClose * item.quantity;
        totalInvested += itemInvested;

        const profitLoss = itemValue - itemInvested;
        const profitLossPercent = itemInvested > 0 ? (profitLoss / itemInvested) * 100 : 0;

        return {
          id: item.id,
          symbol: item.symbol,
          name: item.name || item.symbol,
          shares: item.quantity,
          buyPrice: item.buyPrice,
          currentPrice: currentPrice,
          totalValue: itemValue,
          profitLoss: profitLoss,
          profitLossPercent: profitLossPercent
        };
      }));

      const change = totalValue - previousTotalValue;
      const changePercent = previousTotalValue > 0 ? (change / previousTotalValue) * 100 : 0;

      const updatedPortfolio: PortfolioData = {
        currentValue: totalValue,
        investedValue: totalInvested,
        previousValue: previousTotalValue,
        change,
        changePercent,
        holdings: updatedHoldings
      };

      setPortfolioData(updatedPortfolio);

    } catch (err) {
      console.error('Portfolio update failed:', err);
    }
  };

  // --- 2. Fetch Dynamic Market Data (Yahoo Finance) ---
  const fetchMarketData = async () => {
    // 1. Fetch Nifty 50 Data
    const nifty = await fetchYahooData('%5ENSEI');
    if (nifty) {
      setNiftyData({
        symbol: 'NIFTY 50',
        name: 'Nifty 50',
        price: nifty.price,
        change: nifty.change,
        changePercent: nifty.changePercent
      });
      if (nifty.chartData && nifty.chartData.length > 0) {
        setChartData(nifty.chartData);
      }
    }

    // 2. Fetch Watchlist
    const popularStocks = [
      { symbol: 'RELIANCE.NS', name: 'Reliance' },
      { symbol: 'TCS.NS', name: 'TCS' },
      { symbol: 'HDFCBANK.NS', name: 'HDFC Bank' },
      { symbol: 'INFY.NS', name: 'Infosys' },
      { symbol: 'ICICIBANK.NS', name: 'ICICI Bank' },
      { symbol: 'SBIN.NS', name: 'SBI' },
      { symbol: 'BHARTIARTL.NS', name: 'Bharti Airtel' },
      { symbol: 'ITC.NS', name: 'ITC' },
      { symbol: 'TATAMOTORS.NS', name: 'Tata Motors' },
      { symbol: 'LT.NS', name: 'L&T' }
    ];

    try {
      const stockPromises = popularStocks.map(async (stock) => {
        const data = await fetchYahooData(stock.symbol);
        if (!data) return null;

        return {
          symbol: stock.symbol.replace('.NS', ''), // Clean symbol
          name: stock.name,
          price: data.price,
          change: data.change,
          changePercent: data.changePercent,
          exchange: 'NSE',
          country: 'IN'
        } as StockData;
      });

      const results = (await Promise.all(stockPromises)).filter(s => s !== null && s.price > 0) as StockData[];

      // Sort by change percent
      const sorted = [...results].sort((a, b) => b.changePercent - a.changePercent);

      setTopGainers(sorted.filter(s => s.changePercent > 0).slice(0, 5));
      setTopLosers([...sorted].reverse().filter(s => s.changePercent < 0).slice(0, 5));

    } catch (err) {
      console.error("Market data fetch failed", err);
    }
  };

  // --- 3. Fetch News (GNews) ---
  const fetchNews = async () => {
    try {
      const response = await fetch(
        "http://127.0.0.1:8000/api/news"
      );

      if (!response.ok) throw new Error("News fetch failed");

      const data = await response.json();

      if (data.articles) {
        const newsItems: NewsItem[] = data.articles.map((article: any) => ({
          title: article.title,
          source: article.source.name,
          time: new Date(article.publishedAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          }),
          image:
            article.image ||
            'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&h=200&fit=crop',
          url: article.url,
          description: article.description,
          content: article.content
        }));

        setNews(newsItems);
      }
    } catch (err) {
      console.error("News fetch failed", err);
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center text-slate-900">
          <div className="w-[50px] h-[50px] border-[3px] border-slate-200 border-t-blue-500 rounded-full mx-auto mb-4 animate-spin"></div>
          <div className="text-lg font-semibold mb-2 text-slate-900">Loading Market Data...</div>
          <div className="text-sm text-slate-500">Fetching live prices...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-6 pb-[100px] sm:p-4 sm:pb-[80px]">
      {/* Conditional Screen Rendering */}
      {activeScreen === 'home' && (
        <Home
          user={user}
          portfolioData={portfolioData}
          chartData={chartData}
          topGainers={topGainers}
          topLosers={topLosers}
          news={news}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          selectedNews={selectedNews}
          setSelectedNews={setSelectedNews}
          apiError={apiError}
          niftyData={niftyData}
        />
      )}

      {activeScreen === 'chat' && <Chatbot />}

      {activeScreen === 'profile' && <Profile />}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white flex justify-around p-4 border-t border-slate-200 z-[100] shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        <button
          className={`flex flex-col items-center gap-1 bg-none border-none cursor-pointer transition-colors duration-200 text-xs p-2 rounded-lg hover:bg-slate-50 hover:text-slate-700 ${activeScreen === 'home' ? 'text-blue-500 bg-blue-50' : 'text-slate-500'}`}
          onClick={() => setActiveScreen('home')}
        >
          <HomeIcon size={24} />
          <span className="text-xs font-semibold">Home</span>
        </button>
        <button
          className={`flex flex-col items-center gap-1 bg-none border-none cursor-pointer transition-colors duration-200 text-xs p-2 rounded-lg hover:bg-slate-50 hover:text-slate-700 ${activeScreen === 'chat' ? 'text-blue-500 bg-blue-50' : 'text-slate-500'}`}
          onClick={() => setActiveScreen('chat')}
        >
          <Bot size={24} />
          <span className="text-xs font-semibold">AI Chat</span>
        </button>
        <button
          className={`flex flex-col items-center gap-1 bg-none border-none cursor-pointer transition-colors duration-200 text-xs p-2 rounded-lg hover:bg-slate-50 hover:text-slate-700 ${activeScreen === 'profile' ? 'text-blue-500 bg-blue-50' : 'text-slate-500'}`}
          onClick={() => setActiveScreen('profile')}
        >
          <User size={24} />
          <span className="text-xs font-semibold">Profile</span>
        </button>
      </nav>
    </div>
  );
};

export default HomePage;