import { useEffect, useLayoutEffect, useState, useRef } from "react";
import { MessageCircle, Repeat2, Heart, Share, Bookmark, User } from "lucide-react";
import { getActiveProfile, getSimulatorMedia, type ProfileData, type SimulatorMedia } from "@/lib/indexedDB";

interface TwitterPreviewProps {
  tweetText: string;
  verified: boolean;
  isOrganization?: boolean;
  selectedDimensions?: string;
  isMuted?: boolean;
}

// Helper to render text with blue @mentions, #hashtags, and links
function renderTextWithMentions(text: string) {
  if (!text) return null;
  const parts = text.split(/(@[\w.]+|#[\w]+|https?:\/\/[^\s]+|(?:[\w-]+\.)+[a-z]{2,}(?:\/[^\s]*)?)/gi);
  return parts.map((part, index) => {
    if (part.match(/^@[\w.]+$/) || part.match(/^#[\w]+$/) || part.match(/^https?:\/\//) || part.match(/\.[a-z]{2,}(?:\/|$)/i)) {
      return <span key={index} className="text-[#1d9bf0]">{part}</span>;
    }
    return part;
  });
}

export function TwitterPreview({ tweetText, verified, isOrganization = false, selectedDimensions, isMuted = true }: TwitterPreviewProps) {
  const [profile, setProfile] = useState<ProfileData>({
    id: "user-profile",
    username: "Your Name",
    handle: "@yourhandle",
    profilePic: null,
    isVerified: false,
  });
  const [media, setMedia] = useState<SimulatorMedia | null>(null);
  const [videoAspectRatio, setVideoAspectRatio] = useState<string | null>(null);
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

  // Reset video aspect ratio synchronously before paint to prevent stale state
  useLayoutEffect(() => {
    setVideoAspectRatio(null);
  }, [media?.id]);

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
  const displayHandle = profile.handle?.startsWith("@") ? profile.handle : `@${profile.handle || "yourhandle"}`;
  const isVerifiedBadge = verified || profile.isVerified;

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

  const getImageAspectRatioStyle = () => {
    if (!media) return {};
    
    // Use natural dimensions if available
    if (media.width && media.height) {
      return {
        aspectRatio: `${media.width}/${media.height}`,
        width: '100%'
      };
    }
    
    return { width: '100%' };
  };

  const handleVideoLoadedMetadata = () => {
    if (videoRef.current) {
      const { videoWidth, videoHeight } = videoRef.current;
      if (videoWidth && videoHeight) {
        setVideoAspectRatio(`${videoWidth}/${videoHeight}`);
      }
    }
  };

  const getVideoAspectRatioStyle = () => {
    if (!media) return {};
    
    // For Twitter videos, use original upload aspect ratio
    if (media.width && media.height) {
      return {
        aspectRatio: `${media.width}/${media.height}`,
        objectFit: 'contain' as const
      };
    }
    
    // Use runtime video dimensions if available
    if (videoAspectRatio) {
      return {
        aspectRatio: videoAspectRatio,
        objectFit: 'contain' as const
      };
    }
    
    // If metadata is still loading, don't apply any constraint yet
    return {
      objectFit: 'contain' as const
    };
  };

  return (
    <div className="w-[600px] bg-black rounded-2xl px-4 py-3" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }} data-testid="twitter-preview">
      <div className="flex gap-3">
        {/* Profile Picture */}
        <div className="flex-shrink-0">
          {profile.profilePic ? (
            <img
              src={profile.profilePic}
              alt="Profile"
              className={`w-10 h-10 object-cover ${isOrganization ? 'rounded-[4px]' : 'rounded-full'}`}
              data-testid="twitter-profile-pic"
            />
          ) : (
            <div className={`w-10 h-10 bg-white/10 flex items-center justify-center ${isOrganization ? 'rounded-[4px]' : 'rounded-full'}`}>
              <User className="w-5 h-5 text-white/40" />
            </div>
          )}
        </div>

        {/* Tweet Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-[3px] flex-wrap">
            <span className="font-bold text-[15px] text-white" data-testid="twitter-username">
              {displayUsername}
            </span>
            {isVerifiedBadge && (
              isOrganization ? (
                <svg viewBox="0 0 22 22" className="w-[18px] h-[18px] flex-shrink-0" data-testid="twitter-org-badge">
                  <defs>
                    <linearGradient id="goldGradientPreview" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#F5D547" />
                      <stop offset="100%" stopColor="#D4A017" />
                    </linearGradient>
                  </defs>
                  <path fill="url(#goldGradientPreview)" d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681.132-.637.075-1.299-.165-1.903.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816z" />
                  <path fill="#000" d="M9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" />
                </svg>
              ) : (
                <svg
                  viewBox="0 0 22 22"
                  className="w-[18px] h-[18px] text-[#1d9bf0] flex-shrink-0"
                  fill="currentColor"
                  data-testid="twitter-verified-badge"
                >
                  <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z"></path>
                </svg>
              )
            )}
            <span className="text-[15px] text-[#71767b] ml-1" data-testid="twitter-handle">
              {displayHandle}
            </span>
            <span className="text-[15px] text-[#71767b]">·</span>
            <span className="text-[15px] text-[#71767b]">Dec 11</span>
          </div>

          {/* Tweet Text */}
          <div className="text-white text-[15px] leading-[20px] mt-1 mb-3 whitespace-pre-wrap break-words [word-break:break-word]" data-testid="twitter-text">
            {tweetText ? renderTextWithMentions(tweetText) : "Your tweet will appear here..."}
          </div>

          {/* Media Display */}
          {media && (media.mediaType === "image" || media.mediaType === "gif") && (
            <div className="mb-3 rounded-2xl overflow-hidden" style={getImageAspectRatioStyle()} data-testid="twitter-media-container">
              <img
                src={media.fileData}
                alt="Tweet media"
                className="w-full h-full object-cover"
                data-testid="twitter-media-image"
              />
            </div>
          )}
          {media && media.mediaType === "video" && (
            <div 
              className="mb-3 rounded-2xl overflow-hidden cursor-pointer relative" 
              data-testid="twitter-media-container"
              onClick={handleVideoClick}
            >
              <video
                ref={videoRef}
                src={media.fileData}
                autoPlay
                loop
                muted={isMuted}
                playsInline
                onLoadedMetadata={handleVideoLoadedMetadata}
                className="w-full"
                style={{
                  ...getVideoAspectRatioStyle(),
                  maxHeight: '500px'
                }}
                data-testid="twitter-media-video"
              />
            </div>
          )}

          {/* Engagement Buttons */}
          <div className="flex items-center justify-between w-full mt-3">
            <button
              className="flex items-center gap-[3px] text-[#71767b] hover:text-[#1d9bf0] transition-colors group"
              data-testid="twitter-reply-button"
            >
              <MessageCircle className="w-[18.75px] h-[18.75px]" />
              <span className="text-[13px]">50</span>
            </button>
            <button
              className="flex items-center gap-[3px] text-[#71767b] hover:text-[#00ba7c] transition-colors group"
              data-testid="twitter-retweet-button"
            >
              <Repeat2 className="w-[18.75px] h-[18.75px]" />
              <span className="text-[13px]">532</span>
            </button>
            <button
              className="flex items-center gap-[3px] text-[#71767b] hover:text-[#f91880] transition-colors group"
              data-testid="twitter-like-button"
            >
              <Heart className="w-[18.75px] h-[18.75px]" />
              <span className="text-[13px]">1.9K</span>
            </button>
            <button
              className="flex items-center gap-[3px] text-[#71767b] hover:text-[#1d9bf0] transition-colors group"
              data-testid="twitter-views-button"
            >
              <svg viewBox="0 0 24 24" className="w-[18.75px] h-[18.75px]" fill="currentColor">
                <path d="M8.75 21V3h2v18h-2zM18 21V8.5h2V21h-2zM4 21l.004-10h2L6 21H4zm9.248 0v-7h2v7h-2z" />
              </svg>
              <span className="text-[13px]">126K</span>
            </button>
            <div className="flex items-center gap-[3px]">
              <button
                className="flex items-center text-[#71767b] hover:text-[#1d9bf0] transition-colors group"
                data-testid="twitter-bookmark-button"
              >
                <Bookmark className="w-[18.75px] h-[18.75px]" />
              </button>
              <button
                className="flex items-center text-[#71767b] hover:text-[#1d9bf0] transition-colors group"
                data-testid="twitter-share-button"
              >
                <Share className="w-[18.75px] h-[18.75px]" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
