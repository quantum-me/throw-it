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
  Sparkles,
  Video,
} from 'lucide-react';
import { Room } from 'livekit-client';
import { sound } from '../../utils/audio';

interface CallPanelProps {
  roomCode: string;
  playerName: string;
}

export const CallPanel: React.FC<CallPanelProps> = ({ roomCode, playerName }) => {
  const [isCalling, setIsCalling] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [callDuration, setCallDuration] = useState(0);

  // Local media stream ref for video display
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const roomRef = useRef<Room | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const livekitUrl = import.meta.env.VITE_LIVEKIT_URL;

  // Live Call Timer
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (isConnected) {
      timer = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(timer);
  }, [isConnected]);

  // Format call duration mm:ss
  const formatDuration = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle Join Call with Ringing Sound and Calling Animation
  const handleJoinCall = async () => {
    setIsCalling(true);
    setErrorMessage(null);
    sound.playRinging();

    // Subtle 1.8s realistic connection delay so players experience the call effect
    setTimeout(async () => {
      try {
        if (!livekitUrl) {
          // Direct browser MediaStream fallback with full video/audio
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: true,
          });
          localStreamRef.current = stream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
          sound.playCallConnected();
          setIsConnected(true);
          setIsVideoEnabled(true);
        } else {
          const room = new Room({
            adaptiveStream: true,
            dynacast: true,
          });
          roomRef.current = room;

          const tokenRes = await fetch(
            `/api/livekit-token?room=${roomCode}&username=${encodeURIComponent(playerName)}`
          );
          if (!tokenRes.ok) throw new Error('Token endpoint unavailable.');
          const { token } = await tokenRes.json();

          await room.connect(livekitUrl, token);
          await room.localParticipant.enableCameraAndMicrophone();

          sound.playCallConnected();
          setIsConnected(true);
          setIsVideoEnabled(true);
        }
      } catch (err: any) {
        sound.stopRinging();
        setErrorMessage(
          err.name === 'NotAllowedError'
            ? 'Camera / Microphone permission denied. Please allow device access.'
            : 'Could not access audio/video devices.'
        );
      } finally {
        setIsCalling(false);
      }
    }, 1800);
  };

  // Toggle Mic
  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      const willMute = !isMuted;
      audioTracks.forEach((t) => (t.enabled = !willMute));
      setIsMuted(willMute);
      sound.playMicToggle(willMute);
    }
  };

  // Toggle Camera
  const toggleCamera = () => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      const nextState = !isVideoEnabled;
      videoTracks.forEach((t) => (t.enabled = nextState));
      setIsVideoEnabled(nextState);
    }
  };

  // Leave Call
  const handleLeaveCall = () => {
    sound.playCallEnded();
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (roomRef.current) {
      roomRef.current.disconnect();
      roomRef.current = null;
    }
    setIsCalling(false);
    setIsConnected(false);
    setIsVideoEnabled(false);
    setIsMuted(false);
  };

  useEffect(() => {
    return () => {
      sound.stopRinging();
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (roomRef.current) {
        roomRef.current.disconnect();
      }
    };
  }, []);

  // DIALING / CALLING STATE
  if (isCalling) {
    return (
      <div className="w-full p-4 rounded-3xl bg-gradient-to-r from-cyan-900/30 via-fuchsia-900/20 to-blue-950/40 border-2 border-cyan-400/60 p-4 shadow-2xl flex items-center justify-between animate-pulse">
        <div className="flex items-center gap-3">
          {/* Radar Ringing Pulse Avatar */}
          <div className="relative flex items-center justify-center">
            <span className="absolute w-12 h-12 rounded-full bg-cyan-400/30 animate-ping" />
            <span className="w-10 h-10 rounded-2xl bg-cyan-500 text-slate-950 flex items-center justify-center shadow-lg relative z-10">
              <PhoneCall className="w-5 h-5 animate-bounce" />
            </span>
          </div>

          <div>
            <h4 className="text-sm font-black text-white flex items-center gap-2">
              <span>Calling Room ({roomCode})...</span>
              <Sparkles className="w-3.5 h-3.5 text-cyan-300 animate-spin" />
            </h4>
            <p className="text-xs text-cyan-200">Connecting audio and video channels</p>
          </div>
        </div>

        <button
          onClick={handleLeaveCall}
          className="py-1.5 px-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs"
        >
          Cancel
        </button>
      </div>
    );
  }

  // NOT CONNECTED STATE
  if (!isConnected) {
    return (
      <div className="w-full p-3.5 rounded-3xl bg-white dark:bg-game-surface border border-slate-200 dark:border-game-border flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-500 dark:text-cyan-400">
            <Video className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-black text-slate-900 dark:text-white">Match Voice & Video</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Optional live call during this room match</p>
          </div>
        </div>

        <button
          onClick={handleJoinCall}
          className="py-2 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs flex items-center gap-2 transition active:scale-95 shadow-md shadow-cyan-500/20"
        >
          <PhoneCall className="w-3.5 h-3.5" />
          Join Call
        </button>
      </div>
    );
  }

  // LIVE CONNECTED CALL STATE WITH EQUALIZER & LIVE VIDEO
  return (
    <div className="w-full rounded-3xl bg-white dark:bg-game-surface border-2 border-cyan-500/60 p-4 shadow-2xl flex flex-col gap-3 transition-all animate-fade-in">
      {/* Call Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-slate-900 dark:text-white">Live Call</span>
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-500/30">
              {formatDuration(callDuration)}
            </span>
          </div>

          {/* Equalizer Sound Wave Animation */}
          <div className="flex items-center gap-0.5 h-4 ml-1">
            <span className="w-1 bg-emerald-400 rounded-full animate-pulse h-2" />
            <span className="w-1 bg-emerald-400 rounded-full animate-pulse h-4" style={{ animationDelay: '0.15s' }} />
            <span className="w-1 bg-emerald-400 rounded-full animate-pulse h-3" style={{ animationDelay: '0.3s' }} />
            <span className="w-1 bg-emerald-400 rounded-full animate-pulse h-1.5" style={{ animationDelay: '0.45s' }} />
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-game-surfaceLight transition"
            title={isMinimized ? 'Expand call view' : 'Minimize call view'}
          >
            {isMinimized ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
          <button
            onClick={handleLeaveCall}
            className="p-1.5 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/20 transition"
            title="Leave call"
          >
            <PhoneOff className="w-4 h-4" />
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-500/15 border border-red-200 dark:border-red-500/40 text-red-700 dark:text-red-300 text-xs">
          {errorMessage}
        </div>
      )}

      {/* Video Tile (Hidden if minimized) */}
      {!isMinimized && (
        <div className="relative aspect-video max-h-48 rounded-2xl bg-slate-950 overflow-hidden border-2 border-slate-800 shadow-inner flex items-center justify-center group">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${!isVideoEnabled ? 'hidden' : ''}`}
          />
          {!isVideoEnabled && (
            <div className="flex flex-col items-center gap-1.5 text-slate-500 text-xs font-semibold">
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                <CameraOff className="w-6 h-6" />
              </div>
              <span>Camera Paused</span>
            </div>
          )}

          {/* Participant Label & Voice Indicator */}
          <div className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-xl bg-black/60 backdrop-blur-md text-[11px] font-bold text-white flex items-center gap-1.5 shadow-md">
            <span>{playerName} (You)</span>
            {isMuted ? (
              <MicOff className="w-3.5 h-3.5 text-red-400" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </div>
        </div>
      )}

      {/* Control Action Bar */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-2">
          {/* Mute/Unmute */}
          <button
            onClick={toggleMic}
            className={`py-2 px-3.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              isMuted
                ? 'bg-red-50 dark:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/40 shadow-sm'
                : 'bg-slate-100 dark:bg-game-surfaceLight text-slate-800 dark:text-slate-200 hover:text-cyan-500 border border-slate-200 dark:border-slate-700/60'
            }`}
            title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          >
            {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-cyan-500" />}
            <span>{isMuted ? 'Muted' : 'Mute'}</span>
          </button>

          {/* Camera On/Off */}
          <button
            onClick={toggleCamera}
            className={`py-2 px-3.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              !isVideoEnabled
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700'
                : 'bg-slate-100 dark:bg-game-surfaceLight text-slate-800 dark:text-slate-200 hover:text-emerald-500 border border-slate-200 dark:border-slate-700/60'
            }`}
            title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
          >
            {isVideoEnabled ? <Camera className="w-4 h-4 text-emerald-500" /> : <CameraOff className="w-4 h-4" />}
            <span>{isVideoEnabled ? 'Video On' : 'Video Off'}</span>
          </button>
        </div>

        <button
          onClick={handleLeaveCall}
          className="py-2 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs flex items-center gap-1.5 transition active:scale-95 shadow-md shadow-red-600/20"
        >
          <PhoneOff className="w-3.5 h-3.5" />
          End Call
        </button>
      </div>
    </div>
  );
};
