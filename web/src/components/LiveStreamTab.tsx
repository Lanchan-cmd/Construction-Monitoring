import { useState, useEffect, useRef } from "react";
import Peer from "peerjs";
import type { MediaConnection } from "peerjs";
import {
  Video, VideoOff, Mic, MicOff, PhoneCall, PhoneOff, Radio, Eye,
  ShieldAlert, RefreshCw, AlertCircle, HardHat, UserCheck, Volume2, VolumeX,
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
  // Is this user a contractor (broadcaster)?
  const isContractor =
    currentUserRole === "contractor" ||
    (project.contractor_id && project.contractor_id === currentUserId);

  // Is this user an engineer or admin (viewer)?
  const isEngineer =
    currentUserRole === "engineer" ||
    currentUserRole === "admin" ||
    (project.engineer_id && project.engineer_id === currentUserId);

  // Broadcaster peer ID deterministic by project
  const broadcasterPeerId = `nirman-${project.id.replace(/-/g, "").slice(0, 18)}-site`;

  // State
  const [peer, setPeer] = useState<Peer | null>(null);
  const [peerReady, setPeerReady] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isViewing, setIsViewing] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<"environment" | "user">("environment");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isEngineerAudioMuted, setIsEngineerAudioMuted] = useState(false);
  const [isEngineerMicMuted, setIsEngineerMicMuted] = useState(false);
  const [isContractorSpeakerMuted, setIsContractorSpeakerMuted] = useState(false);
  const [isEngineerMicActive, setIsEngineerMicActive] = useState(false);
  const [needsAudioUnlock, setNeedsAudioUnlock] = useState(false);
  const [activeViewersCount, setActiveViewersCount] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<string>("Idle");

  // Video and audio refs
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const contractorAudioRef = useRef<HTMLAudioElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const engineerMicStreamRef = useRef<MediaStream | null>(null);
  const outgoingCallsRef = useRef<MediaConnection[]>([]);
  const incomingCallRef = useRef<MediaConnection | null>(null);

  // 1. Initialize PeerJS connection based on role
  useEffect(() => {
    let p: Peer;
    setConnectionStatus("Connecting to signaling network...");

    if (isContractor) {
      // Broadcaster uses a fixed, well-known ID for this project
      p = new Peer(broadcasterPeerId, {
        config: {
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:global.stun.twilio.com:3478" },
          ],
        },
      });
    } else {
      // Engineer / viewer uses random peer ID
      p = new Peer({
        config: {
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:global.stun.twilio.com:3478" },
          ],
        },
      });
    }

    p.on("open", () => {
      setPeerReady(true);
      setConnectionStatus("Signaling ready");
    });

    p.on("error", (err: unknown) => {
      const errorMsg = (err as { type?: string; message?: string })?.message || "Peer connection error";
      const errorType = (err as { type?: string })?.type;
      
      // If another contractor session is active on same ID:
      if (errorType === "unavailable-id") {
        setConnectionStatus("Site stream channel already reserved / active");
      } else {
        setConnectionStatus(`Network: ${errorMsg}`);
      }
    });

    // When an engineer calls the contractor to request the live feed
    if (isContractor) {
      p.on("call", (call) => {
        if (!localStreamRef.current) {
          call.close();
          return;
        }

        // Answer call with contractor's live camera & mic stream
        call.answer(localStreamRef.current);
        outgoingCallsRef.current.push(call);
        setActiveViewersCount((c) => c + 1);

        // Receive engineer's incoming microphone stream so contractor can hear engineer!
        call.on("stream", (remoteEngineerStream) => {
          if (contractorAudioRef.current) {
            contractorAudioRef.current.srcObject = remoteEngineerStream;
            contractorAudioRef.current.muted = false;
            contractorAudioRef.current.volume = 1.0;
            contractorAudioRef.current.play().catch((err) => {
              console.warn("Could not autoplay engineer voice on contractor device:", err);
            });
          }
        });

        call.on("close", () => {
          outgoingCallsRef.current = outgoingCallsRef.current.filter((c) => c !== call);
          setActiveViewersCount((c) => Math.max(0, c - 1));
          if (contractorAudioRef.current) {
            contractorAudioRef.current.srcObject = null;
          }
        });

        toast.info("Engineer joined with 2-way audio! You can now talk to each other.");
      });
    }

    setPeer(p);

    return () => {
      // Clean up peer & calls on unmount
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
  }, [project.id, isContractor]);

  // Stop local camera stream
  const stopLocalStream = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
  };

  // Start contractor live camera broadcast
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

  // Stop contractor broadcast
  const stopBroadcasting = () => {
    outgoingCallsRef.current.forEach((c) => c.close());
    outgoingCallsRef.current = [];
    stopLocalStream();
    setIsStreaming(false);
    setActiveViewersCount(0);
    setConnectionStatus("Broadcast ended");
    toast.info("Live stream ended");
  };

  // Toggle camera direction (front / back on mobile)
  const flipCamera = async () => {
    if (!isStreaming) return;
    const newFacing = cameraFacing === "environment" ? "user" : "environment";
    setCameraFacing(newFacing);

    try {
      stopLocalStream();
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      if (isMuted) {
        newStream.getAudioTracks().forEach((t) => (t.enabled = false));
      }

      localStreamRef.current = newStream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = newStream;
      }

      // Replace both video and audio tracks in active viewer calls
      const newVideoTrack = newStream.getVideoTracks()[0];
      const newAudioTrack = newStream.getAudioTracks()[0];
      outgoingCallsRef.current.forEach((call) => {
        const senders = call.peerConnection?.getSenders();
        const videoSender = senders?.find((s) => s.track?.kind === "video");
        if (videoSender && newVideoTrack) {
          videoSender.replaceTrack(newVideoTrack);
        }
        const audioSender = senders?.find((s) => s.track?.kind === "audio");
        if (audioSender && newAudioTrack) {
          audioSender.replaceTrack(newAudioTrack);
        }
      });
      toast.success(`Switched to ${newFacing === "environment" ? "back" : "front"} camera`);
    } catch (e: unknown) {
      toast.error("Failed to switch camera");
    }
  };

  // Engineer connects to watch contractor's stream and talk via microphone
  const connectToSiteFeed = async () => {
    if (!peer) {
      toast.error("Signaling peer not ready");
      return;
    }

    setConnectionStatus("Activating microphone & connecting to site...");

    // Create a dummy video track (receive-only video from engineer)
    const canvas = document.createElement("canvas");
    canvas.width = 2;
    canvas.height = 2;
    const dummyVideoTrack = canvas.captureStream(1).getVideoTracks()[0];
    const tracks: MediaStreamTrack[] = [dummyVideoTrack];

    // Request Engineer's microphone for 2-way communication!
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
      console.warn("Engineer microphone denied or unavailable, falling back to silent audio:", micErr);
      // Fallback: dummy silent audio track so WebRTC still negotiates audio to hear contractor
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const osc = ctx.createOscillator();
          const dst = ctx.createMediaStreamDestination();
          osc.connect(dst);
          osc.start();
          const dummyAudioTrack = dst.stream.getAudioTracks()[0];
          if (dummyAudioTrack) {
            dummyAudioTrack.enabled = false;
            tracks.push(dummyAudioTrack);
          }
        }
      } catch (e) {
        console.warn("Could not create dummy audio track:", e);
      }
    }

    const engineerStream = new MediaStream(tracks);
    const call = peer.call(broadcasterPeerId, engineerStream);
    incomingCallRef.current = call;

    call.on("stream", (remoteStream) => {
      setIsViewing(true);
      setConnectionStatus("Connected — 2-Way Live Communication");
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
        remoteVideoRef.current.muted = false;
        remoteVideoRef.current.volume = 1.0;
        
        const playPromise = remoteVideoRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            console.warn("Autoplay with sound needs user gesture:", err);
            setNeedsAudioUnlock(true);
          });
        }
      }
      toast.success("Connected! 2-way voice is active — you can both talk and hear each other.");
    });

    call.on("close", () => {
      setIsViewing(false);
      setConnectionStatus("Site stream ended or contractor disconnected");
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
      toast.info("Site camera session ended");
    });

    call.on("error", () => {
      setIsViewing(false);
      setConnectionStatus("Failed to reach contractor camera");
      toast.error("Contractor has not started the live camera yet.");
    });
  };

  const disconnectSiteFeed = () => {
    if (incomingCallRef.current) {
      incomingCallRef.current.close();
      incomingCallRef.current = null;
    }
    if (engineerMicStreamRef.current) {
      engineerMicStreamRef.current.getTracks().forEach((t) => t.stop());
      engineerMicStreamRef.current = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    setIsViewing(false);
    setIsEngineerMicActive(false);
    setIsEngineerMicMuted(false);
    setNeedsAudioUnlock(false);
    setConnectionStatus("Disconnected");
  };

  const toggleEngineerAudio = () => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = !remoteVideoRef.current.muted;
      setIsEngineerAudioMuted(remoteVideoRef.current.muted);
    }
  };

  const toggleEngineerMic = () => {
    if (engineerMicStreamRef.current) {
      const audioTrack = engineerMicStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsEngineerMicMuted(!audioTrack.enabled);
        toast.info(audioTrack.enabled ? "Your microphone unmuted (Contractor can hear you)" : "Your microphone muted");
      }
    }
  };

  const toggleContractorSpeaker = () => {
    if (contractorAudioRef.current) {
      contractorAudioRef.current.muted = !contractorAudioRef.current.muted;
      setIsContractorSpeakerMuted(contractorAudioRef.current.muted);
    }
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoMuted(!videoTrack.enabled);
      }
    }
  };

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
                Direct camera call from <strong>Contractor (Site)</strong> to <strong>Engineer</strong> for real-time site inspection.
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
        {/* Video Screen (Main 2 columns) */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="overflow-hidden bg-slate-950 text-white relative rounded-2xl shadow-lg border-slate-800">
            <div className="relative aspect-video w-full flex items-center justify-center bg-slate-900">
              {/* Contractor's local camera preview */}
              {isContractor && (
                <>
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${!isStreaming ? "hidden" : ""}`}
                  />
                  {/* Hidden audio element so contractor can hear engineer's voice */}
                  <audio ref={contractorAudioRef} autoPlay playsInline className="hidden" />
                </>
              )}


              {/* Engineer's remote video feed */}
              {isEngineer && (
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className={`w-full h-full object-cover ${!isViewing ? "hidden" : ""}`}
                />
              )}

              {/* Placeholder when not streaming or viewing */}
              {((isContractor && !isStreaming) || (isEngineer && !isViewing)) && (
                <div className="flex flex-col items-center justify-center p-8 text-center space-y-3">
                  <div className="h-16 w-16 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                    <Video className="h-8 w-8" />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-slate-200">
                      {isContractor
                        ? "Ready to broadcast site camera"
                        : "Waiting for contractor's site feed"}
                    </p>
                    <p className="text-xs text-slate-400 max-w-sm mt-1">
                      {isContractor
                        ? "Click 'Start Site Camera' to open your device camera and stream live video to the engineer."
                        : "Click 'Connect to Site Camera' to view what the contractor is streaming from the construction site."}
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
                  {isEngineer && isViewing && (
                    <div className={`px-3 py-1 rounded-full backdrop-blur-md text-xs font-semibold flex items-center gap-1.5 ${isEngineerAudioMuted ? "bg-red-600/80 text-white" : "bg-emerald-600/90 text-white"}`}>
                      {isEngineerAudioMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                      <span>{isEngineerAudioMuted ? "Contractor Voice: Muted" : "Contractor Voice: Active 🔊"}</span>
                    </div>
                  )}
                  {isContractor && isStreaming && (
                    <div className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-xs font-medium flex items-center gap-1.5">
                      {isMuted ? (
                        <span className="text-red-400 flex items-center gap-1"><MicOff className="h-3.5 w-3.5" /> Mic Muted</span>
                      ) : (
                        <span className="text-emerald-400 flex items-center gap-1"><Mic className="h-3.5 w-3.5" /> Mic Transmitting (Voice Sending)</span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Autoplay unlock prompt if browser requires click to unmute */}
              {needsAudioUnlock && (
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
                  <Volume2 className="h-4 w-4" /> Click to hear Contractor Voice
                </button>
              )}

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

              {/* Contractor Controls */}
              {isContractor && isStreaming && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
                    onClick={flipCamera}
                    title="Switch camera"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className={`border-slate-700 ${isMuted ? "bg-red-950 text-red-400" : "bg-slate-800 text-slate-200"}`}
                    onClick={toggleMute}
                    title={isMuted ? "Unmute Mic" : "Mute Mic"}
                  >
                    {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className={`border-slate-700 ${isVideoMuted ? "bg-red-950 text-red-400" : "bg-slate-800 text-slate-200"}`}
                    onClick={toggleVideo}
                    title={isVideoMuted ? "Turn Video On" : "Turn Video Off"}
                  >
                    {isVideoMuted ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className={`border-slate-700 ${isContractorSpeakerMuted ? "bg-red-950 text-red-400" : "bg-emerald-950 text-emerald-300"}`}
                    onClick={toggleContractorSpeaker}
                    title={isContractorSpeakerMuted ? "Unmute engineer voice" : "Mute engineer voice"}
                  >
                    {isContractorSpeakerMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    <span className="text-xs ml-1.5">
                      {isContractorSpeakerMuted ? "Eng. Voice Off" : "Eng. Voice (On)"}
                    </span>
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="gap-1.5"
                    onClick={stopBroadcasting}
                  >
                    <PhoneOff className="h-4 w-4" />
                    End Call
                  </Button>
                </div>
              )}

              {/* Engineer Controls */}
              {isEngineer && isViewing && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className={`border-slate-700 ${isEngineerAudioMuted ? "bg-red-950 text-red-400 hover:bg-red-900" : "bg-emerald-950 text-emerald-300 hover:bg-emerald-900"}`}
                    onClick={toggleEngineerAudio}
                    title={isEngineerAudioMuted ? "Unmute contractor voice" : "Mute contractor voice"}
                  >
                    {isEngineerAudioMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    <span className="text-xs ml-1.5">
                      {isEngineerAudioMuted ? "Contractor Muted" : "Contractor Audio (On)"}
                    </span>
                  </Button>
                  {isEngineerMicActive && (
                    <Button
                      size="sm"
                      variant="outline"
                      className={`border-slate-700 ${isEngineerMicMuted ? "bg-red-950 text-red-400" : "bg-slate-800 text-slate-200"}`}
                      onClick={toggleEngineerMic}
                      title={isEngineerMicMuted ? "Unmute your mic (contractor can't hear you)" : "Mute your mic"}
                    >
                      {isEngineerMicMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                      <span className="text-xs ml-1.5">
                        {isEngineerMicMuted ? "Your Mic Off" : "Your Mic (Live)"}
                      </span>
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    className="gap-1.5"
                    onClick={disconnectSiteFeed}
                  >
                    <PhoneOff className="h-4 w-4" />
                    Disconnect
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Sidebar Info & Status (1 column) */}
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
                <span>Engineer opens this project on their computer or phone and clicks <strong>Connect to Site Camera</strong>.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold">3</span>
                <span>Peer-to-peer WebRTC video stream establishes directly with zero server fees.</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

