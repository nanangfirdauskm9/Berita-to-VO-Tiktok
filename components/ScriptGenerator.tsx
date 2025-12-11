import React, { useState, useRef } from 'react';
import { GeneratedScript, GroundingSource, ProcessingStatus } from '../types';
import { generateNewsScript, generateTTSAudio } from '../services/geminiService';
import { Loader2, Mic, Play, FileVideo, Globe, AlertCircle, Copy, Check, Smartphone, Download } from 'lucide-react';

export const ScriptGenerator: React.FC = () => {
  const [inputUrl, setInputUrl] = useState('');
  const [status, setStatus] = useState<ProcessingStatus>(ProcessingStatus.IDLE);
  const [script, setScript] = useState<GeneratedScript | null>(null);
  const [sources, setSources] = useState<GroundingSource[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  // Audio State
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleGenerate = async (type: 'url' | 'video', file?: File) => {
    setStatus(ProcessingStatus.ANALYZING);
    setError(null);
    setScript(null);
    setSources([]);
    setAudioUrl(null); // Reset audio

    try {
      let videoBase64: string | undefined;
      let mimeType: string | undefined;

      if (type === 'video' && file) {
        // Convert file to base64
        const buffer = await file.arrayBuffer();
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        videoBase64 = btoa(binary);
        mimeType = file.type;
      }

      const result = await generateNewsScript(inputUrl, type, videoBase64, mimeType);
      
      setScript(result.script);
      setSources(result.sources);
      setStatus(ProcessingStatus.COMPLETE);

    } catch (err) {
      setError("Gagal membuat naskah. Pastikan API Key valid atau coba link lain.");
      setStatus(ProcessingStatus.ERROR);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleGenerate('video', e.target.files[0]);
    }
  };

  const handleCopy = () => {
    if (script) {
      navigator.clipboard.writeText(`[ON-SCREEN TEXT]\n${script.headline}\n\n[SCRIPT VO]\n${script.body}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePlayAudio = async () => {
    if (!script) return;

    if (audioUrl) {
      // Audio already exists, just play it
      const audio = new Audio(audioUrl);
      audio.play();
    } else {
      // Generate audio
      setIsGeneratingAudio(true);
      try {
        const url = await generateTTSAudio(script.body);
        setAudioUrl(url);
        const audio = new Audio(url);
        audio.play();
      } catch (e) {
        console.error("Audio generation failed", e);
      } finally {
        setIsGeneratingAudio(false);
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      
      {/* Input Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-pink-600" />
          Buat Konten Viral
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Link Berita / YouTube
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="https://... (Artikel atau Video untuk bahan konten)"
                className="flex-1 rounded-lg border border-slate-300 px-4 py-2 focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition"
              />
              <button
                onClick={() => handleGenerate('url')}
                disabled={!inputUrl || status === ProcessingStatus.ANALYZING}
                className="bg-pink-600 hover:bg-pink-700 text-white px-6 py-2 rounded-lg font-medium transition disabled:opacity-50 flex items-center gap-2"
              >
                {status === ProcessingStatus.ANALYZING ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Buat Konten"
                )}
              </button>
            </div>
          </div>

          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink-0 mx-4 text-slate-400 text-sm">ATAU ANALISIS VIDEO</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          <div className="flex justify-center">
             <input
                type="file"
                ref={fileInputRef}
                accept="video/*"
                className="hidden"
                onChange={handleFileUpload}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={status === ProcessingStatus.ANALYZING}
                className="flex items-center gap-2 px-6 py-3 rounded-lg border-2 border-dashed border-slate-300 hover:border-pink-500 text-slate-600 hover:text-pink-600 transition group w-full justify-center"
              >
                <FileVideo className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span>Upload Video (MP4) untuk Bahan Shorts/Reels</span>
              </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 text-sm">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}
      </div>

      {/* Output Section */}
      {script && (
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="bg-slate-900 text-white p-4 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
               <div className="w-2 h-8 bg-pink-500 rounded-full"></div>
               <h3 className="font-bold tracking-wide">NASKAH SHORTS / TIKTOK</h3>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
               
               {/* Play Button */}
               <button 
                  onClick={handlePlayAudio}
                  disabled={isGeneratingAudio}
                  className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded text-sm flex items-center gap-2 transition disabled:opacity-50"
                >
                  {isGeneratingAudio ? <Loader2 className="w-4 h-4 animate-spin"/> : <Play className="w-4 h-4" />}
                  {isGeneratingAudio ? 'Generating...' : 'Dengar VO'}
               </button>

               {/* Download Button (Only shows if audio exists) */}
               {audioUrl && (
                  <a 
                    href={audioUrl}
                    download={`nusantara-news-vo-${Date.now()}.wav`}
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-sm flex items-center gap-2 transition"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </a>
               )}

               <button 
                  onClick={handleCopy}
                  className="bg-pink-600 hover:bg-pink-500 text-white px-3 py-1.5 rounded text-sm flex items-center gap-2 transition"
               >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Disalin' : 'Salin'}
               </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 md:p-8 space-y-6">
            
            {/* Headline Card */}
            <div className="bg-gradient-to-r from-pink-50 to-purple-50 border-l-4 border-pink-500 p-4 rounded-r-lg">
              <span className="text-xs font-bold text-pink-700 uppercase tracking-wider mb-1 block">Teks Layar / Judul Hook</span>
              <h1 className="text-2xl font-black text-slate-900 leading-tight">
                {script.headline}
              </h1>
            </div>

            {/* Script Body */}
            <div className="prose prose-slate max-w-none">
               <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Script Voice-Over (Natural)</span>
                  <div className="whitespace-pre-line text-lg leading-relaxed text-slate-800 font-medium">
                      {script.body}
                  </div>
               </div>
            </div>

            {/* Sources / Grounding */}
            {sources.length > 0 && (
              <div className="mt-8 pt-6 border-t border-slate-100">
                <h4 className="text-sm font-semibold text-slate-500 mb-3 uppercase tracking-wider">Sumber Berita</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {sources.map((src, idx) => (
                    <a 
                      key={idx} 
                      href={src.uri} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline bg-blue-50 px-3 py-2 rounded transition"
                    >
                      <Globe className="w-3 h-3" />
                      <span className="truncate">{src.title || "Sumber Google Maps / Search"}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
};