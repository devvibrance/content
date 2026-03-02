import { useEffect, useState, useRef } from "react";
import { Heart, MessageCircle, Send, MoreHorizontal, User, Play, Repeat2, Music } from "lucide-react";
import { getActiveProfile, getSimulatorMedia, type ProfileData, type SimulatorMedia } from "@/lib/indexedDB";

interface InstagramReelPreviewProps {
  caption: string;
  verified: boolean;
  selectedDimensions?: string;
  isMuted?: boolean;
  isCollab?: boolean;
  isOrganization?: boolean;
  useTrendingAudio?: boolean;
}


// Audio ticker component - scrolls only if text is too long
function AudioTicker({ text }: { text: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [shouldScroll, setShouldScroll] = useState(false);
  const [measured, setMeasured] = useState(false);

  useEffect(() => {
    const checkWidth = () => {
      if (containerRef.current && measureRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const textWidth = measureRef.current.offsetWidth;
        setShouldScroll(textWidth > containerWidth);
        setMeasured(true);
      }
    };
    
    // Small delay to ensure DOM is ready
    const timer = setTimeout(checkWidth, 50);
    window.addEventListener('resize', checkWidth);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', checkWidth);
    };
  }, [text]);

  return (
    <div ref={containerRef} className="audio-ticker-container">
      {/* Hidden measurement span */}
      <span 
        ref={measureRef} 
        className="text-xs absolute opacity-0 pointer-events-none whitespace-nowrap"
        aria-hidden="true"
      >
        {text}
      </span>
      {measured && shouldScroll ? (
        <span className="audio-ticker text-xs text-white/60">
          <span>{text}</span>
          <span className="mx-4">{text}</span>
        </span>
      ) : (
        <span className="text-xs text-white/60 whitespace-nowrap">
          {text}
        </span>
      )}
    </div>
  );
}

// Helper to render text with white @mentions and #hashtags (Reels style)
function renderTextWithMentionsAndHashtags(text: string) {
  if (!text) return null;
  const parts = text.split(/(@[\w.]+|#\w+|https?:\/\/[^\s]+|(?:[\w-]+\.)+[a-z]{2,}(?:\/[^\s]*)?)/gi);
  return parts.map((part, index) => {
    if (part.match(/^@[\w.]+$/) || part.match(/^#\w+$/) || part.match(/^https?:\/\//) || part.match(/\.[a-z]{2,}(?:\/|$)/i)) {
      return <span key={index} className="text-white font-bold">{part}</span>;
    }
    return part;
  });
}

export function InstagramReelPreview({ caption, verified, selectedDimensions, isMuted = true, isCollab = false, isOrganization = false, useTrendingAudio = false }: InstagramReelPreviewProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [profile, setProfile] = useState<ProfileData>({
    id: "user-profile",
    username: "Your Name",
    handle: "@yourhandle",
    profilePic: null,
    isVerified: false,
    isInstagramVerified: false,
  });
  const [media, setMedia] = useState<SimulatorMedia | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    loadProfile();
    loadMedia();

    const handleProfileUpdate = () => {
      loadProfile();
    };

    const handleMediaUpdate = () => {
      loadMedia();
    };

    const handleProfileChanged = () => {
      loadProfile();
    };

    window.addEventListener("profileUpdated", handleProfileUpdate);
    window.addEventListener("simulatorMediaUpdated", handleMediaUpdate);
    window.addEventListener("activeProfileChanged", handleProfileChanged);
    return () => {
      window.removeEventListener("profileUpdated", handleProfileUpdate);
      window.removeEventListener("simulatorMediaUpdated", handleMediaUpdate);
      window.removeEventListener("activeProfileChanged", handleProfileChanged);
    };
  }, []);

  const loadProfile = async () => {
    const data = await getActiveProfile();
    if (data) {
      setProfile(data);
    }
  };

  const loadMedia = async () => {
    const mediaData = await getSimulatorMedia();
    setMedia(mediaData);
  };

  const displayUsername = profile.username || "Your Name";
  const displayHandle = profile.handle?.replace("@", "") || "yourhandle";
  const isVerifiedBadge = verified || profile.isInstagramVerified;


  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  const handleVideoClick = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
    }
  };

  const getMediaAspectRatio = () => {
    // Map dimensions dropdown to aspect ratios
    switch (selectedDimensions) {
      case "9:16":
        return "9/16";
      case "4:5":
        return "4/5";
      case "1:1":
        return "1/1";
      case "1.91:1":
        return "1.91/1";
      case "1440x1880":
        return "1440/1880"; // 4:5
      default:
        return "9/16"; // Default to Reel format
    }
  };

  return (
    <div
      className="relative w-[551px] aspect-[9/16] bg-black rounded-2xl overflow-hidden"
      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}
      data-testid="instagram-reel-preview"
    >
      {/* Dim overlay when caption expanded */}
      <div 
        className="absolute inset-0 bg-black pointer-events-none z-10"
        style={{
          opacity: isExpanded ? 0.4 : 0,
          transition: 'opacity 280ms ease-out'
        }}
      />
      {/* Reel Video Background */}
      {media ? (
        <div 
          className="absolute inset-0 bg-black flex items-center justify-center cursor-pointer"
          data-testid="ig-reel-media-container"
          onClick={handleVideoClick}
        >
          <div style={{ aspectRatio: getMediaAspectRatio(), width: '100%', maxHeight: '100%' }}>
            {(media.mediaType === "image" || media.mediaType === "gif") && (
              <img
                src={media.fileData}
                alt="Reel"
                className="w-full h-full object-cover"
                data-testid="ig-reel-media-image"
              />
            )}
            {media.mediaType === "video" && (
              <video
                ref={videoRef}
                src={media.fileData}
                autoPlay
                loop
                muted={isMuted}
                playsInline
                className="w-full h-full object-cover"
                data-testid="ig-reel-media-video"
              />
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

      {/* Engagement Sidebar (Right) */}
      <div className="absolute right-3 bottom-4 flex flex-col items-center gap-5 z-30">
        <button className="flex flex-col items-center gap-1" data-testid="ig-reel-like-button">
          <Heart className="w-7 h-7 text-white" />
          <span className="text-xs text-white font-semibold" data-testid="ig-reel-likes">12.5K</span>
        </button>
        <button className="flex flex-col items-center gap-1" data-testid="ig-reel-comment-button">
          <MessageCircle className="w-7 h-7 text-white" style={{ transform: 'scaleX(-1)' }} />
          <span className="text-xs text-white font-semibold" data-testid="ig-reel-comments">342</span>
        </button>
        <button className="flex flex-col items-center gap-1" data-testid="ig-reel-repost-button">
          <Repeat2 className="w-7 h-7 text-white" />
          <span className="text-xs text-white font-semibold" data-testid="ig-reel-reposts">1.2K</span>
        </button>
        <button className="flex flex-col items-center gap-1" data-testid="ig-reel-share-button">
          <Send className="w-6 h-6 text-white" />
          <span className="text-xs text-white font-semibold" data-testid="ig-reel-shares">89</span>
        </button>
        <button className="flex flex-col items-center gap-1" data-testid="ig-reel-more-button">
          <MoreHorizontal className="w-7 h-7 text-white" />
        </button>
        {/* Audio thumbnail - always visible */}
        <div className="w-7 h-7 rounded-md border-2 border-white overflow-hidden mt-1">
          {profile.profilePic ? (
            <img
              src={profile.profilePic}
              alt="Audio"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <User className="w-3 h-3 text-white" />
            </div>
          )}
        </div>
      </div>

      {/* Bottom Overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-20 z-20">
        <div className="flex gap-3 items-center">
          {/* Profile Picture */}
          <div className="flex-shrink-0">
            {isOrganization ? (
              // Organization: square with slight rounded corners, no gradient ring
              profile.profilePic ? (
                <img
                  src={profile.profilePic}
                  alt="Profile"
                  className="w-11 h-11 rounded-[4px] object-cover"
                  data-testid="ig-reel-profile-pic"
                />
              ) : (
                <div className="w-11 h-11 rounded-[4px] bg-white/10 flex items-center justify-center">
                  <User className="w-6 h-6 text-white/60" />
                </div>
              )
            ) : (
              // Personal: circle with Instagram gradient ring
              <div 
                className="w-11 h-11 rounded-full p-[2px]"
                style={{ background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)' }}
              >
                {profile.profilePic ? (
                  <img
                    src={profile.profilePic}
                    alt="Profile"
                    className="w-full h-full rounded-full object-cover border-2 border-black"
                    data-testid="ig-reel-profile-pic"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-black flex items-center justify-center border-2 border-black">
                    <User className="w-6 h-6 text-white/60" />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Username and Audio */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-[3px]">
              <span className="text-sm font-bold text-white" data-testid="ig-reel-username">
                {displayHandle}
              </span>
              {isVerifiedBadge && (
                isOrganization ? (
                  <svg viewBox="0 0 22 22" className="w-5 h-5" data-testid="ig-reel-org-badge">
                    <defs>
                      <linearGradient id="igReelGoldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#F5D547" />
                        <stop offset="100%" stopColor="#D4A017" />
                      </linearGradient>
                    </defs>
                    <path fill="url(#igReelGoldGradient)" d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816z" />
                    <path fill="#000" d="M9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" />
                  </svg>
                ) : (
                  <svg
                    viewBox="0 0 22 22"
                    className="w-5 h-5 text-white"
                    fill="currentColor"
                    data-testid="ig-reel-verified-badge"
                  >
                    <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z"></path>
                  </svg>
                )
              )}
              {isCollab && (
                <span className="text-sm font-semibold text-white">and 2 others</span>
              )}
            </div>
            
            {/* Audio/Music row */}
            {useTrendingAudio && (
              <div className="flex items-center gap-1">
                <Music className="w-3 h-3 text-white/60 flex-shrink-0 mt-[3px]" />
                <div className="overflow-hidden max-w-[30%]" style={{ maskImage: 'linear-gradient(to right, transparent, black 24px, black calc(100% - 24px), transparent)', WebkitMaskImage: 'linear-gradient(to right, transparent, black 24px, black calc(100% - 24px), transparent)' }}>
                  <span className="audio-ticker text-xs text-white/60">
                    <span>{displayHandle} • original audio</span>
                    <span className="mx-4">{displayHandle} • original audio</span>
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Caption - below profile section */}
        <div 
          className={`text-sm text-white mt-2 ${caption && caption.includes('\n') ? 'cursor-pointer' : ''}`}
          onClick={caption && caption.includes('\n') ? () => setIsExpanded(!isExpanded) : undefined}
          data-testid="ig-reel-caption"
        >
          {caption ? (
            caption.includes('\n') ? (
              <>
                {/* Collapsed state */}
                <span
                  style={{ 
                    display: isExpanded ? 'none' : 'inline'
                  }}
                >
                  {renderTextWithMentionsAndHashtags(caption.split('\n')[0])}<span className="opacity-50 ml-1">...</span>
                </span>
                {/* Expanded state */}
                <div
                  style={{ 
                    opacity: isExpanded ? 1 : 0,
                    transform: isExpanded ? 'translateY(0)' : 'translateY(8px)',
                    transition: 'opacity 280ms ease-out, transform 280ms ease-out',
                    display: isExpanded ? 'block' : 'none'
                  }}
                >
                  <span className="whitespace-pre-wrap break-words">{renderTextWithMentionsAndHashtags(caption)}</span>
                  <div className="text-xs text-white/60 mt-2">2 hours ago</div>
                </div>
              </>
            ) : renderTextWithMentionsAndHashtags(caption)
          ) : "Your caption will appear here..."}
        </div>
      </div>
    </div>
  );
}
