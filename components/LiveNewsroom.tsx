import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Activity, Radio } from 'lucide-react';
import { connectToLiveNewsroom } from '../services/geminiService';

export const LiveNewsroom: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const disconnectRef = useRef<(() => Promise<void>) | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  // Audio Visualization
  const visualize = (buffer: AudioBuffer) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const data = buffer.getChannelData(0);
    const step = Math.ceil(data.length / canvas.width);
    const amp = canvas.height / 2;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#3b82f6'; // Blue-500
    ctx.beginPath();

    for (let i = 0; i < canvas.width; i++) {
      let min = 1.0;
      let max = -1.0;
      for (let j = 0; j < step; j++) {
        const datum = data[(i * step) + j];
        if (datum < min) min = datum;
        if (datum > max) max = datum;
      }
      ctx.lineTo(i, (1 + min) * amp);
      ctx.lineTo(i, (1 + max) * amp);
    }
    ctx.stroke();
  };

  const toggleConnection = async () => {
    if (isConnected) {
      if (disconnectRef.current) {
        await disconnectRef.current();
        disconnectRef.current = null;
      }
      setIsConnected(false);
    } else {
      setIsConnecting(true);
      try {
        const { disconnect } = await connectToLiveNewsroom(
          (buffer) => visualize(buffer),
          () => setIsConnected(false)
        );
        disconnectRef.current = disconnect;
        setIsConnected(true);
      } catch (err) {
        console.error("Failed to connect live", err);
      } finally {
        setIsConnecting(false);
      }
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (disconnectRef.current) {
        disconnectRef.current();
      }
      cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center space-y-8">
      
      <div className="space-y-2">
        <h2 className="text-3xl font-bold text-slate-800">Ruang Redaksi Langsung</h2>
        <p className="text-slate-500 max-w-md mx-auto">
          Diskusikan <i>angle</i> berita secara real-time dengan AI Editor-in-Chief. Gunakan suara untuk brainstorming.
        </p>
      </div>

      {/* Visualizer Container */}
      <div className="relative w-full max-w-lg h-48 bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border-4 border-slate-800">
        <canvas 
          ref={canvasRef} 
          width={512} 
          height={192} 
          className="absolute inset-0 w-full h-full opacity-80"
        />
        
        {/* Status Overlay */}
        <div className="absolute top-4 left-4 flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-red-500 animate-pulse' : 'bg-slate-500'}`}></div>
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              {isConnected ? 'ON AIR' : 'OFF AIR'}
            </span>
        </div>

        {!isConnected && !isConnecting && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Radio className="w-16 h-16 text-slate-700 opacity-50" />
          </div>
        )}
      </div>

      {/* Controls */}
      <div>
        <button
          onClick={toggleConnection}
          disabled={isConnecting}
          className={`
            relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl
            ${isConnected 
              ? 'bg-red-500 hover:bg-red-600 ring-4 ring-red-200' 
              : 'bg-blue-600 hover:bg-blue-700 ring-4 ring-blue-200'}
            ${isConnecting ? 'opacity-75 cursor-wait' : ''}
          `}
        >
          {isConnected ? (
            <MicOff className="w-8 h-8 text-white" />
          ) : (
            <Mic className="w-8 h-8 text-white" />
          )}
          
          {/* Ripple effect when active */}
          {isConnected && (
             <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping"></span>
          )}
        </button>
        <p className="mt-4 text-sm font-medium text-slate-600">
          {isConnecting ? 'Menghubungkan...' : isConnected ? 'Tekan untuk Berhenti' : 'Tekan untuk Bicara'}
        </p>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 text-blue-800 text-sm px-6 py-4 rounded-xl max-w-lg">
         <strong>Tips:</strong> Coba katakan <i>"Saya punya berita tentang banjir di Jakarta, angle apa yang bagus?"</i> atau <i>"Buatkan intro dramatis untuk berita ekonomi."</i>
      </div>
    </div>
  );
};
