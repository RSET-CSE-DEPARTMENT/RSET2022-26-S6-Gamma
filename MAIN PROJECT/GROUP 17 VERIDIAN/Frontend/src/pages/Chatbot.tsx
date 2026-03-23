import React, { useState, useRef, useEffect } from 'react';
import { Plus, ChevronUp, AlertCircle, TrendingUp } from 'lucide-react';
import type { Message } from '../types/chat.types';
import { chatService } from '../services/chatService';
import { formatMessage } from '../utils/messageFormatter';

const Chatbot: React.FC = () => {
  // --- State ---
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      type: 'assistant',
      content: "Hello! I'm your AI Financial Advisor. How can I help you with financial advice today? You can ask me about stocks, mutual funds, budgeting, and more!",
      avatar: '🤖',
      timestamp: new Date()
    }
  ]);

  const [inputValue, setInputValue] = useState('');
  // Predict Mode specific states
  const [companyName, setCompanyName] = useState('');
  const [holdsStock, setHoldsStock] = useState(''); 
  
  const [isLoading, setIsLoading] = useState(false);
  const [isPredictMode, setIsPredictMode] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const companyInputRef = useRef<HTMLInputElement>(null);

  // --- Helpers ---
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handlePredictToggle = () => {
    if (!isPredictMode) {
      setShowDisclaimer(true);
    } else {
      setIsPredictMode(false);
      // Optional: Clear predict inputs when toggling off
      setCompanyName('');
      setHoldsStock('');
    }
  };

  const confirmPredictionMode = () => {
    setIsPredictMode(true);
    setShowDisclaimer(false);
    setTimeout(() => companyInputRef.current?.focus(), 100);
  };

  const handleSendMessage = async (messageText?: string) => {
    let textToSend = messageText || '';

    // Handle standard vs predict mode inputs
    if (!textToSend) {
      if (isPredictMode) {
        if (!companyName.trim() || !holdsStock) return;

        // ⭐ structured payload for backend
        textToSend = JSON.stringify({
          ticker: companyName.trim(),
          owns_stock: holdsStock.toLowerCase() === 'y'
        });

        setCompanyName('');
        setHoldsStock('');
      }
      else {
        if (!inputValue.trim()) return;
        textToSend = inputValue.trim();
        setInputValue('');
      }
    }

    if (!textToSend || isLoading) return;

    const userMessage: Message = {
      id: Date.now(),
      type: 'user',
      content: textToSend,
      avatar: '👤',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);

    const loadingMessage: Message = {
      id: Date.now() + 1,
      type: 'loading',
      content: isPredictMode ? 'Calculating predictive analytics...' : 'Analyzing your financial query...',
      avatar: '🤖',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, loadingMessage]);
    setIsLoading(true);

    try {
      // @ts-ignore
      const aiResponse = await chatService.sendMessage(textToSend, isPredictMode);

      setMessages(prev => {
        const withoutLoading = prev.filter(msg => msg.type !== 'loading');
        return [
          ...withoutLoading,
          {
            id: Date.now() + 2,
            type: 'assistant',
            content: aiResponse,
            avatar: '🤖',
            timestamp: new Date()
          }
        ];
      });
    } catch (error: any) {
      setMessages(prev => {
        const withoutLoading = prev.filter(msg => msg.type !== 'loading');
        return [
          ...withoutLoading,
          {
            id: Date.now() + 2,
            type: 'error',
            content: error.message || 'Failed to get response. Please try again.',
            avatar: '⚠️',
            timestamp: new Date()
          }
        ];
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChipClick = (chipText: string) => {
    setInputValue(chipText);
    if (!isPredictMode) inputRef.current?.focus();
  };

  const renderMessageContent = (message: Message) => {
    if (message.type === 'loading') {
      return (
        <div className="flex items-center gap-1 p-2">
          <span className="w-2 h-2 bg-slate-500 rounded-full animate-pulse"></span>
          <span className="w-2 h-2 bg-slate-500 rounded-full animate-pulse [animation-delay:200ms]"></span>
          <span className="w-2 h-2 bg-slate-500 rounded-full animate-pulse [animation-delay:400ms]"></span>
        </div>
      );
    }

    if (message.type === 'error') {
      return (
        <div className="flex flex-col gap-2">
          <p className="text-red-800 text-sm m-0">{message.content}</p>
          <button
            className="self-start py-1.5 px-3 bg-red-500 text-white rounded-md text-xs font-medium hover:bg-red-600"
            onClick={() => {
              const lastUser = [...messages].reverse().find(m => m.type === 'user');
              if (lastUser) handleSendMessage(lastUser.content);
            }}
          >
            Retry
          </button>
        </div>
      );
    }

    return (
      <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">
        {formatMessage(message.content)}
      </div>
    );
  };

  const actionChips = [
    'Explain compound interest',
    'What are mutual funds?',
    'Diversification strategies',
    'Tax-saving investments'
  ];

  const isSendDisabled = isLoading || (isPredictMode ? (!companyName.trim() || !holdsStock) : !inputValue.trim());

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-[#f0f9f4] font-sans">
      
      {/* --- Disclaimer Modal --- */}
      {showDisclaimer && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl border border-gray-100 animate-in fade-in zoom-in duration-200">
            <div className="flex flex-col items-center text-center gap-4 mb-6">
              <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center text-amber-600">
                <AlertCircle size={40} />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Formal Financial Disclaimer</h2>
              <p className="text-gray-600 text-sm leading-relaxed">
                The predictive outputs provided by this model are generated using statistical patterns and do not account for real-time market volatility. 
                <span className="block mt-2 font-semibold text-gray-800">
                  These projections are not financial advice and may be inaccurate. 
                </span>
                You must consult with a certified financial expert before making any investment or legal decisions based on this data.
              </p>
            </div>
            
            <div className="flex gap-3">
              <button 
                onClick={() => setShowDisclaimer(false)}
                className="flex-1 py-3 px-4 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-colors"
              >
                Decline
              </button>
              <button 
                onClick={confirmPredictionMode}
                className="flex-1 py-3 px-4 rounded-xl bg-blue-900 text-white font-semibold hover:bg-blue-800 transition-shadow shadow-lg"
              >
                Accept & Proceed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Header --- */}
      <div className="shrink-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between shadow-sm z-20">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold text-gray-800">AI Financial Advisor</h1>
          {isPredictMode && (
            <span className="flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full uppercase tracking-tighter">
              <TrendingUp size={10} /> Predictive Active
            </span>
          )}
        </div>
      </div>

      {/* --- Chat Messages Area --- */}
      <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-4 scroll-smooth">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex items-start gap-3 ${message.type === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-lg shadow-sm ${
                message.type === 'assistant' ? 'bg-teal-400 text-white' :
                message.type === 'user' ? 'bg-orange-400 text-white' :
                message.type === 'loading' ? 'bg-slate-400 text-white' :
                'bg-red-400 text-white'
              }`}>
              {message.avatar}
            </div>

            <div className={`max-w-[80%] rounded-2xl py-3 px-4 shadow-sm bg-white ${
                message.type === 'assistant' ? 'rounded-tl-none border border-gray-100' :
                message.type === 'user' ? 'rounded-tr-none border-l-4 border-orange-400' :
                message.type === 'error' ? 'bg-red-50 border-l-4 border-red-500' :
                'bg-slate-50 border border-gray-200'
              }`}>
              {renderMessageContent(message)}
            </div>
          </div>
        ))}

        {!isLoading && messages.length < 5 && (
          <div className="flex gap-2 flex-wrap pt-2">
            {actionChips.map((chip, idx) => (
              <button
                key={idx}
                className="py-2 px-4 bg-blue-50 text-blue-700 rounded-full text-sm font-medium border border-blue-100 hover:bg-blue-100 transition-colors"
                onClick={() => handleChipClick(chip)}
              >
                {chip}
              </button>
            ))}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* --- Bottom Input Bar --- */}
      <div className="shrink-0 bg-white border-t border-gray-200 mb-23 py-4 px-4 shadow-[0_-4px_10px_rgba(0,0,0,0.03)] z-20">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <button className="shrink-0 w-10 h-10 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-full transition-colors" aria-label="Add attachment">
            <Plus size={24} />
          </button>

          <div className="flex-1 bg-gray-100 rounded-2xl py-1.5 px-4 flex items-center gap-3 border border-transparent focus-within:border-gray-300 focus-within:bg-white transition-all">
            
            {/* Dynamic Inputs based on Mode */}
            {isPredictMode ? (
              <div className="flex flex-1 items-center gap-2">
                <input
                  ref={companyInputRef}
                  type="text"
                  placeholder="Company or Ticker..."
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  onKeyDown={(e) => { if(e.key === 'Enter' && companyName && holdsStock) handleSendMessage(); }}
                  disabled={isLoading}
                  className="flex-1 bg-transparent border-none outline-none text-sm text-gray-800 placeholder-gray-400 py-2 w-full min-w-[120px]"
                />
                <div className="w-px h-6 bg-gray-300"></div> {/* Divider */}
                <input
                  type="text"
                  placeholder="Hold? (y/n)"
                  value={holdsStock}
                  maxLength={1}
                  onChange={(e) => {
                    const val = e.target.value.toLowerCase();
                    // Restrict input to only 'y' or 'n' or empty
                    if (val === '' || val === 'y' || val === 'n') {
                      setHoldsStock(val);
                    }
                  }}
                  onKeyDown={(e) => { if(e.key === 'Enter' && companyName && holdsStock) handleSendMessage(); }}
                  disabled={isLoading}
                  className="w-20 bg-transparent border-none outline-none text-sm text-gray-800 placeholder-gray-400 py-2 text-center"
                />
              </div>
            ) : (
              <input
                ref={inputRef}
                type="text"
                placeholder="Ask about stocks, investing..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => { if(e.key === 'Enter') handleSendMessage(); }}
                disabled={isLoading}
                className="flex-1 bg-transparent border-none outline-none text-sm text-gray-800 placeholder-gray-400 py-2"
              />
            )}
            
            {/* Predict Toggle */}
            <div className="flex items-center gap-2 border-l border-gray-300 pl-3 py-1">
              <span className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${isPredictMode ? 'text-blue-900' : 'text-gray-400'}`}>
                Predict
              </span>
              <button 
                onClick={handlePredictToggle}
                className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${
                  isPredictMode ? 'bg-blue-900' : 'bg-gray-300'
                }`}
              >
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${isPredictMode ? 'translate-x-5.5' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>

          <button
            className={`shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg transition-all ${
              isSendDisabled 
                ? 'bg-gray-300 cursor-not-allowed shadow-none' 
                : 'bg-blue-900 hover:bg-blue-800 active:scale-95'
            }`}
            onClick={() => handleSendMessage()}
            disabled={isSendDisabled}
          >
            <ChevronUp size={24} />
          </button>
        </div>
        {/* Safe area spacer for mobile keyboards */}
        <div className="h-2" />
      </div>
    </div>
  );
};

export default Chatbot;