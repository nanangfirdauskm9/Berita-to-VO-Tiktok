import React, { useState } from 'react';
import { AppMode } from './types';
import { ScriptGenerator } from './components/ScriptGenerator';
import { LiveNewsroom } from './components/LiveNewsroom';
import { Radio, FileText, Tv } from 'lucide-react';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.GENERATOR);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      
      {/* Header / Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-red-600 text-white p-2 rounded-lg">
              <Tv className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 leading-none">NUSANTARA</h1>
              <span className="text-xs font-bold text-red-600 tracking-[0.2em] uppercase">News AI</span>
            </div>
          </div>
          
          <nav className="flex bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setMode(AppMode.GENERATOR)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                mode === AppMode.GENERATOR 
                ? 'bg-white text-slate-900 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <FileText className="w-4 h-4" />
              Generator Naskah
            </button>
            <button
              onClick={() => setMode(AppMode.LIVE_ROOM)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                mode === AppMode.LIVE_ROOM 
                ? 'bg-white text-slate-900 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Radio className="w-4 h-4" />
              Live Newsroom
            </button>
          </nav>
        </div>

        {/* News Ticker Decoration */}
        <div className="bg-slate-900 text-white text-xs py-1 news-ticker-container border-t border-slate-800">
           <div className="news-ticker-text flex gap-8">
              <span>BREAKING: AI REVOLUTIONIZES NEWSROOM PRODUCTION</span>
              <span>•</span>
              <span>GEMINI 3.0 PRO ENABLES VIDEO UNDERSTANDING</span>
              <span>•</span>
              <span>LIVE API CONNECTS REPORTERS INSTANTLY</span>
              <span>•</span>
              <span>MAPS GROUNDING ENSURES ACCURACY</span>
           </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 py-8 px-4">
        {mode === AppMode.GENERATOR ? (
          <div className="animate-fade-in">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-slate-900 mb-2">Penulis Naskah Otomatis</h2>
              <p className="text-slate-600">Ubah link YouTube, Artikel, atau Video menjadi naskah TV profesional dalam hitungan detik.</p>
            </div>
            <ScriptGenerator />
          </div>
        ) : (
          <div className="animate-fade-in max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200">
            <LiveNewsroom />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-auto">
        <div className="max-w-6xl mx-auto px-4 text-center text-slate-400 text-sm">
          <p>© 2024 Nusantara News AI. Powered by Google Gemini.</p>
        </div>
      </footer>

    </div>
  );
};

export default App;
