import { useState, useEffect, useRef } from "react";
import Peer from "peerjs";
import type { MediaConnection } from "peerjs";
import {
  Video, VideoOff, Mic, MicOff, PhoneCall, PhoneOff, Radio, Eye,
  RefreshCw, HardHat, UserCheck, Volume2, VolumeX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { Project } from "@/lib/types";

interface LiveStreamTabProps {
  project: Project;
  currentUserId: string;
  currentUserRole: string; // "contractor", "engineer", "admin", "owner", etc.
  currentUserName: string;
}

export function LiveStreamTab({
  project,
  currentUserId,
  currentUserRole,
  currentUserName,
}: LiveStreamTabProps) {
  // Normalize roles:
  const isContractor =
    currentUserRole === "contractor" ||
    (project.contractor_id && project.contractor_id === currentUserId);

  const isEngineer =
    currentUserRole === "engineer" ||
    currentUserRole === "admin" ||
    (project.engineer_id && project.engineer_id === currentUserId);

  // Broadcaster peer ID deterministic by project
  const broadcasterPeerId = `nirman-${project.id.replace(/-/g, "").slice(0, 18)}-site`;

  // ── State ────────────────────────────────────────────────────────────────────
  const [peer, setPeer] = useState<Peer | null>(null);
  const [peerReady, setPeerReady] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isViewing, setIsViewing] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<"environment" | "user">("environment");

  // Contractor controls
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isContractorSpeakerMuted, setIsContractorSpeakerMuted] = useState(false);
  const [needsContractorAudioUnlock, setNeedsContractorAudioUnlock] = useState(false);

  // Engineer controls
  const [isEngineerAudioMuted, setIsEngineerAudioMuted] = useState(false);
  const [isEngineerMicMuted, setIsEngineerMicMuted] = useState(false);
  const [isEngineerMicActive, setIsEngineerMicActive] = useState(false);
  const [needsAudioUnlock, setNeedsAudioUnlock] = useState(false);

  const [activeViewersCount, setActiveViewersCount] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<string>("Idle");

  // ── Refs ─────────────────────────────────────────────────────────────────────
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  // Separate audio element so contractor hears engineer (video stays muted=true on contractor)
  const contractorAudioRef = useRef<HTMLAudioElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const engineerMicStreamRef = useRef<MediaStream | null>(null);
  const outgoingCallsRef = useRef<MediaConnection[]>([]);
  const incomingCallRef = useRef<MediaConnection | null>(null);

  // ── PeerJS initialization ────────────────────────────────────────────────────
  useEffect(() => {
    let p: Peer;
    setConnectionStatus("Connecting to signaling network...");

    const iceServers = [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:global.stun.twilio.com:3478" },
    ];

    if (isContractor) {
      p = new Peer(broadcasterPeerId, { config: { iceServers } });
    } else {
      p = new Peer({ config: { iceServers } });
    }

    p.on("open", () => {
      setPeerReady(true);
      setConnectionStatus("Signaling ready");
    });

    p.on("error", (err: unknown) => {
      const errorMsg = (err as { message?: string })?.message || "Peer connection error";
      const errorType = (err as { type?: string })?.type;
      if (errorType === "unavailable-id") {
        setConnectionStatus("Site stream channel already reserved / active");
      } else {
        setConnectionStatus(`Network: ${errorMsg}`);
      }
    });

    // ── Contractor: receive incoming call from engineer ───────────────────────
    if (isContractor) {
      p.on("call", (call) => {
        if (!localStreamRef.current) {
          call.close();
          return;
        }

        // Answer with contractor's full camera + mic stream  →  engineer hears & sees contractor
        call.answer(localStreamRef.current);
        outgoingCallsRef.current.push(call);
        setActiveViewersCount((c) => c + 1);

        // Receive engineer's microphone stream  →  contractor hears engineer
        call.on("stream", (remoteEngineerStream) => {
          if (contractorAudioRef.current) {
            contractorAudioRef.current.srcObject = remoteEngineerStream;
            contractorAudioRef.current.muted = false;
            contractorAudioRef.current.volume = 1.0;
            contractorAudioRef.current.play().catch(() => {
              // Browser blocked autoplay — show unlock button
              setNeedsContractorAudioUnlock(true);
            });
          }
        });

        call.on("close", () => {
          outgoingCallsRef.current = outgoingCallsRef.current.filter((c) => c !== call);
          setActiveViewersCount((c) => Math.max(0, c - 1));
          if (contractorAudioRef.current) {
            contractorAudioRef.current.srcObject = null;
          }
          setNeedsContractorAudioUnlock(false);
        });

        toast.info("Engineer joined! 🎙️ 2-way audio is active — you can speak to each other.");
      });
    }

    setPeer(p);

    return () => {
      outgoingCallsRef.current.forEach((c) => c.close());
      incomingCallRef.current?.close();
      if (engineerMicStreamRef.current) {
        engineerMicStreamRef.current.getTracks().forEach((t) => t.stop());
        engineerMicStreamRef.current = null;
      }
      if (contractorAudioRef.current) {
        contractorAudioRef.current.srcObject = null;
      }
      p.destroy();
      stopLocalStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id, isContractor]);

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const stopLocalStream = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
  };

  // ── Contractor: start broadcasting ──────────────────────────────────────────
  const startBroadcasting = async () => {
    try {
      setConnectionStatus("Starting site camera...");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: cameraFacing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      setIsStreaming(true);
      setConnectionStatus("Live streaming from construction site");
      toast.success("Live broadcast started! Engineer can now see and hear you.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Camera/Mic error: ${msg}`);
      setConnectionStatus("Camera or microphone access denied");
    }
  };

  // ── Contractor: stop broadcasting ───────────────────────────────────────────
  const stopBroadcasting = () => {
    outgoingCallsRef.current.forEach((c) => c.close());
    outgoingCallsRef.current = [];
    stopLocalStream();
    setIsStreaming(false);
    setActiveViewersCount(0);
    setNeedsContractorAudioUnlock(false);
    setConnectionStatus("Broadcast ended");
    toast.info("Live stream ended");
  };

  // ── Contractor: flip camera ──────────────────────────────────────────────────
  const flipCamera = async () => {
    if (!isStreaming) return;
    const newFacing = cameraFacing === "environment" ? "user" : "environment";
    setCameraFacing(newFacing);

    try {
      stopLocalStream();
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });

      if (isMuted) {
        newStream.getAudioTracks().forEach((t) => (t.enabled = false));
      }

      localStreamRef.current = newStream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = newStream;
      }

      // Replace tracks in all active viewer calls
      const newVideoTrack = newStream.getVideoTracks()[0];
      const newAudioTrack = newStream.getAudioTracks()[0];
      outgoingCallsRef.current.forEach((call) => {
        const senders = call.peerConnection?.getSenders();
        const videoSender = senders?.find((s) => s.track?.kind === "video");
        if (videoSender && newVideoTrack) videoSender.replaceTrack(newVideoTrack);
        const audioSender = senders?.find((s) => s.track?.kind === "audio");
        if (audioSender && newAudioTrack) audioSender.replaceTrack(newAudioTrack);
      });
      toast.success(`Switched to ${newFacing === "environment" ? "back" : "front"} camera`);
    } catch {
      toast.error("Failed to switch camera");
    }
  };

  // ── Engineer: connect to site feed with microphone ───────────────────────────
  const connectToSiteFeed = async () => {
    if (!peer) {
      toast.error("Signaling peer not ready");
      return;
    }

    setConnectionStatus("Activating microphone & connecting to site...");

    // Engineer sends: dummy video + real mic audio
    const canvas = document.createElement("canvas");
    canvas.width = 2;
    canvas.height = 2;
    const dummyVideoTrack = canvas.captureStream(1).getVideoTracks()[0];
    const tracks: MediaStreamTrack[] = [dummyVideoTrack];

    // Request engineer mic so contractor can hear the engineer
    try {
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      engineerMicStreamRef.current = micStream;
      const engineerAudioTrack = micStream.getAudioTracks()[0];
      if (engineerAudioTrack) {
        tracks.push(engineerAudioTrack);
        setIsEngineerMicActive(true);
      }
    } catch (micErr) {
      console.warn("Engineer mic denied — using silent audio fallback:", micErr);
      // Fallback: silent audio track so WebRTC still negotiates audio channel
      try {
        const AudioCtxClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtxClass) {
          const ctx = new AudioCtxClass();
          const osc = ctx.createOscillator();
          const dst = ctx.createMediaStreamDestination();
          osc.connect(dst);
          osc.start();
          const dummyAudio = dst.stream.getAudioTracks()[0];
          if (dummyAudio) {
            dummyAudio.enabled = false;
            tracks.push(dummyAudio);
          }
        }
      } catch {
        // ignore
      }
      toast.warning("Mic not available — you can hear the contractor but they cannot hear you.");
    }

    const engineerStream = new MediaStream(tracks);
    const call = peer.call(broadcasterPeerId, engineerStream);
    incomingCallRef.current = call;

    // Receive contractor's camera + mic stream  →  engineer sees video & hears contractor
    call.on("stream", (remoteStream) => {
      setIsViewing(true);
      setConnectionStatus("Connected — 2-Way Live Communication 🎙️📹");
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
        remoteVideoRef.current.muted = false;
        remoteVideoRef.current.volume = 1.0;

        remoteVideoRef.current.play().catch(() => {
          setNeedsAudioUnlock(true);
        });
      }
      toast.success("Connected! Both contractor and engineer can now speak to each other. 🔊");
    });

    call.on("close", () => {
      setIsViewing(false);
      setConnectionStatus("Site stream ended or contractor disconnected");
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
      toast.info("Site camera session ended");
    });

    call.on("error", () => {
      setIsViewing(false);
      setConnectionStatus("Failed to reach contractor camera");
      toast.error("Contractor has not started the live camera yet.");
    });
  };

  // ── Engineer: disconnect ─────────────────────────────────────────────────────
  const disconnectSiteFeed = () => {
    incomingCallRef.current?.close();
    incomingCallRef.current = null;
    engineerMicStreamRef.current?.getTracks().forEach((t) => t.stop());
    engineerMicStreamRef.current = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    setIsViewing(false);
    setIsEngineerMicActive(false);
    setIsEngineerMicMuted(false);
    setNeedsAudioUnlock(false);
    setConnectionStatus("Disconnected");
  };

  // ── Toggle handlers ──────────────────────────────────────────────────────────

  // Engineer: mute/unmute contractor's incoming audio (via video element)
  const toggleEngineerAudio = () => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = !remoteVideoRef.current.muted;
      setIsEngineerAudioMuted(remoteVideoRef.current.muted);
    }
  };

  // Engineer: mute/unmute their own outgoing microphone
  const toggleEngineerMic = () => {
    const audioTrack = engineerMicStreamRef.current?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsEngineerMicMuted(!audioTrack.enabled);
      toast.info(
        audioTrack.enabled
          ? "Your mic is live — contractor can hear you 🎙️"
          : "Your mic is muted"
      );
    }
  };

  // Contractor: mute/unmute their own outgoing microphone (engineer hears them)
  const toggleMute = () => {
    const audioTrack = localStreamRef.current?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
      toast.info(audioTrack.enabled ? "Your mic is live — engineer can hear you 🎙️" : "Your mic muted");
    }
  };

  // Contractor: mute/unmute their video
  const toggleVideo = () => {
    const videoTrack = localStreamRef.current?.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoMuted(!videoTrack.enabled);
    }
  };

  // Contractor: mute/unmute incoming engineer voice through contractorAudioRef
  const toggleContractorSpeaker = () => {
    if (contractorAudioRef.current) {
      contractorAudioRef.current.muted = !contractorAudioRef.current.muted;
      setIsContractorSpeakerMuted(contractorAudioRef.current.muted);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Role Header Banner */}
      <Card className="border-l-4 border-l-primary shadow-sm">
        <CardHeader className="py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Radio className={`h-5 w-5 ${isStreaming ? "text-red-500 animate-pulse" : "text-muted-foreground"}`} />
                <CardTitle className="text-lg">Live Site Video Call</CardTitle>
                <Badge variant={isStreaming ? "destructive" : isViewing ? "default" : "outline"} className="capitalize">
                  {isStreaming ? "LIVE ON SITE" : isViewing ? "WATCHING LIVE" : "OFFLINE"}
                </Badge>
              </div>
              <CardDescription className="mt-1">
                Real-time 2-way audio &amp; video call between <strong>Contractor (Site)</strong> and <strong>Engineer</strong>.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Logged in as:</span>
              <Badge variant="secondary" className="capitalize flex items-center gap-1">
                {isContractor ? <HardHat className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                {currentUserName} ({currentUserRole})
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Main View Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Video Screen */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="overflow-hidden bg-slate-950 text-white relative rounded-2xl shadow-lg border-slate-800">
            <div className="relative aspect-video w-full flex items-center justify-center bg-slate-900">

              {/* ── Contractor side: local camera preview + audio element to hear engineer ── */}
              {isContractor && (
                <>
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${!isStreaming ? "hidden" : ""}`}
                  />
                  {/*
                    Hidden audio element:
                    - srcObject is set to remoteEngineerStream when engineer connects
                    - This is how contractor HEARS the engineer's voice
                  */}
                  <audio ref={contractorAudioRef} autoPlay playsInline className="hidden" />
                </>
              )}

              {/* ── Engineer side: remote video + audio from contractor ── */}
              {isEngineer && (
                /*
                  This video element carries BOTH contractor's video AND audio.
                  remoteVideoRef.muted = false ensures contractor voice plays.
                */
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className={`w-full h-full object-cover ${!isViewing ? "hidden" : ""}`}
                />
              )}

              {/* Placeholder when idle */}
              {((isContractor && !isStreaming) || (isEngineer && !isViewing)) && (
                <div className="flex flex-col items-center justify-center p-8 text-center space-y-3">
                  <div className="h-16 w-16 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                    <Video className="h-8 w-8" />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-slate-200">
                      {isContractor ? "Ready to broadcast site camera" : "Waiting for contractor's site feed"}
                    </p>
                    <p className="text-xs text-slate-400 max-w-sm mt-1">
                      {isContractor
                        ? "Click 'Start Site Camera' to stream live video & audio to the engineer."
                        : "Click 'Connect to Site Camera' to join the call. Your mic will be activated for 2-way communication."}
                    </p>
                  </div>
                  {isEngineer && (
                    <Button
                      onClick={connectToSiteFeed}
                      disabled={!peerReady}
                      className="mt-2 gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Eye className="h-4 w-4" />
                      Connect to Site Camera
                    </Button>
                  )}
                  {isContractor && (
                    <Button
                      onClick={startBroadcasting}
                      disabled={!peerReady}
                      className="mt-2 gap-2 bg-red-600 hover:bg-red-700 text-white"
                    >
                      <Video className="h-4 w-4" />
                      Start Site Camera
                    </Button>
                  )}
                </div>
              )}

              {/* Overlay Badges */}
              {(isStreaming || isViewing) && (
                <div className="absolute top-4 left-4 flex flex-wrap items-center gap-2 z-10">
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-600/90 text-white text-xs font-bold animate-pulse">
                    <span className="h-2 w-2 rounded-full bg-white" />
                    LIVE
                  </div>
                  <div className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-xs font-medium">
                    {project.name}
                  </div>

                  {/* Engineer: show contractor voice status */}
                  {isEngineer && isViewing && (
                    <div className={`px-3 py-1 rounded-full backdrop-blur-md text-xs font-semibold flex items-center gap-1.5 ${isEngineerAudioMuted ? "bg-red-600/80 text-white" : "bg-emerald-600/90 text-white"}`}>
                      {isEngineerAudioMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                      <span>{isEngineerAudioMuted ? "Contractor Voice: Muted" : "Contractor Voice: Active 🔊"}</span>
                    </div>
                  )}

                  {/* Engineer: show own mic status */}
                  {isEngineer && isViewing && isEngineerMicActive && (
                    <div className={`px-3 py-1 rounded-full backdrop-blur-md text-xs font-semibold flex items-center gap-1.5 ${isEngineerMicMuted ? "bg-red-600/80 text-white" : "bg-blue-600/90 text-white"}`}>
                      {isEngineerMicMuted ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                      <span>{isEngineerMicMuted ? "Your Mic: Off" : "Your Mic: Live 🎙️"}</span>
                    </div>
                  )}

                  {/* Contractor: show own mic status */}
                  {isContractor && isStreaming && (
                    <div className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-xs font-medium flex items-center gap-1.5">
                      {isMuted
                        ? <span className="text-red-400 flex items-center gap-1"><MicOff className="h-3.5 w-3.5" /> Mic Muted</span>
                        : <span className="text-emerald-400 flex items-center gap-1"><Mic className="h-3.5 w-3.5" /> Your Mic: Live 🎙️</span>
                      }
                    </div>
                  )}

                  {/* Contractor: show engineer voice status */}
                  {isContractor && isStreaming && activeViewersCount > 0 && (
                    <div className={`px-3 py-1 rounded-full backdrop-blur-md text-xs font-semibold flex items-center gap-1.5 ${isContractorSpeakerMuted ? "bg-red-600/80 text-white" : "bg-emerald-600/90 text-white"}`}>
                      {isContractorSpeakerMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                      <span>{isContractorSpeakerMuted ? "Engineer Voice: Muted" : "Engineer Voice: Active 🔊"}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Engineer: click-to-unlock audio (browser autoplay policy) */}
              {needsAudioUnlock && isEngineer && (
                <button
                  onClick={() => {
                    if (remoteVideoRef.current) {
                      remoteVideoRef.current.muted = false;
                      remoteVideoRef.current.play();
                      setNeedsAudioUnlock(false);
                    }
                  }}
                  className="absolute bottom-6 left-4 z-20 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-2xl animate-bounce cursor-pointer"
                >
                  <Volume2 className="h-4 w-4" /> Tap to hear Contractor Voice
                </button>
              )}

              {/* Contractor: click-to-unlock engineer audio (browser autoplay policy) */}
              {needsContractorAudioUnlock && isContractor && (
                <button
                  onClick={() => {
                    if (contractorAudioRef.current) {
                      contractorAudioRef.current.muted = false;
                      contractorAudioRef.current.play();
                      setNeedsContractorAudioUnlock(false);
                    }
                  }}
                  className="absolute bottom-6 left-4 z-20 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-2xl animate-bounce cursor-pointer"
                >
                  <Volume2 className="h-4 w-4" /> Tap to hear Engineer Voice
                </button>
              )}

              {/* Contractor: active viewer count */}
              {isContractor && isStreaming && (
                <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-xs flex items-center gap-1.5 z-10">
                  <Eye className="h-3.5 w-3.5 text-blue-400" />
                  {activeViewersCount} Viewer{activeViewersCount !== 1 ? "s" : ""}
                </div>
              )}
            </div>

            {/* Video Controls Bar */}
            <div className="p-4 bg-slate-900 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-400 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>{connectionStatus}</span>
              </div>

              {/* ── Contractor Controls ── */}
              {isContractor && isStreaming && (
                <div className="flex flex-wrap items-center gap-2">
                  {/* Flip camera */}
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
                    onClick={flipCamera}
                    title="Switch camera"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>

                  {/* Toggle contractor mic (engineer hears contractor) */}
                  <Button
                    size="sm"
                    variant="outline"
                    className={`border-slate-700 ${isMuted ? "bg-red-950 text-red-400" : "bg-emerald-950 text-emerald-300"}`}
                    onClick={toggleMute}
                    title={isMuted ? "Unmute your mic" : "Mute your mic"}
                  >
                    {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    <span className="text-xs ml-1.5">{isMuted ? "Mic Off" : "Mic (Live)"}</span>
                  </Button>

                  {/* Toggle video */}
                  <Button
                    size="sm"
                    variant="outline"
                    className={`border-slate-700 ${isVideoMuted ? "bg-red-950 text-red-400" : "bg-slate-800 text-slate-200"}`}
                    onClick={toggleVideo}
                    title={isVideoMuted ? "Turn Video On" : "Turn Video Off"}
                  >
                    {isVideoMuted ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
                  </Button>

                  {/* Hear engineer (contractor speaker toggle) */}
                  <Button
                    size="sm"
                    variant="outline"
                    className={`border-slate-700 ${isContractorSpeakerMuted ? "bg-red-950 text-red-400" : "bg-blue-950 text-blue-300"}`}
                    onClick={toggleContractorSpeaker}
                    title={isContractorSpeakerMuted ? "Unmute engineer voice" : "Mute engineer voice"}
                  >
                    {isContractorSpeakerMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    <span className="text-xs ml-1.5">{isContractorSpeakerMuted ? "Eng. Voice Off" : "Eng. Voice (On)"}</span>
                  </Button>

                  {/* End call */}
                  <Button size="sm" variant="destructive" className="gap-1.5" onClick={stopBroadcasting}>
                    <PhoneOff className="h-4 w-4" />
                    End Call
                  </Button>
                </div>
              )}

              {/* ── Engineer Controls ── */}
              {isEngineer && isViewing && (
                <div className="flex flex-wrap items-center gap-2">
                  {/* Hear contractor (speaker toggle on video element) */}
                  <Button
                    size="sm"
                    variant="outline"
                    className={`border-slate-700 ${isEngineerAudioMuted ? "bg-red-950 text-red-400" : "bg-emerald-950 text-emerald-300"}`}
                    onClick={toggleEngineerAudio}
                    title={isEngineerAudioMuted ? "Unmute contractor voice" : "Mute contractor voice"}
                  >
                    {isEngineerAudioMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    <span className="text-xs ml-1.5">
                      {isEngineerAudioMuted ? "Contractor Muted" : "Contractor Audio (On)"}
                    </span>
                  </Button>

                  {/* Engineer mic toggle (contractor hears engineer) */}
                  {isEngineerMicActive && (
                    <Button
                      size="sm"
                      variant="outline"
                      className={`border-slate-700 ${isEngineerMicMuted ? "bg-red-950 text-red-400" : "bg-blue-950 text-blue-300"}`}
                      onClick={toggleEngineerMic}
                      title={isEngineerMicMuted ? "Unmute your mic" : "Mute your mic"}
                    >
                      {isEngineerMicMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                      <span className="text-xs ml-1.5">
                        {isEngineerMicMuted ? "Your Mic Off" : "Your Mic (Live)"}
                      </span>
                    </Button>
                  )}

                  {/* Disconnect */}
                  <Button size="sm" variant="destructive" className="gap-1.5" onClick={disconnectSiteFeed}>
                    <PhoneOff className="h-4 w-4" />
                    Disconnect
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Sidebar Info & Status */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <HardHat className="h-4 w-4 text-amber-500" />
                Live Inspection Protocol
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs text-muted-foreground">
              <div className="p-3 bg-muted/50 rounded-lg space-y-1">
                <p className="font-semibold text-foreground">Who broadcasts?</p>
                <p>The <strong>Contractor</strong> on the construction site uses their phone/tablet camera to show structural progress, concrete pouring, or issues.</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg space-y-1">
                <p className="font-semibold text-foreground">Who views?</p>
                <p>The <strong>Engineer</strong> or <strong>Admin</strong> watches the real-time video feed remotely to verify quality, resolve issues, or approve site work without traveling.</p>
              </div>
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg space-y-1">
                <p className="font-semibold text-foreground">🎙️ 2-Way Audio</p>
                <p>Both <strong>Contractor</strong> and <strong>Engineer</strong> can speak and hear each other in real time — just like a phone call with live video.</p>
              </div>
              <div className="border-t pt-2 space-y-2">
                <p className="font-medium text-foreground">Channel ID:</p>
                <code className="text-[11px] bg-muted px-2 py-1 rounded block truncate">
                  {broadcasterPeerId}
                </code>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <PhoneCall className="h-4 w-4 text-primary" />
                Connection Guidelines
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-muted-foreground">
              <div className="flex items-start gap-2">
                <span className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold">1</span>
                <span>Contractor opens this tab on mobile at the site and clicks <strong>Start Site Camera</strong>.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold">2</span>
                <span>Engineer clicks <strong>Connect to Site Camera</strong> — browser asks for mic permission for 2-way audio.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold">3</span>
                <span>Peer-to-peer WebRTC connection establishes with <strong>full 2-way audio + video</strong> at zero server cost.</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
