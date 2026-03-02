import { useEffect, useState, useRef } from "react";
import { Heart, MessageCircle, Send, Bookmark, User, MoreHorizontal, Camera, Repeat2, Music } from "lucide-react";
import { getActiveProfile, getSimulatorMedia, type ProfileData, type SimulatorMedia } from "@/lib/indexedDB";

interface InstagramFeedPreviewProps {
  caption: string;
  verified: boolean;
  hasImage?: boolean;
  selectedDimensions?: string;
  isMuted?: boolean;
  isCollab?: boolean;
  isOrganization?: boolean;
  useTrendingAudio?: boolean;
}


// Helper to render text with #708DFF @mentions and #hashtags for IG Feed
function renderTextWithMentionsAndHashtags(text: string) {
  if (!text) return null;
  const parts = text.split(/(@[\w.]+|#\w+|https?:\/\/[^\s]+|(?:[\w-]+\.)+[a-z]{2,}(?:\/[^\s]*)?)/gi);
  return parts.map((part, index) => {
    if (part.match(/^@[\w.]+$/) || part.match(/^#\w+$/) || part.match(/^https?:\/\//) || part.match(/\.[a-z]{2,}(?:\/|$)/i)) {
      return <span key={index} className="text-[#708DFF]">{part}</span>;
    }
    return part;
  });
}

export function InstagramFeedPreview({ caption, verified, hasImage = true, selectedDimensions, isMuted = true, isCollab = false, isOrganization = false, useTrendingAudio = false }: InstagramFeedPreviewProps) {
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

  const getAspectRatioStyle = () => {
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

  return (
    <div className="w-[600px] bg-black rounded-lg overflow-hidden relative" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }} data-testid="instagram-feed-preview">
            {/* Header */}
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-3">
          {isOrganization ? (
            // Organization: square with slight rounded corners, no gradient ring
            profile.profilePic ? (
              <img
                src={profile.profilePic}
                alt="Profile"
                className="w-8 h-8 rounded-[4px] object-cover"
                data-testid="ig-feed-profile-pic"
              />
            ) : (
              <div className="w-8 h-8 rounded-[4px] bg-white/10 flex items-center justify-center">
                <User className="w-4 h-4 text-white/40" />
              </div>
            )
          ) : (
            // Personal: circle with Instagram gradient ring
            <div 
              className="w-9 h-9 rounded-full p-[2px] flex-shrink-0"
              style={{ background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)' }}
            >
              {profile.profilePic ? (
                <img
                  src={profile.profilePic}
                  alt="Profile"
                  className="w-full h-full rounded-full object-cover border-2 border-black"
                  data-testid="ig-feed-profile-pic"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-black flex items-center justify-center border-2 border-black">
                  <User className="w-4 h-4 text-white/40" />
                </div>
              )}
            </div>
          )}
          <div className="flex flex-col">
            <div className="flex items-center gap-[3px]">
              <span className="text-sm font-bold text-white" data-testid="ig-feed-username">
                {displayHandle}
              </span>
              {isVerifiedBadge && (
                isOrganization ? (
                  <svg viewBox="0 0 22 22" className="w-5 h-5" data-testid="ig-feed-org-badge">
                    <defs>
                      <linearGradient id="igFeedGoldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#F5D547" />
                        <stop offset="100%" stopColor="#D4A017" />
                      </linearGradient>
                    </defs>
                    <path fill="url(#igFeedGoldGradient)" d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816z" />
                    <path fill="#000" d="M9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" />
                  </svg>
                ) : (
                  <svg
                    viewBox="0 0 22 22"
                    className="w-5 h-5 text-[#1d9bf0]"
                    fill="currentColor"
                    data-testid="ig-feed-verified-badge"
                  >
                    <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z"></path>
                  </svg>
                )
            )}
            {isCollab && (
              <span className="text-sm font-semibold text-white">and 2 others</span>
            )}
            </div>
            {useTrendingAudio && (
              <div className="flex items-center gap-1 mt-0.5">
                <Music className="w-3 h-3 text-white" />
                <span className="text-xs text-white" data-testid="ig-feed-original-audio">{displayHandle} • original audio</span>
              </div>
            )}
          </div>
        </div>
        <MoreHorizontal className="w-5 h-5 text-white" />
      </div>

      {/* Post Image */}
      {media ? (
        <div 
          className="w-full bg-black cursor-pointer" 
          style={getAspectRatioStyle()}
          data-testid="ig-feed-media-container"
          onClick={handleVideoClick}
        >
          {(media.mediaType === "image" || media.mediaType === "gif") && (
            <img
              src={media.fileData}
              alt="Post"
              className="w-full h-full object-cover"
              data-testid="ig-feed-media-image"
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
              data-testid="ig-feed-media-video"
            />
          )}
        </div>
      ) : hasImage ? (
        <div className="w-full aspect-square bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center" data-testid="ig-feed-image-placeholder">
          <div className="text-center text-white/40">
            <Camera className="w-16 h-16 mb-2 mx-auto" />
            <p className="text-sm">Post Image</p>
          </div>
        </div>
      ) : null}

      {/* Engagement Buttons */}
      <div className="p-3 pb-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              className="flex items-center gap-[3px] text-white"
              data-testid="ig-feed-like-button"
            >
              <Heart className="w-6 h-6" />
              <span className="text-sm font-semibold" data-testid="ig-feed-likes">1,234</span>
            </button>
            <button
              className="flex items-center gap-[3px] text-white"
              data-testid="ig-feed-comment-button"
            >
              <MessageCircle className="w-6 h-6" style={{ transform: 'scaleX(-1)' }} />
              <span className="text-sm font-semibold" data-testid="ig-feed-comments">342</span>
            </button>
            <button
              className="flex items-center gap-[3px] text-white"
              data-testid="ig-feed-repost-button"
            >
              <Repeat2 className="w-6 h-6" />
              <span className="text-sm font-semibold" data-testid="ig-feed-reposts">1.2K</span>
            </button>
            <button
              className="flex items-center gap-[3px] text-white"
              data-testid="ig-feed-share-button"
            >
              <Send className="w-5 h-5" />
              <span className="text-sm font-semibold" data-testid="ig-feed-shares">89</span>
            </button>
          </div>
          <button
            className="text-white"
            data-testid="ig-feed-bookmark-button"
          >
            <Bookmark className="w-6 h-6" />
          </button>
        </div>

        {/* Caption */}
        <div 
          className={`text-sm text-white ${caption && caption.includes('\n') ? 'cursor-pointer' : ''}`}
          onClick={caption && caption.includes('\n') ? () => setIsExpanded(!isExpanded) : undefined}
          data-testid="ig-feed-caption"
        >
          <span className="font-bold">{displayHandle}</span>{" "}
          {caption ? (
            caption.includes('\n') ? (
              <>
                {/* Collapsed state */}
                <span 
                  className="whitespace-pre-wrap break-words"
                  style={{ 
                    display: isExpanded ? 'none' : 'inline'
                  }}
                >
                  {renderTextWithMentionsAndHashtags(caption.split('\n')[0])}
                  <span className="opacity-50 ml-1">...</span>
                  <span className="ml-1" style={{ color: '#FFFFFFCC' }}>more</span>
                </span>
                {/* Expanded state */}
                <span 
                  className="whitespace-pre-wrap break-words"
                  style={{ 
                    opacity: isExpanded ? 1 : 0,
                    transform: isExpanded ? 'translateY(0)' : 'translateY(8px)',
                    transition: 'opacity 280ms ease-out, transform 280ms ease-out',
                    display: isExpanded ? 'inline' : 'none'
                  }}
                  data-testid="ig-feed-caption-expanded"
                >
                  {renderTextWithMentionsAndHashtags(caption)}
                </span>
              </>
            ) : (
              <span className="whitespace-pre-wrap break-words">{renderTextWithMentionsAndHashtags(caption)}</span>
            )
          ) : (
            <span className="whitespace-pre-wrap break-words">Your caption will appear here...</span>
          )}
        </div>

        {/* Time stamp */}
        <div className="text-xs text-white/50 mt-1" data-testid="ig-feed-time">2 hours ago</div>

      </div>
    </div>
  );
}
