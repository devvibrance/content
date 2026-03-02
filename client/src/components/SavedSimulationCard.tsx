import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle, Repeat2, Heart, Share, Bookmark, User, Send, MoreHorizontal, Play, X, Sparkles, Music } from "lucide-react";
import type { SavedSimulation } from "@/lib/indexedDB";
import { cn } from "@/lib/utils";

interface SavedSimulationCardProps {
  simulation: SavedSimulation;
  onDelete: (id: string) => void;
  currentProfilePic?: string | null;
}

function renderTextWithMentions(text: string, isTwitter: boolean = true) {
  if (!text) return null;
  const parts = text.split(/(@[\w.]+|#[\w]+|https?:\/\/[^\s]+|(?:[\w-]+\.)+[a-z]{2,}(?:\/[^\s]*)?)/gi);
  return parts.map((part, index) => {
    if (part.match(/^@[\w.]+$/) || part.match(/^#[\w]+$/) || part.match(/^https?:\/\//) || part.match(/\.[a-z]{2,}(?:\/|$)/i)) {
      return <span key={index} className={isTwitter ? "text-[#1d9bf0]" : "text-[#0095f6]"}>{part}</span>;
    }
    return part;
  });
}

export function SavedSimulationCard({ simulation, onDelete, currentProfilePic }: SavedSimulationCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const navigate = useNavigate();
  const profilePic = currentProfilePic !== undefined ? currentProfilePic : simulation.profilePic;

  const handleLoadToSimulator = () => {
    sessionStorage.setItem("loadToSimulator", JSON.stringify({
      type: "simulation",
      data: simulation,
    }));
    navigate("/simulator");
  };

  const handleVideoClick = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
    }
  };

  const displayHandle = simulation.profileHandle?.startsWith("@") 
    ? simulation.profileHandle 
    : `@${simulation.profileHandle || "yourhandle"}`;
  const displayHandleNoAt = simulation.profileHandle?.replace("@", "") || "yourhandle";

  const getDimensionsAspectRatio = () => {
    switch (simulation.dimensions) {
      case "9:16": return "9/16";
      case "4:5": return "4/5";
      case "1:1": return "1/1";
      case "1.91:1": return "1.91/1";
      case "1440x1880": return "1440/1880";
      default: return "9/16";
    }
  };

  const getAspectRatioStyle = () => {
    // Prefer natural media dimensions for accurate display
    if (simulation.mediaWidth && simulation.mediaHeight) {
      return {
        aspectRatio: `${simulation.mediaWidth}/${simulation.mediaHeight}`,
        width: '100%'
      };
    }
    // Fallback to dimensions setting
    return {
      aspectRatio: getDimensionsAspectRatio(),
      width: '100%'
    };
  };

  if (simulation.previewType === "twitter") {
    return (
      <div className="relative group" data-testid={`saved-simulation-${simulation.id}`}>
        <div
          className={cn(
            "absolute top-2 right-2 flex items-center gap-1 bg-black/50 backdrop-blur-xl rounded-full px-1.5 py-1 transition-opacity z-10",
            "opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto"
          )}
        >
          <button
            className="rounded-full bg-transparent text-white hover:text-blue-400 p-1 transition"
            title="Edit"
            onClick={(e) => {
              e.stopPropagation();
              handleLoadToSimulator();
            }}
            data-testid={`button-load-simulation-${simulation.id}`}
          >
            <Sparkles className="w-3.5 h-3.5" fill="currentColor" />
          </button>
          <button
            className="rounded-full bg-transparent text-white hover:text-red-400 p-1 transition"
            title="Remove"
            onClick={() => onDelete(simulation.id)}
            data-testid={`button-delete-simulation-${simulation.id}`}
          >
            <X className="w-3.5 h-3.5" strokeWidth={2.5} />
          </button>
        </div>
        <div className="w-full bg-black rounded-2xl px-4 py-3" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              {profilePic ? (
                <img
                  src={profilePic}
                  alt="Profile"
                  className={`w-10 h-10 object-cover ${simulation.isOrganization ? 'rounded-[4px]' : 'rounded-full'}`}
                />
              ) : (
                <div className={`w-10 h-10 bg-white/10 flex items-center justify-center ${simulation.isOrganization ? 'rounded-[4px]' : 'rounded-full'}`}>
                  <User className="w-5 h-5 text-white/40" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 flex-wrap">
                <span className="font-bold text-[15px] text-white">
                  {simulation.profileUsername}
                </span>
                {simulation.isVerified && (
                  simulation.isOrganization ? (
                    <svg viewBox="0 0 22 22" className="w-[18px] h-[18px] flex-shrink-0">
                      <defs>
                        <linearGradient id={`goldGradient-${simulation.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#F5D547" />
                          <stop offset="100%" stopColor="#D4A017" />
                        </linearGradient>
                      </defs>
                      <path fill={`url(#goldGradient-${simulation.id})`} d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681.132-.637.075-1.299-.165-1.903.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816z" />
                      <path fill="#000" d="M9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 22 22" className="w-[18px] h-[18px] text-[#1d9bf0] flex-shrink-0" fill="currentColor">
                      <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z"></path>
                    </svg>
                  )
                )}
                <span className="text-[15px] text-[#71767b]">{displayHandle}</span>
                <span className="text-[15px] text-[#71767b]">·</span>
                <span className="text-[15px] text-[#71767b]">Dec 11</span>
              </div>

              <div className="text-white text-[15px] leading-[20px] mt-1 mb-3 whitespace-pre-wrap break-words [word-break:break-word]">
                {simulation.text ? renderTextWithMentions(simulation.text, true) : ""}
              </div>

              {simulation.mediaData && (simulation.mediaType === "image" || simulation.mediaType === "gif") && (
                <div className="mb-3 rounded-2xl overflow-hidden">
                  <img src={simulation.mediaData} alt="Tweet media" className="w-full h-auto" />
                </div>
              )}
              {simulation.mediaData && simulation.mediaType === "video" && (
                <div className="mb-3 rounded-2xl overflow-hidden cursor-pointer" onClick={handleVideoClick}>
                  <video
                    ref={videoRef}
                    src={simulation.mediaData}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-auto"
                  />
                </div>
              )}

              <div className="flex items-center justify-between w-full mt-3">
                <button className="flex items-center gap-1.5 text-[#71767b]">
                  <MessageCircle className="w-[18px] h-[18px]" />
                  <span className="text-[13px]">50</span>
                </button>
                <button className="flex items-center gap-1.5 text-[#71767b]">
                  <Repeat2 className="w-[18px] h-[18px]" />
                  <span className="text-[13px]">532</span>
                </button>
                <button className="flex items-center gap-1.5 text-[#71767b]">
                  <Heart className="w-[18px] h-[18px]" />
                  <span className="text-[13px]">1.9K</span>
                </button>
                <button className="flex items-center gap-1 text-[#71767b]">
                  <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="currentColor">
                    <path d="M8.75 21V3h2v18h-2zM18 21V8.5h2V21h-2zM4 21l.004-10h2L6 21H4zm9.248 0v-7h2v7h-2z" />
                  </svg>
                  <span className="text-[13px]">126K</span>
                </button>
                <div className="flex items-center gap-1">
                  <button className="flex items-center text-[#71767b]">
                    <Bookmark className="w-[18px] h-[18px]" />
                  </button>
                  <button className="flex items-center text-[#71767b]">
                    <Share className="w-[18px] h-[18px]" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (simulation.previewType === "ig-feed") {
    return (
      <div className="relative group" data-testid={`saved-simulation-${simulation.id}`}>
        <div
          className={cn(
            "absolute top-2 right-2 flex items-center gap-1 bg-black/50 backdrop-blur-xl rounded-full px-1.5 py-1 transition-opacity z-10",
            "opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto"
          )}
        >
          <button
            className="rounded-full bg-transparent text-white hover:text-blue-400 p-1 transition"
            title="Edit"
            onClick={(e) => {
              e.stopPropagation();
              handleLoadToSimulator();
            }}
            data-testid={`button-load-simulation-${simulation.id}`}
          >
            <Sparkles className="w-3.5 h-3.5" fill="currentColor" />
          </button>
          <button
            className="rounded-full bg-transparent text-white hover:text-red-400 p-1 transition"
            title="Remove"
            onClick={() => onDelete(simulation.id)}
            data-testid={`button-delete-simulation-${simulation.id}`}
          >
            <X className="w-3.5 h-3.5" strokeWidth={2.5} />
          </button>
        </div>
        <div className="w-full bg-black rounded-lg overflow-hidden" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
          <div className="flex items-center justify-between p-3">
            <div className="flex items-center gap-3">
              {simulation.isOrganization ? (
                profilePic ? (
                  <img src={profilePic} alt="Profile" className="w-8 h-8 rounded-[4px] object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-[4px] bg-white/10 flex items-center justify-center">
                    <User className="w-4 h-4 text-white/40" />
                  </div>
                )
              ) : (
                <div 
                  className="w-9 h-9 rounded-full p-[2px] flex-shrink-0"
                  style={{ background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)' }}
                >
                  {profilePic ? (
                    <img src={profilePic} alt="Profile" className="w-full h-full rounded-full object-cover border-2 border-black" />
                  ) : (
                    <div className="w-full h-full rounded-full bg-black flex items-center justify-center border-2 border-black">
                      <User className="w-4 h-4 text-white/40" />
                    </div>
                  )}
                </div>
              )}
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-white">{displayHandleNoAt}</span>
                  {simulation.isInstagramVerified && (
                    simulation.isOrganization ? (
                      <svg viewBox="0 0 22 22" className="w-5 h-5">
                        <defs>
                          <linearGradient id={`igFeedGold-${simulation.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#F5D547" />
                            <stop offset="100%" stopColor="#D4A017" />
                          </linearGradient>
                        </defs>
                        <path fill={`url(#igFeedGold-${simulation.id})`} d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816z" />
                        <path fill="#000" d="M9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 22 22" className="w-5 h-5 text-[#1d9bf0]" fill="currentColor">
                        <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z"></path>
                      </svg>
                    )
                  )}
                  {simulation.isCollab && <span className="text-sm font-semibold text-white">and 2 others</span>}
                </div>
                <span className="text-xs text-white">2 hours ago</span>
              </div>
            </div>
            <MoreHorizontal className="w-5 h-5 text-white" />
          </div>

          {simulation.mediaData ? (
            <div className="w-full bg-black cursor-pointer" style={getAspectRatioStyle()} onClick={handleVideoClick}>
              {(simulation.mediaType === "image" || simulation.mediaType === "gif") && (
                <img src={simulation.mediaData} alt="Post" className="w-full h-full object-cover" />
              )}
              {simulation.mediaType === "video" && (
                <video ref={videoRef} src={simulation.mediaData} autoPlay loop muted playsInline className="w-full h-full object-cover" />
              )}
            </div>
          ) : (
            <div className="w-full aspect-square bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
              <div className="text-center text-white/40">
                <Play className="w-16 h-16 mb-2 mx-auto" />
                <p className="text-sm">No Media</p>
              </div>
            </div>
          )}

          <div className="p-3 pb-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button className="flex items-center gap-1.5 text-white">
                  <Heart className="w-6 h-6" />
                  <span className="text-sm font-semibold">1,234</span>
                </button>
                <button className="flex items-center gap-1.5 text-white">
                  <MessageCircle className="w-6 h-6" style={{ transform: 'scaleX(-1)' }} />
                  <span className="text-sm font-semibold">342</span>
                </button>
                <button className="flex items-center gap-1.5 text-white">
                  <Repeat2 className="w-6 h-6" />
                  <span className="text-sm font-semibold">1.2K</span>
                </button>
                <button className="flex items-center gap-1.5 text-white">
                  <Send className="w-5 h-5" />
                  <span className="text-sm font-semibold">89</span>
                </button>
              </div>
              <button className="text-white">
                <Bookmark className="w-6 h-6" />
              </button>
            </div>

            <div 
              className={`text-sm text-white ${simulation.text && simulation.text.includes('\n') ? 'cursor-pointer' : ''}`}
              onClick={simulation.text && simulation.text.includes('\n') ? () => setIsExpanded(!isExpanded) : undefined}
            >
              <span className="font-semibold">{displayHandleNoAt}</span>{" "}
              {simulation.text ? (
                simulation.text.includes('\n') ? (
                  <>
                    <span style={{ display: isExpanded ? 'none' : 'inline' }} className="whitespace-pre-wrap break-words">
                      {renderTextWithMentions(simulation.text.split('\n')[0], false)}
                      <span className="opacity-50 ml-1">...</span>
                      <span className="text-white/40 ml-1">more</span>
                    </span>
                    <span 
                      className="whitespace-pre-wrap break-words"
                      style={{ 
                        opacity: isExpanded ? 1 : 0,
                        display: isExpanded ? 'inline' : 'none'
                      }}
                    >
                      {renderTextWithMentions(simulation.text, false)}
                    </span>
                  </>
                ) : (
                  <span className="whitespace-pre-wrap break-words">{renderTextWithMentions(simulation.text, false)}</span>
                )
              ) : null}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (simulation.previewType === "ig-reel") {
    return (
      <div className="relative group" data-testid={`saved-simulation-${simulation.id}`}>
        <div
          className={cn(
            "absolute top-2 right-2 flex items-center gap-1 bg-black/50 backdrop-blur-xl rounded-full px-1.5 py-1 transition-opacity z-30",
            "opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto"
          )}
        >
          <button
            className="rounded-full bg-transparent text-white hover:text-blue-400 p-1 transition"
            title="Edit"
            onClick={(e) => {
              e.stopPropagation();
              handleLoadToSimulator();
            }}
            data-testid={`button-load-simulation-${simulation.id}`}
          >
            <Sparkles className="w-3.5 h-3.5" fill="currentColor" />
          </button>
          <button
            className="rounded-full bg-transparent text-white hover:text-red-400 p-1 transition"
            title="Remove"
            onClick={() => onDelete(simulation.id)}
            data-testid={`button-delete-simulation-${simulation.id}`}
          >
            <X className="w-3.5 h-3.5" strokeWidth={2.5} />
          </button>
        </div>
        <div className="relative w-full bg-black rounded-2xl overflow-hidden" style={{ aspectRatio: '9/16', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
          <div 
            className="absolute inset-0 bg-black pointer-events-none z-10"
            style={{ opacity: isExpanded ? 0.4 : 0, transition: 'opacity 280ms ease-out' }}
          />
          
          {simulation.mediaData ? (
            <div className="absolute inset-0 bg-black flex items-center justify-center cursor-pointer" onClick={handleVideoClick}>
              <div style={{ aspectRatio: getDimensionsAspectRatio(), width: '100%', maxHeight: '100%' }}>
                {(simulation.mediaType === "image" || simulation.mediaType === "gif") && (
                  <img src={simulation.mediaData} alt="Reel" className="w-full h-full object-cover" />
                )}
                {simulation.mediaType === "video" && (
                  <video ref={videoRef} src={simulation.mediaData} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                )}
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600/30 via-pink-500/30 to-orange-500/30 flex items-center justify-center">
              <div className="text-center text-white/40">
                <Play className="w-20 h-20 mb-2 mx-auto" />
                <p className="text-sm">Reel Video</p>
              </div>
            </div>
          )}

          <div className="absolute right-3 bottom-4 flex flex-col items-center gap-5 z-30">
            <button className="flex flex-col items-center gap-1">
              <Heart className="w-7 h-7 text-white" />
              <span className="text-xs text-white font-semibold">12.5K</span>
            </button>
            <button className="flex flex-col items-center gap-1">
              <MessageCircle className="w-7 h-7 text-white" style={{ transform: 'scaleX(-1)' }} />
              <span className="text-xs text-white font-semibold">342</span>
            </button>
            <button className="flex flex-col items-center gap-1">
              <Repeat2 className="w-7 h-7 text-white" />
              <span className="text-xs text-white font-semibold">1.2K</span>
            </button>
            <button className="flex flex-col items-center gap-1">
              <Send className="w-6 h-6 text-white" />
              <span className="text-xs text-white font-semibold">89</span>
            </button>
            <button className="flex flex-col items-center gap-1">
              <MoreHorizontal className="w-7 h-7 text-white" />
            </button>
            <div className="w-7 h-7 rounded-md border-2 border-white overflow-hidden mt-1">
              {profilePic ? (
                <img src={profilePic} alt="Audio" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <User className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-20 z-20">
            <div className="flex gap-3 items-center">
              <div className="flex-shrink-0">
                {simulation.isOrganization ? (
                  profilePic ? (
                    <img src={profilePic} alt="Profile" className="w-11 h-11 rounded-[4px] object-cover" />
                  ) : (
                    <div className="w-11 h-11 rounded-[4px] bg-white/10 flex items-center justify-center">
                      <User className="w-6 h-6 text-white/60" />
                    </div>
                  )
                ) : (
                  <div 
                    className="w-11 h-11 rounded-full p-[2px]"
                    style={{ background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)' }}
                  >
                    {profilePic ? (
                      <img src={profilePic} alt="Profile" className="w-full h-full rounded-full object-cover border-2 border-black" />
                    ) : (
                      <div className="w-full h-full rounded-full bg-black flex items-center justify-center border-2 border-black">
                        <User className="w-6 h-6 text-white/60" />
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-[3px]">
                  <span className="text-sm font-bold text-white">{displayHandleNoAt}</span>
                  {simulation.isInstagramVerified && (
                    simulation.isOrganization ? (
                      <svg viewBox="0 0 22 22" className="w-5 h-5">
                        <defs>
                          <linearGradient id={`igReelGold-${simulation.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#F5D547" />
                            <stop offset="100%" stopColor="#D4A017" />
                          </linearGradient>
                        </defs>
                        <path fill={`url(#igReelGold-${simulation.id})`} d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816z" />
                        <path fill="#000" d="M9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 22 22" className="w-5 h-5 text-white" fill="currentColor">
                        <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z"></path>
                      </svg>
                    )
                  )}
                  {simulation.isCollab && <span className="text-sm font-semibold text-white">and 2 others</span>}
                </div>
                <div className="flex items-center gap-1">
                  <Music className="w-3 h-3 text-white/60 flex-shrink-0 mt-[3px]" />
                  <div className="overflow-hidden max-w-[30%]" style={{ maskImage: 'linear-gradient(to right, transparent, black 24px, black calc(100% - 24px), transparent)', WebkitMaskImage: 'linear-gradient(to right, transparent, black 24px, black calc(100% - 24px), transparent)' }}>
                    <span className="audio-ticker text-xs text-white/60">
                      <span>{displayHandleNoAt} • original audio</span>
                      <span className="mx-4">{displayHandleNoAt} • original audio</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div 
              className={`text-sm text-white mt-2 ${simulation.text && simulation.text.includes('\n') ? 'cursor-pointer' : ''}`}
              onClick={simulation.text && simulation.text.includes('\n') ? () => setIsExpanded(!isExpanded) : undefined}
            >
              {simulation.text ? (
                simulation.text.includes('\n') ? (
                  <>
                    <span style={{ display: isExpanded ? 'none' : 'inline' }}>
                      {renderTextWithMentions(simulation.text.split('\n')[0], false)}<span className="opacity-50 ml-1">...</span>
                    </span>
                    <div style={{ 
                      opacity: isExpanded ? 1 : 0,
                      transform: isExpanded ? 'translateY(0)' : 'translateY(8px)',
                      transition: 'opacity 280ms ease-out, transform 280ms ease-out',
                      display: isExpanded ? 'block' : 'none'
                    }}>
                      <span className="whitespace-pre-wrap break-words">{renderTextWithMentions(simulation.text, false)}</span>
                      <div className="text-xs text-white/60 mt-2">2 hours ago</div>
                    </div>
                  </>
                ) : renderTextWithMentions(simulation.text, false)
              ) : ""}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
