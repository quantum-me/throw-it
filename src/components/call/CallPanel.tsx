import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  CameraOff,
  ChevronDown,
  ChevronUp,
  Mic,
  MicOff,
  PhoneCall,
  PhoneOff,
  Video,
} from 'lucide-react';
import { Room } from 'livekit-client';

interface CallPanelProps {
  roomCode: string;
  playerName: string;
}

export const CallPanel: React.FC<CallPanelProps> = ({ roomCode, playerName }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState<boolean>(true);

  // Local media stream ref for video display
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const roomRef = useRef<Room | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const livekitUrl = import.meta.env.VITE_LIVEKIT_URL;

  // Handle Join Call
  const handleJoinCall = async () => {
    setIsConnecting(true);
    setErrorMessage(null);

    // If livekit URL is not provided in env, provide real-time browser MediaStream fallback so users can still test voice/camera!
    if (!livekitUrl) {
      setIsConfigured(false);
      try {
        // Request user media for real camera/mic verification
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true,
        });
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        setIsConnected(true);
        setIsVideoEnabled(true);
      } catch (err: any) {
        setErrorMessage(
          err.name === 'NotAllowedError'
            ? 'Camera / Microphone permission denied. Please allow device access in browser settings.'
            : 'Could not access audio/video devices.'
        );
      } finally {
        setIsConnecting(false);
      }
      return;
    }

    try {
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });
      roomRef.current = room;

      // Connect to token endpoint (in production server-side edge function)
      const tokenRes = await fetch(`/api/livekit-token?room=${roomCode}&username=${encodeURIComponent(playerName)}`);
      if (!tokenRes.ok) {
        throw new Error('Token endpoint unavailable.');
      }
      const { token } = await tokenRes.json();

      await room.connect(livekitUrl, token);
      await room.localParticipant.enableCameraAndMicrophone();

      setIsConnected(true);
      setIsVideoEnabled(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to connect to LiveKit server.');
    } finally {
      setIsConnecting(false);
    }
  };

  // Toggle Mic
  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach((t) => (t.enabled = isMuted));
      setIsMuted(!isMuted);
    }
  };

  // Toggle Camera
  const toggleCamera = () => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      videoTracks.forEach((t) => (t.enabled = !isVideoEnabled));
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  // Leave Call
  const handleLeaveCall = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (roomRef.current) {
      roomRef.current.disconnect();
      roomRef.current = null;
    }
    setIsConnected(false);
    setIsVideoEnabled(false);
    setIsMuted(false);
  };

  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (roomRef.current) {
        roomRef.current.disconnect();
      }
    };
  }, []);

  if (!isConnected) {
    return (
      <div className="w-full p-3 rounded-2xl bg-game-surface border border-game-border flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Video className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">Match Voice & Video</h4>
            <p className="text-[11px] text-slate-400">Optional live call during this room match</p>
          </div>
        </div>

        <button
          onClick={handleJoinCall}
          disabled={isConnecting}
          className="py-2 px-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition active:scale-95 shadow-md shadow-cyan-500/20 disabled:opacity-50"
        >
          <PhoneCall className="w-3.5 h-3.5" />
          {isConnecting ? 'Connecting...' : 'Join Call'}
        </button>
      </div>
    );
  }

  return (
    <div className="w-full rounded-2xl bg-game-surface border-2 border-cyan-500/40 p-3.5 shadow-2xl flex flex-col gap-3 transition-all animate-fade-in">
      {/* Call Header */}
      <div className="flex items-center justify-between pb-2 border-b border-game-border">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-bold text-white flex items-center gap-1">
            Live Call <span className="text-slate-400">({roomCode})</span>
          </span>
          {!isConfigured && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
              Browser Direct
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-game-surfaceLight transition"
            title={isMinimized ? 'Expand call view' : 'Minimize call view'}
          >
            {isMinimized ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
          <button
            onClick={handleLeaveCall}
            className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/20 transition"
            title="Leave call"
          >
            <PhoneOff className="w-4 h-4" />
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-2 rounded bg-red-500/15 border border-red-500/40 text-red-300 text-[11px]">
          {errorMessage}
        </div>
      )}

      {/* Video Tile (Hidden if minimized) */}
      {!isMinimized && (
        <div className="relative aspect-video max-h-40 rounded-xl bg-slate-950 overflow-hidden border border-game-border flex items-center justify-center">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${!isVideoEnabled ? 'hidden' : ''}`}
          />
          {!isVideoEnabled && (
            <div className="flex flex-col items-center gap-1 text-slate-500 text-xs font-semibold">
              <CameraOff className="w-6 h-6" />
              <span>Camera Off</span>
            </div>
          )}

          {/* Participant Label */}
          <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/60 backdrop-blur-sm text-[10px] font-bold text-white flex items-center gap-1">
            <span>{playerName} (You)</span>
            {isMuted && <MicOff className="w-3 h-3 text-red-400" />}
          </div>
        </div>
      )}

      {/* Control Action Bar */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-2">
          {/* Mute/Unmute */}
          <button
            onClick={toggleMic}
            className={`p-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              isMuted
                ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                : 'bg-game-surfaceLight text-slate-200 hover:text-white border border-slate-700/60'
            }`}
            title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          >
            {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-cyan-400" />}
            <span className="hidden sm:inline">{isMuted ? 'Muted' : 'Mute'}</span>
          </button>

          {/* Camera On/Off */}
          <button
            onClick={toggleCamera}
            className={`p-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              !isVideoEnabled
                ? 'bg-slate-800 text-slate-400 border border-slate-700'
                : 'bg-game-surfaceLight text-slate-200 hover:text-white border border-slate-700/60'
            }`}
            title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
          >
            {isVideoEnabled ? <Camera className="w-4 h-4 text-emerald-400" /> : <CameraOff className="w-4 h-4" />}
            <span className="hidden sm:inline">{isVideoEnabled ? 'Video On' : 'Video Off'}</span>
          </button>
        </div>

        <button
          onClick={handleLeaveCall}
          className="py-1.5 px-3 rounded-xl bg-red-600/80 hover:bg-red-600 text-white font-bold text-xs flex items-center gap-1 transition"
        >
          <PhoneOff className="w-3.5 h-3.5" />
          Leave
        </button>
      </div>
    </div>
  );
};
