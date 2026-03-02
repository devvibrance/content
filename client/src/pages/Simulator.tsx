import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { 
  Target, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle,
  CheckCircle2,
  Clock,
  Image as ImageIcon,
  Video,
  Hash,
  Users,
  Lightbulb,
  BadgeCheck,
  Instagram,
  Twitter,
  Smartphone,
  RectangleVertical,
  Square,
  RectangleHorizontal,
  AtSign
} from "lucide-react";
import { TwitterPreview } from "@/components/TwitterPreview";
import { InstagramFeedPreview } from "@/components/InstagramFeedPreview";
import { InstagramReelPreview } from "@/components/InstagramReelPreview";
import { saveSimulatorMedia, getSimulatorMedia, deleteSimulatorMedia, saveSimulatorState, getSimulatorState, clearSimulatorState, savePinnedTweet, addFeaturedTweet, getCuratedTweets, clearPinnedTweet, deleteFeaturedTweet, saveSimulation, getActiveProfile, updateProfile, type SimulatorMedia, type SimulatorState, type CuratedTweet, type ProfileData } from "@/lib/indexedDB";
import { Upload, X, Pin, Building2, Bookmark, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MentionAnalysis {
  count: number;
  mentions: string[];
  status: "safe" | "warning" | "risky" | "spam";
  message: string;
  penalty: number;
  details: string;
}

interface HashtagAnalysis {
  count: number;
  hashtags: string[];
  status: "optimal" | "underuse" | "overuse";
  message: string;
  details: string;
}

interface EmojiAnalysis {
  count: number;
  emojis: string[];
  status: "optimal" | "none" | "overuse";
  message: string;
  details: string;
}

interface SimulatorScore {
  totalScore: number;
  grade: string;
  category: string;
  boosts: Array<{ factor: string; impact: string; score: number }>;
  risks: Array<{ factor: string; impact: string; score: number }>;
  advice: string[];
  breakdown: {
    engagement: number;
    reputation: number;
    contentBoosts: number;
    suppression: number;
    timeDecay: number;
  };
}

function analyzeMentions(text: string, platform: "twitter" | "instagram"): MentionAnalysis {
  const mentionRegex = platform === "instagram" 
    ? /(?:^|[^a-zA-Z0-9_.])@([a-zA-Z0-9_.]+)/g
    : /(?:^|[^a-zA-Z0-9_])@([a-zA-Z0-9_]+)/g;
  
  const matches = [];
  let match;
  while ((match = mentionRegex.exec(text)) !== null) {
    const handle = match[1];
    if (platform === "instagram") {
      if (!/[a-zA-Z]/.test(handle) || /\.\.|^\.|\.$/.test(handle)) {
        continue;
      }
    }
    matches.push("@" + handle);
  }
  const mentions = matches;
  const count = mentions.length;

  if (count === 0) {
    return {
      count: 0,
      mentions: [],
      status: "safe",
      message: "No mentions detected",
      penalty: 0,
      details: "No @mentions in your content"
    };
  }

  if (count >= 1 && count <= 2) {
    return {
      count,
      mentions,
      status: "safe",
      message: `${count} mention${count > 1 ? 's' : ''} - safe range`,
      penalty: 0,
      details: platform === "twitter" 
        ? "Mentioning people who don't follow you may limit your reach unless they engage back" 
        : "1-2 mentions are generally safe for engagement"
    };
  } else if (count >= 3 && count <= 5) {
    return {
      count,
      mentions,
      status: "warning",
      message: `${count} mentions - spam risk`,
      penalty: 0,
      details: "Using 3-5 @mentions may look spammy and could reduce your reach"
    };
  } else {
    return {
      count,
      mentions,
      status: "spam",
      message: `${count} mentions - likely suppression`,
      penalty: 0,
      details: "Using 6+ @mentions often causes your post to get hidden or flagged as spam"
    };
  }
}

function analyzeHashtags(text: string): HashtagAnalysis {
  const hashtags = text.match(/#\w+/g) || [];
  const count = hashtags.length;

  if (count === 0) {
    return {
      count: 0,
      hashtags: [],
      status: "underuse",
      message: "No hashtags detected",
      details: "Add 5-10 hashtags for optimal reach"
    };
  }

  if (count >= 5 && count <= 10) {
    return {
      count,
      hashtags,
      status: "optimal",
      message: `${count} hashtag${count > 1 ? 's' : ''} - optimal range`,
      details: "The sweet spot — helps your content get discovered without looking spammy"
    };
  } else if (count >= 1 && count <= 4) {
    return {
      count,
      hashtags,
      status: "underuse",
      message: `${count} hashtag${count > 1 ? 's' : ''} - underuse`,
      details: "A few hashtags help, but adding more (up to 10) would improve your discoverability"
    };
  } else {
    return {
      count,
      hashtags,
      status: "overuse",
      message: `${count} hashtags - overuse penalty`,
      details: "Too many hashtags looks spammy and can significantly reduce your reach"
    };
  }
}

function analyzeEmojis(text: string): EmojiAnalysis {
  const emojiRegex = /[\u2600-\u27BF\u2B50\u2764\uFE0F]|[\uD83C-\uD83E][\uDC00-\uDFFF]/g;
  const emojiMatches = text.match(emojiRegex) || [];
  const count = emojiMatches.length;

  if (count === 0) {
    return {
      count: 0,
      emojis: [],
      status: "none",
      message: "No emojis detected",
      details: "Add 1-4 emojis for visual rhythm and tone"
    };
  }

  if (count >= 1 && count <= 4) {
    return {
      count,
      emojis: emojiMatches,
      status: "optimal",
      message: `${count} emoji${count > 1 ? 's' : ''} - optimal range`,
      details: "A few well-placed emojis add personality and make your post more engaging"
    };
  } else {
    return {
      count,
      emojis: emojiMatches,
      status: "overuse",
      message: `${count} emojis - overuse penalty`,
      details: "Too many emojis can make your post look cluttered — stick to 1-4"
    };
  }
}

export default function Simulator() {
  const { toast } = useToast();
  const location = useLocation();
  const [platform, setPlatformState] = useState<"twitter" | "instagram">(() => {
    const saved = localStorage.getItem("contentOS_activePlatform");
    return saved === "instagram" ? "instagram" : "twitter";
  });
  const setPlatform = (p: "twitter" | "instagram") => {
    setPlatformState(p);
    localStorage.setItem("contentOS_activePlatform", p);
  };
  const [previewType, setPreviewType] = useState<"twitter" | "ig-feed" | "ig-reel">("twitter");
  const [tweetText, setTweetText] = useState("");
  const [hasMedia, setHasMedia] = useState({ image: false, video: false });
  const [uploadedMedia, setUploadedMedia] = useState<SimulatorMedia | null>(null);
  const [isReel, setIsReel] = useState(false);
  const [dimensions, setDimensions] = useState<"9:16" | "4:5" | "1440x1880" | "1:1" | "1.91:1">("1440x1880");
  const [mentionAnalysis, setMentionAnalysis] = useState<MentionAnalysis>(analyzeMentions("", "twitter"));
  const [hashtagAnalysis, setHashtagAnalysis] = useState<HashtagAnalysis>(analyzeHashtags(""));
  const [emojiAnalysis, setEmojiAnalysis] = useState<EmojiAnalysis>(analyzeEmojis(""));
  const [isCollab, setIsCollab] = useState(false);
  const [accountSize, setAccountSize] = useState<"small" | "medium" | "large">("small");
  const [postingTime, setPostingTime] = useState<"morning" | "afternoon" | "evening" | "night">("morning");
  const [isVerified, setIsVerified] = useState(false);
  const [isOrganization, setIsOrganization] = useState(false);
  const [isInstagramVerified, setIsInstagramVerified] = useState(false);
  const [activeProfile, setActiveProfile] = useState<ProfileData | null>(null);

  const handleVerifiedChange = async (verified: boolean) => {
    setIsVerified(verified);
    if (activeProfile) {
      const updatedProfile = { ...activeProfile, isVerified: verified };
      await updateProfile(updatedProfile);
      setActiveProfile(updatedProfile);
    }
  };

  const handleInstagramVerifiedChange = async (verified: boolean) => {
    setIsInstagramVerified(verified);
    if (activeProfile) {
      const updatedProfile = { ...activeProfile, isInstagramVerified: verified };
      await updateProfile(updatedProfile);
      setActiveProfile(updatedProfile);
    }
  };

  const handleOrganizationChange = async (isOrg: boolean) => {
    setIsOrganization(isOrg);
    if (activeProfile) {
      const updatedProfile = { ...activeProfile, isOrganization: isOrg };
      await updateProfile(updatedProfile);
      setActiveProfile(updatedProfile);
    }
  };
  const [audioTrending, setAudioTrending] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [result, setResult] = useState<SimulatorScore | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [curatedTweets, setCuratedTweets] = useState<{ pinned: CuratedTweet | null; featured: CuratedTweet[] }>({ pinned: null, featured: [] });
  const [savedConfirmation, setSavedConfirmation] = useState<string | null>(null);

  // Load active profile and curated tweets on mount
  useEffect(() => {
    const loadActiveProfile = async () => {
      const profile = await getActiveProfile();
      setActiveProfile(profile);
      setIsVerified(profile.isVerified || false);
      setIsInstagramVerified(profile.isInstagramVerified || false);
      setIsOrganization(profile.isOrganization || false);
    };
    loadActiveProfile();

    const handleProfileUpdate = () => {
      loadActiveProfile();
    };
    window.addEventListener("activeProfileChanged", handleProfileUpdate);
    window.addEventListener("profileUpdated", handleProfileUpdate);
    return () => {
      window.removeEventListener("activeProfileChanged", handleProfileUpdate);
      window.removeEventListener("profileUpdated", handleProfileUpdate);
    };
  }, []);

  useEffect(() => {
    const loadCuratedTweets = async () => {
      if (activeProfile) {
        const tweets = await getCuratedTweets(activeProfile.id);
        setCuratedTweets(tweets);
      }
    };
    loadCuratedTweets();
    
    const handleTweetsUpdate = () => {
      loadCuratedTweets();
    };
    window.addEventListener("profileTweetsUpdated", handleTweetsUpdate);
    return () => window.removeEventListener("profileTweetsUpdated", handleTweetsUpdate);
  }, [activeProfile]);

  const showSavedConfirmation = (message: string) => {
    setSavedConfirmation(message);
    setTimeout(() => setSavedConfirmation(null), 2500);
  };

  const handleSetAsPinned = async () => {
    if (!tweetText.trim() && !uploadedMedia) {
      toast({ title: "No content", description: "Add some text or media first", variant: "destructive" });
      return;
    }
    try {
      const profile = activeProfile || await getActiveProfile();
      if (!profile?.id) return;
      await savePinnedTweet(profile.id, {
        text: tweetText,
        mediaData: uploadedMedia?.fileData || null,
        mediaType: uploadedMedia?.mediaType || null,
        mediaWidth: uploadedMedia?.width || null,
        mediaHeight: uploadedMedia?.height || null,
      });
      if (!activeProfile) setActiveProfile(profile);
      showSavedConfirmation("Pinned tweet saved!");
    } catch (err) {
      console.error("Failed to save pinned tweet:", err);
      toast({ title: "Error", description: "Failed to save pinned tweet. Please try again.", variant: "destructive" });
    }
  };

  const handleSetAsFeatured = async () => {
    if (!tweetText.trim() && !uploadedMedia) {
      toast({ title: "No content", description: "Add some text or media first", variant: "destructive" });
      return;
    }
    try {
      const profile = activeProfile || await getActiveProfile();
      if (!profile?.id) return;
      await addFeaturedTweet(profile.id, {
        text: tweetText,
        mediaData: uploadedMedia?.fileData || null,
        mediaType: uploadedMedia?.mediaType || null,
        mediaWidth: uploadedMedia?.width || null,
        mediaHeight: uploadedMedia?.height || null,
      });
      if (!activeProfile) setActiveProfile(profile);
      showSavedConfirmation("Featured tweet added!");
    } catch (err) {
      console.error("Failed to save featured tweet:", err);
      toast({ title: "Error", description: "Failed to save featured tweet. Please try again.", variant: "destructive" });
    }
  };

  const handleClearPinnedTweet = async () => {
    const profile = activeProfile || await getActiveProfile();
    if (!profile?.id) return;
    await clearPinnedTweet(profile.id);
    toast({ title: "Pinned tweet removed", description: "Removed from profile preview" });
  };

  const handleSaveToLibrary = async () => {
    if (!tweetText.trim() && !uploadedMedia) {
      toast({ title: "Nothing to save", description: "Add some text or media first", variant: "destructive" });
      return;
    }

    const profile = await getActiveProfile();
    
    await saveSimulation({
      platform,
      previewType,
      text: tweetText,
      mediaData: uploadedMedia?.fileData || null,
      mediaType: uploadedMedia?.mediaType || null,
      mediaWidth: uploadedMedia?.width || null,
      mediaHeight: uploadedMedia?.height || null,
      profileUsername: profile.username,
      profileHandle: profile.handle,
      profilePic: profile.profilePic,
      isVerified: platform === "twitter" ? isVerified : isInstagramVerified,
      isOrganization: platform === "twitter" ? isOrganization : false,
      isInstagramVerified,
      dimensions,
      isCollab,
    });
    
    toast({ title: "Saved to Library", description: "Your simulation has been saved" });
  };

  const handleClearAll = async () => {
    setTweetText("");
    setHasMedia({ image: false, video: false });
    setIsReel(false);
    setDimensions("1440x1880");
    setIsCollab(false);
    setAccountSize("small");
    setPostingTime("morning");
    setIsVerified(false);
    setIsOrganization(false);
    setIsInstagramVerified(false);
    setAudioTrending(false);
    setResult(null);
    
    await deleteSimulatorMedia();
    await clearSimulatorState();
    setUploadedMedia(null);
    
    toast({ title: "Cleared", description: "Simulator has been reset" });
  };

  // Load saved state on mount, then check for pending load from Library/Profile
  useEffect(() => {
    const loadAll = async () => {
      const pending = sessionStorage.getItem("loadToSimulator");

      if (!pending) {
        const savedState = await getSimulatorState();
        if (savedState) {
          setPlatform(savedState.platform);
          setPreviewType(savedState.previewType);
          setTweetText(savedState.tweetText);
          setHasMedia(savedState.hasMedia);
          setIsReel(savedState.isReel);
          setDimensions(savedState.dimensions);
          setIsCollab(savedState.isCollab);
          setAccountSize(savedState.accountSize);
          setPostingTime(savedState.postingTime);
          setIsVerified(savedState.isVerified);
          setIsOrganization(savedState.isOrganization || false);
          setIsInstagramVerified(savedState.isInstagramVerified);
          setAudioTrending(savedState.audioTrending);
        }
      } else {
        sessionStorage.removeItem("loadToSimulator");
        const { type, data } = JSON.parse(pending);

        if (type === "simulation") {
          const sim = data;
          setPlatform(sim.platform);
          setPreviewType(sim.previewType);
          setTweetText(sim.text || "");
          setDimensions(sim.dimensions);
          setIsCollab(sim.isCollab);
          setIsVerified(sim.isVerified);
          setIsOrganization(sim.isOrganization);
          setIsInstagramVerified(sim.isInstagramVerified);
          setIsReel(sim.previewType === "ig-reel");

          if (sim.mediaData && sim.mediaType) {
            const mediaData: SimulatorMedia = {
              id: "simulator-current-media",
              fileType: sim.mediaType === "video" ? "video/mp4" : (sim.mediaType === "gif" ? "image/gif" : "image/jpeg"),
              fileName: `loaded-media.${sim.mediaType === "video" ? "mp4" : (sim.mediaType === "gif" ? "gif" : "jpg")}`,
              fileData: sim.mediaData,
              mediaType: sim.mediaType,
              width: sim.mediaWidth || undefined,
              height: sim.mediaHeight || undefined,
            };
            await saveSimulatorMedia(mediaData);
            setUploadedMedia(mediaData);
            setHasMedia({
              image: sim.mediaType === "image" || sim.mediaType === "gif",
              video: sim.mediaType === "video",
            });
          } else {
            await deleteSimulatorMedia();
            setUploadedMedia(null);
            setHasMedia({ image: false, video: false });
          }

          toast({ title: "Loaded from Library", description: "Simulation loaded successfully" });
        } else if (type === "library") {
          const { content, contentType, mediaFromDB, mediaUrls } = data;
          setTweetText(content || "");

          if (mediaFromDB) {
            const existingMedia = await getSimulatorMedia();
            if (existingMedia) {
              setUploadedMedia(existingMedia);
              setHasMedia({
                image: existingMedia.mediaType !== "video",
                video: existingMedia.mediaType === "video",
              });
            } else {
              setUploadedMedia(null);
              setHasMedia({ image: false, video: false });
            }
          } else if (mediaUrls && mediaUrls.length > 0 && mediaUrls[0]) {
            const mediaData: SimulatorMedia = {
              id: "simulator-current-media",
              fileType: contentType === "video" ? "video/mp4" : "image/jpeg",
              fileName: `loaded-media.${contentType === "video" ? "mp4" : "jpg"}`,
              fileData: mediaUrls[0],
              mediaType: contentType === "video" ? "video" : "image",
            };
            await saveSimulatorMedia(mediaData);
            setUploadedMedia(mediaData);
            setHasMedia({
              image: contentType !== "video",
              video: contentType === "video",
            });
          } else {
            await deleteSimulatorMedia();
            setUploadedMedia(null);
            setHasMedia({ image: false, video: false });
          }

          toast({ title: "Loaded from Library", description: "Content loaded successfully" });
        }
      }

      setIsLoaded(true);
    };

    loadAll();
  }, [location.key]);

  // Save state when it changes (after initial load)
  useEffect(() => {
    if (!isLoaded) return;
    
    saveSimulatorState({
      platform,
      previewType,
      tweetText,
      hasMedia,
      isReel,
      dimensions,
      isCollab,
      accountSize,
      postingTime,
      isVerified,
      isOrganization,
      isInstagramVerified,
      audioTrending,
    });
  }, [isLoaded, platform, previewType, tweetText, hasMedia, isReel, dimensions, isCollab, accountSize, postingTime, isVerified, isOrganization, isInstagramVerified, audioTrending]);

  useEffect(() => {
    const analysis = analyzeMentions(tweetText, platform);
    setMentionAnalysis(analysis);
  }, [tweetText, platform]);

  useEffect(() => {
    const analysis = analyzeHashtags(tweetText);
    setHashtagAnalysis(analysis);
  }, [tweetText]);

  useEffect(() => {
    const analysis = analyzeEmojis(tweetText);
    setEmojiAnalysis(analysis);
  }, [tweetText]);

  const calculateInstagramScore = () => {
    if (!tweetText.trim()) {
      setResult(null);
      return;
    }

    let score = 35;
    const boosts: Array<{ factor: string; impact: string; score: number }> = [];
    const risks: Array<{ factor: string; impact: string; score: number }> = [];
    const advice: string[] = [];
    const breakdown = {
      engagement: 0,
      reputation: 0,
      contentBoosts: 0,
      suppression: 0,
      timeDecay: 0,
    };

    if (isInstagramVerified) {
      const boost = 4;
      score += boost;
      breakdown.reputation += boost;
      boosts.push({ factor: "Verified status", impact: "Verified accounts are trusted more and shown to more people", score: boost });
    }

    const firstSevenWords = tweetText.split(/\s+/).slice(0, 7).join(" ").toLowerCase();
    const hookTriggers = ["here's", "real", "hot take", "unpopular", "truth", "most people", "this is", "stop", "wait", "secret", "never", "always", "ever notice how",
                           "feels like",
                           "the weird part is",
                           "nobody talks about",
                           "been thinking about",
                           "when did we all decide",
                           "the moment I realized",
                           "what if it’s not about",
                           "crazy how",
                           "the older I get",
                           "this changed everything for me",
                           "what they don’t tell you",
                           "funny thing is",
                           "once you see it",
                           "you start to understand why",
                           "it hit me that",
                           "maybe the point isn’t",
                           "the mistake I kept making",
                           "here’s what surprised me",
                           "looking back now",
                           "you know that feeling when",
                           "ever wonder why",
                           "something people get wrong",
                           "the hardest part is",
                           "it finally made sense",
                           "the thing about growth",
                           "if you’ve ever felt like",
                           "i used to believe",
                           "until this happened",
                           "turns out",
                           "real talk —",
                           "strangest lesson I’ve learned",
                           "this might sound weird but",
                           "lowkey",
                           "no one warned me about",
                           "the more I think about it",
                           "every time I",
                           "reminds me that",
                           "it’s not about",
                           "i can’t unsee this",
                           "feels personal but",
                           "here’s the part nobody mentions",
                           "this took me years to learn",
                           "maybe i’m wrong but",
                           "you probably know this feeling",
                           "that’s when it clicked",
                           "here’s the thing about",
                           "honestly",
                           "wild realization:",
                           "the truth isn’t what you think",
                           "what finally worked",
                           "realization of the week",
                         ];
    if (hookTriggers.some(trigger => firstSevenWords.includes(trigger))) {
      const boost = 6;
      score += boost;
      breakdown.engagement += boost;
      boosts.push({ factor: "Strong hook", impact: "Your first few words grab attention and keep people engaged", score: boost });
    }

    if (isReel) {
      const boost = 15;
      score += boost;
      breakdown.contentBoosts += boost;
      boosts.push({ factor: "Reel", impact: "Reels get the most reach — they're shown on Explore, Reels tab, and home feed", score: boost });
    } else if (uploadedMedia) {
      if (uploadedMedia.mediaType === "image") {
        const boost = 12;
        score += boost;
        breakdown.contentBoosts += boost;
        boosts.push({ factor: "Image", impact: "Images grab attention — clean, clear visuals perform best", score: boost });
        advice.push("Try carousels — multi-slide posts get more saves and swipes, keeping people engaged longer");
      } else if (uploadedMedia.mediaType === "video") {
        const boost = 13;
        score += boost;
        breakdown.contentBoosts += boost;
        boosts.push({ factor: "Video post", impact: "Videos keep people watching longer, which helps your post reach more people", score: boost });
      }
    } else {
      if (hasMedia.image) {
        const boost = 12;
        score += boost;
        breakdown.contentBoosts += boost;
        boosts.push({ factor: "Image", impact: "Images grab attention — clean, clear visuals perform best", score: boost });
        advice.push("Try carousels — multi-slide posts get more saves and swipes, keeping people engaged longer");
      }

      if (hasMedia.video) {
        const boost = 13;
        score += boost;
        breakdown.contentBoosts += boost;
        boosts.push({ factor: "Video post", impact: "Videos keep people watching longer, which helps your post reach more people", score: boost });
      }
    }

    if (dimensions === "9:16") {
      const boost = 8;
      score += boost;
      breakdown.contentBoosts += boost;
      boosts.push({ factor: "9:16 — Reels format", impact: "Best vertical format for Reels — fills the whole screen", score: boost });
    } else if (dimensions === "1440x1880") {
      const boost = 6;
      score += boost;
      breakdown.contentBoosts += boost;
      boosts.push({ factor: "Pro 4:5 — Feed portrait", impact: "Takes up more screen space in the feed, getting more attention", score: boost });
    } else if (dimensions === "1:1") {
      const boost = 2;
      score += boost;
      breakdown.contentBoosts += boost;
      boosts.push({ factor: "1:1 — Square format", impact: "Classic square format — works but takes up less screen space than portrait", score: boost });
    } else if (dimensions === "1.91:1") {
      const risk = -3;
      score += risk;
      breakdown.suppression += risk;
      risks.push({ factor: "1.91:1 — Landscape format", impact: "Landscape takes up less screen space and people scroll past faster", score: risk });
    }

    if (isCollab) {
      const boost = 5;
      score += boost;
      breakdown.engagement += boost;
      boosts.push({ factor: "Collab post (2–4 creators)", impact: "Your post is shown to all collaborators' followers too", score: boost });
    }

    if (audioTrending && isReel) {
      const boost = 3;
      score += boost;
      breakdown.engagement += boost;
      boosts.push({ factor: "Trending audio", impact: "Using trending sounds helps your Reel get discovered by more people", score: boost });
    }

    const hashtags = tweetText.match(/#\w+/g) || [];
    if (hashtags.length >= 5 && hashtags.length <= 10) {
      const boost = 4;
      score += boost;
      breakdown.contentBoosts += boost;
      boosts.push({ factor: "Hashtags (5–10)", impact: "The sweet spot — helps Instagram understand your content and show it to the right people", score: boost });
    } else if (hashtags.length >= 1 && hashtags.length <= 4) {
      const boost = 1;
      score += boost;
      breakdown.contentBoosts += boost;
      boosts.push({ factor: "Hashtags (1–4)", impact: "A few hashtags help, but adding more would improve discoverability", score: boost });
    } else if (hashtags.length >= 11) {
      const risk = -4;
      score += risk;
      breakdown.suppression += risk;
      risks.push({ factor: "Hashtag Overuse (11+)", impact: "Too many hashtags looks spammy and can reduce your reach", score: risk });
    }

    const emojiRegex = /[\u2600-\u27BF\u2B50\u2764\uFE0F]|[\uD83C-\uD83E][\uDC00-\uDFFF]/g;
    const emojiMatches = tweetText.match(emojiRegex) || [];
    const emojiCount = emojiMatches.length;
    
    if (emojiCount >= 1 && emojiCount <= 4) {
      const boost = 4;
      score += boost;
      breakdown.contentBoosts += boost;
      boosts.push({ factor: "Emojis", impact: "A few well-placed emojis add personality and make your caption more readable", score: boost });
    } else if (emojiCount >= 5) {
      const risk = -3;
      score += risk;
      breakdown.suppression += risk;
      risks.push({ factor: "Emoji Overuse", impact: "Too many emojis can make your caption look cluttered and less trustworthy", score: risk });
    }

    const engagementBaitPatterns = [
      "like if", "comment below", "tag a friend", "double tap", "share this",
      "follow for", "dm me", "link in bio", "tap the link", "save this"
    ];
    const lowerText = tweetText.toLowerCase();
    if (engagementBaitPatterns.some(pattern => lowerText.includes(pattern))) {
      const risk = -12;
      score += risk;
      breakdown.suppression += risk;
      risks.push({ factor: "Engagement bait", impact: "Asking for likes/follows/saves directly can get your post suppressed", score: risk });
    }

    if (accountSize === "large") {
      const boost = 10;
      score += boost;
      breakdown.reputation += boost;
      boosts.push({ factor: "Large account", impact: "Big accounts get more reach — your posts are shown to a wider audience", score: boost });
    } else if (accountSize === "medium") {
      const boost = 6;
      score += boost;
      breakdown.reputation += boost;
      boosts.push({ factor: "Medium account", impact: "Growing audience gives you solid reach within your niche", score: boost });
    } else {
      breakdown.reputation -= 10;
      risks.push({ factor: "Small account", impact: "Smaller accounts have limited reach at first — focus on building engagement", score: -10 });
    }

    if (postingTime === "morning" || postingTime === "evening") {
      const boost = 8;
      score += boost;
      breakdown.timeDecay += boost;
      boosts.push({ factor: "Peak posting window", impact: "Morning and evening are when people are most active on Instagram", score: boost });
    } else if (postingTime === "afternoon") {
      const risk = -3;
      score += risk;
      breakdown.timeDecay += risk;
      risks.push({ factor: "Off-peak hours", impact: "Fewer people are online in the afternoon, so your post gets less early engagement", score: risk });
    } else if (postingTime === "night") {
      const risk = -5;
      score += risk;
      breakdown.timeDecay += risk;
      risks.push({ factor: "Late night posting", impact: "Very few people are online late at night — your post may get buried by morning", score: risk });
    }

    if (!isInstagramVerified) {
      advice.push("Get verified — it gives your account a trust boost and helps your posts reach more people");
    }

    if (!isReel && !hasMedia.image && !hasMedia.video && !uploadedMedia) {
      advice.push("Try posting a Reel — Reels get the most reach and are shown across Explore, Reels tab, and home feed");
    }

    if (dimensions !== "1440x1880" && platform === "instagram") {
      advice.push("Use 4:5 portrait format — it fills more screen space and gets more attention than square or landscape");
    }

    if (isReel && !audioTrending) {
      advice.push("Use trending audio before everyone else does — popular sounds help your Reel get discovered faster");
    }

    if (!hookTriggers.some(trigger => firstSevenWords.includes(trigger))) {
      advice.push("Start with a strong hook — your first few words decide if people keep reading or scroll past");
    }

    if (hashtags.length < 5 || hashtags.length > 10) {
      advice.push("Use 5-10 relevant hashtags — they help Instagram show your content to the right audience");
    }

    advice.push("Reply to your own post with extra hashtags — keeps your caption clean while still boosting discoverability");

    if (emojiCount === 0 || emojiCount > 4) {
      advice.push("Add 1-4 emojis to add personality — they make your caption more readable and expressive");
    }

    if (!isCollab) {
      advice.push("Try a collab post — your content gets shown to all collaborators' followers, doubling your exposure");
    }

    advice.push("Pin your best-performing Reel to your profile — it shows Instagram what kind of content you create");

    if (!/\w\?/.test(tweetText)) {
      advice.push("Ask a question in your caption — it encourages comments, which boost your post's reach");
    }

    if (postingTime !== "morning" && postingTime !== "evening") {
      advice.push("Post between 8-10 AM or 4-6 PM when most people are active on Instagram");
    }

    advice.push("Post Stories before your Reel — when followers engage with your Stories first, your Reel shows up higher in their feed");

    advice.push("Create content people want to save — tips, inspiration, and emotional content get saved more, which matters more than likes");

    advice.push("Keep visuals clean — text-heavy images look promotional, while simple visuals feel more personal and authentic");

    advice.push("Focus on sparking conversation — comments and replies boost your post's reach far more than likes alone");

    advice.push("Stay consistent — posting regularly builds momentum and helps the algorithm recognize and promote your content");

    advice.push("What matters most on Instagram: Saves > Shares > Comments > Rewatches > Profile visits > Likes");

    if (dimensions === "1.91:1") {
      advice.push("Switch to vertical (9:16) for Reels or portrait (4:5) for Feed — landscape posts get less engagement");
    }

    let grade = "F";
    let category = "Low viral potential";
    if (score >= 90) {
      grade = "A+";
      category = "Excellent viral potential";
    } else if (score >= 80) {
      grade = "A";
      category = "Strong viral potential";
    } else if (score >= 70) {
      grade = "B+";
      category = "Good viral potential";
    } else if (score >= 60) {
      grade = "B";
      category = "Moderate viral potential";
    } else if (score >= 50) {
      grade = "C";
      category = "Average performance";
    } else if (score >= 40) {
      grade = "D";
      category = "Below average";
    }

    setResult({
      totalScore: Math.max(0, Math.min(100, score)),
      grade,
      category,
      boosts,
      risks,
      advice,
      breakdown,
    });
  };

  const calculateScore = () => {
    if (platform === "instagram") {
      calculateInstagramScore();
      return;
    }

    if (!tweetText.trim()) {
      setResult(null);
      return;
    }

    // Weights aligned with X algorithm (xai-org/x-algorithm)
    // Pipeline: PhoenixScorer → WeightedScorer → AuthorDiversityScorer → OONScorer
    // Predicts 19 engagement actions per candidate post
    const defaultWeights = {
      questionBoost: 6,       // reply_score weight — questions drive replies (highest weighted action)
      hookBoost: 7,           // dwell_score weight — hooks increase dwell time prediction
      imageBoost: 10,         // photo_expand_score weight — images drive expansion clicks
      videoBoost: 14,         // vqv_score weight — video quality views (conditional on duration)
      listFormatBoost: 6,     // favorite_score + share_score — structured content drives saves & shares
      hashtagBoost: 4,        // content classification signal for topic indexing
      largAccountBoost: 10,   // reputation baseline — high follow_author_score prediction
      mediumAccountBoost: 6,  // moderate reputation signal
      shortTweetBoost: 10,    // dwell_time optimization window
      capsSpamPenalty: -15,    // not_interested_score + report_score trigger
      engagementBaitPenalty: -14, // block_author_score + mute_author_score trigger
      shareSignalBoost: 5,    // share_score + share_via_dm_score + share_via_copy_link_score
      dwellBoost: 5,          // dwell_time continuous prediction boost
      profileClickBoost: 4,   // profile_click_score — curiosity-driven content
    };
    
    let weights = defaultWeights;
    try {
      const saved = localStorage.getItem("contentOS_settings");
      if (saved) {
        const settings = JSON.parse(saved);
        if (settings.algorithmWeights) {
          weights = settings.algorithmWeights;
        }
      }
    } catch (e) {
      console.error("Failed to load algorithm weights");
    }

    let score = 35;
    const boosts: Array<{ factor: string; impact: string; score: number }> = [];
    const risks: Array<{ factor: string; impact: string; score: number }> = [];
    const advice: string[] = [];
    const breakdown = {
      engagement: 0,
      reputation: 0,
      contentBoosts: 0,
      suppression: 0,
      timeDecay: 0,
    };

    if (isVerified) {
      const boost = 12;
      score += boost;
      breakdown.reputation += boost;
      boosts.push({ factor: "Verified Account", impact: "Verified accounts get a trust boost and are shown to more people", score: boost });
    } else {
      const risk = -15;
      score += risk;
      breakdown.reputation += risk;
      risks.push({ factor: "Non-verified account", impact: "Without verification, your posts start with less visibility", score: risk });
    }

    if (/\w\?/.test(tweetText)) {
      const boost = weights.questionBoost;
      score += boost;
      breakdown.engagement += boost;
      boosts.push({ factor: "Question format", impact: "Questions encourage replies, which are one of the strongest engagement signals", score: boost });
    }

    const firstSevenWords = tweetText.split(/\s+/).slice(0, 7).join(" ").toLowerCase();
    const hookTriggers = ["here's", "real", "hot take", "unpopular", "truth", "most people", "this is", "stop", "wait", "secret", "never", "always", "ever notice how",
                           "feels like",
                           "the weird part is",
                           "nobody talks about",
                           "been thinking about",
                           "when did we all decide",
                           "the moment I realized",
                           "what if it's not about",
                           "crazy how",
                           "the older I get",
                           "this changed everything for me",
                           "what they don't tell you",
                           "funny thing is",
                           "once you see it",
                           "you start to understand why",
                           "it hit me that",
                           "maybe the point isn't",
                           "the mistake I kept making",
                           "here's what surprised me",
                           "looking back now",
                           "you know that feeling when",
                           "ever wonder why",
                           "something people get wrong",
                           "the hardest part is",
                           "it finally made sense",
                           "the thing about growth",
                           "if you've ever felt like",
                           "i used to believe",
                           "until this happened",
                           "turns out",
                           "real talk —",
                           "strangest lesson I've learned",
                           "this might sound weird but",
                           "lowkey",
                           "no one warned me about",
                           "the more I think about it",
                           "every time I",
                           "reminds me that",
                           "it's not about",
                           "i can't unsee this",
                           "feels personal but",
                           "here's the part nobody mentions",
                           "this took me years to learn",
                           "maybe i'm wrong but",
                           "you probably know this feeling",
                           "that's when it clicked",
                           "here's the thing about",
                           "honestly",
                           "wild realization:",
                           "the truth isn't what you think",
                           "what finally worked",
                           "realization of the week",
                         ];
    if (hookTriggers.some(trigger => firstSevenWords.includes(trigger))) {
      const boost = weights.hookBoost;
      score += boost;
      breakdown.engagement += boost;
      boosts.push({ factor: "Strong hook", impact: "Your first few words grab attention and keep people reading longer", score: boost });
    }

    if (uploadedMedia) {
      if (uploadedMedia.mediaType === "gif") {
        const boost = weights.videoBoost;
        score += boost;
        breakdown.contentBoosts += boost;
        boosts.push({ factor: "GIF attached", impact: "GIFs auto-play and get treated like video content, boosting visibility", score: boost });
      } else if (uploadedMedia.mediaType === "image") {
        const boost = weights.imageBoost;
        score += boost;
        breakdown.contentBoosts += boost;
        boosts.push({ factor: "Image attached", impact: "Images make people stop scrolling and engage more with your post", score: boost });
      } else if (uploadedMedia.mediaType === "video") {
        const boost = weights.videoBoost;
        score += boost;
        breakdown.contentBoosts += boost;
        boosts.push({ factor: "Video attached", impact: "Videos get the biggest visibility boost — people spend more time watching", score: boost });
      }
    } else {
      if (hasMedia.image) {
        const boost = weights.imageBoost;
        score += boost;
        breakdown.contentBoosts += boost;
        boosts.push({ factor: "Image attached", impact: "Images make people stop scrolling and engage more with your post", score: boost });
      }

      if (hasMedia.video) {
        const boost = weights.videoBoost;
        score += boost;
        breakdown.contentBoosts += boost;
        boosts.push({ factor: "Video attached", impact: "Videos get the biggest visibility boost — people spend more time watching", score: boost });
      }
    }

    if (accountSize === "large") {
      const boost = weights.largAccountBoost;
      score += boost;
      breakdown.reputation += boost;
      boosts.push({ factor: "Large account", impact: "Big accounts get more reach — your posts are shown to a wider audience", score: boost });
    } else if (accountSize === "medium") {
      const boost = weights.mediumAccountBoost;
      score += boost;
      breakdown.reputation += boost;
      boosts.push({ factor: "Medium account", impact: "Growing audience gives you solid reach within your niche", score: boost });
    } else {
      breakdown.reputation -= 10;
      risks.push({ factor: "Small account", impact: "Smaller accounts have limited reach at first — focus on building engagement", score: -10 });
    }

    const hashtags = tweetText.match(/#\w+/g) || [];
    if (hashtags.length >= 5 && hashtags.length <= 10) {
      const boost = weights.hashtagBoost;
      score += boost;
      breakdown.contentBoosts += boost;
      boosts.push({ factor: "Hashtags (5–10)", impact: "The sweet spot — helps the algorithm understand your topic and show it to the right people", score: boost });
    } else if (hashtags.length >= 1 && hashtags.length <= 4) {
      const boost = 1;
      score += boost;
      breakdown.contentBoosts += boost;
      boosts.push({ factor: "Hashtags (1–4)", impact: "A few hashtags help, but adding more would improve discoverability", score: boost });
    } else if (hashtags.length >= 11) {
      const risk = -4;
      score += risk;
      breakdown.suppression += risk;
      risks.push({ factor: "Hashtag Overuse (11+)", impact: "Too many hashtags looks spammy and can reduce your reach", score: risk });
    }

    if (tweetText.match(/→|•|1\./)) {
      const boost = weights.listFormatBoost;
      score += boost;
      breakdown.contentBoosts += boost;
      boosts.push({ factor: "List format", impact: "Bullet points and lists are easy to scan — people save and share them more", score: boost });
    }

    const words = tweetText.split(/\s+/);
    const spammyRatio = words.filter(w => w === w.toUpperCase() && w.length > 2).length / Math.max(words.length, 1);
    if (spammyRatio > 0.3) {
      const risk = weights.capsSpamPenalty;
      score += risk;
      breakdown.suppression += risk;
      risks.push({ factor: "Too much CAPS", impact: "Excessive caps looks like shouting and can trigger spam filters", score: risk });
      advice.push("Reduce ALL CAPS usage — it can make your post look spammy");
    }

    const emojiRegex = /[\u2600-\u27BF\u2B50\u2764\uFE0F]|[\uD83C-\uD83E][\uDC00-\uDFFF]/g;
    const emojiMatches = tweetText.match(emojiRegex) || [];
    const emojiCount = emojiMatches.length;
    
    if (emojiCount >= 5) {
      const risk = -3;
      score += risk;
      breakdown.suppression += risk;
      risks.push({ factor: "Emoji Overuse", impact: "Too many emojis can make your post look cluttered and less trustworthy", score: risk });
    }

    const engagementBaitPatterns = [
      "like if", "comment below", "tag a friend", "double tap", "retweet if", 
      "share if", "follow for", "dm me", "click the link", "link in bio"
    ];
    const lowerText = tweetText.toLowerCase();
    if (engagementBaitPatterns.some(pattern => lowerText.includes(pattern))) {
      const risk = weights.engagementBaitPenalty;
      score += risk;
      breakdown.suppression += risk;
      risks.push({ factor: "Engagement bait", impact: "Asking for likes/follows/shares directly can get your post suppressed", score: risk });
    }

    // Share signal — content with data, insights, or frameworks boosts share_score predictions
    const shareSignals = [/\d+%/, /\d+x/, /study|research|data|found that|according to|framework|principle|strategy/i];
    if (shareSignals.some(pattern => pattern.test(tweetText))) {
      const boost = weights.shareSignalBoost;
      score += boost;
      breakdown.contentBoosts += boost;
      boosts.push({ factor: "Shareable content", impact: "Posts with data, stats, or insights get shared and saved more often", score: boost });
    }

    // Dwell signal — well-structured multi-line content boosts dwell_time prediction
    const lineCount = tweetText.split("\n").filter(l => l.trim()).length;
    if (lineCount >= 3 && tweetText.length >= 80) {
      const boost = weights.dwellBoost;
      score += boost;
      breakdown.contentBoosts += boost;
      boosts.push({ factor: "High dwell structure", impact: "Multi-line format keeps people reading longer, which boosts visibility", score: boost });
    }

    // Profile click signal — content establishing authority drives profile_click_score
    const authoritySignals = /\b(years?|decade|experience|built|founded|shipped|led|managed|grew)\b/i;
    if (authoritySignals.test(tweetText)) {
      const boost = weights.profileClickBoost;
      score += boost;
      breakdown.engagement += boost;
      boosts.push({ factor: "Authority signal", impact: "Experience and credibility markers make people click your profile and follow", score: boost });
    }

    if (postingTime === "morning") {
      const boost = 8;
      score += boost;
      breakdown.timeDecay += boost;
      boosts.push({ factor: "Peak posting window", impact: "Morning is when people are most active — your post gets more early engagement", score: boost });
    } else if (postingTime === "afternoon") {
      const risk = -3;
      score += risk;
      breakdown.timeDecay += risk;
      risks.push({ factor: "Off-peak hours", impact: "Fewer people are online in the afternoon, so your post gets less early engagement", score: risk });
      advice.push("Post during morning (6-10 AM) or evening (5-9 PM) for the most activity");
    } else if (postingTime === "evening") {
      const boost = 8;
      score += boost;
      breakdown.timeDecay += boost;
      boosts.push({ factor: "Good posting window", impact: "Evening is a high-activity window — more people will see and engage with your post", score: boost });
    } else if (postingTime === "night") {
      const risk = -5;
      score += risk;
      breakdown.timeDecay += risk;
      risks.push({ factor: "Late night posting", impact: "Very few people are online late at night — your post may get buried by morning", score: risk });
      advice.push("Avoid posting late at night — schedule for morning or evening when more people are active");
    }

    if (!isVerified) {
      advice.push("Get verified — it gives your account a trust boost and helps your posts reach more people");
    }

    if (!hasMedia.image && !hasMedia.video && !uploadedMedia) {
      advice.push("Add an image or video — media posts get significantly more engagement than text-only posts");
    }

    if (uploadedMedia?.mediaType === "gif") {
      advice.push("GIFs auto-play in the feed, so they get treated like video content and boost engagement");
    }

    if (!/\w\?/.test(tweetText)) {
      advice.push("Add a question — it encourages replies, which is one of the best ways to boost your post's reach");
    }

    if (breakdown.engagement < 20) {
      advice.push("Strengthen your first 7 words — a strong opening keeps people reading instead of scrolling past");
    }

    advice.push("Write about trending topics — posts on popular subjects get shown to more people outside your followers");

    if (!tweetText.match(/→|•|1\./)) {
      advice.push("Use list formats (→, •, 1.) — structured posts are easier to read and get more saves and shares");
    }

    if (score >= 80) {
      advice.push("Great score — post during peak hours (6-10 AM or 5-9 PM) to maximize engagement while it's fresh");
    }

    advice.push("Focus on getting replies, reposts, shares, and bookmarks — these count the most for reach");
    advice.push("Your post's best window is the first 4 hours — early engagement determines how far it spreads");

    if (hasMedia.video || uploadedMedia?.mediaType === "video") {
      advice.push("Make sure your video is long enough to hold attention — very short clips may not get the full video boost");
    }

    advice.push("Reply to your own post early — it starts a conversation and signals engagement to the algorithm");

    advice.push("Include data, insights, or useful frameworks — these are the posts people DM to friends and save for later");

    advice.push("Threads keep people engaged longer — multiple connected posts boost your overall visibility");

    advice.push("Space out your posts — posting too frequently can reduce how many people see each one");

    advice.push("Engage with your followers first — strong community interaction helps your posts reach people beyond your followers");

    advice.push("Aim for replies, reposts, saves, and shares — avoid things that make people hide or mute your posts");

    advice.push("Build curiosity and authority — posts that make people visit your profile lead to more followers");

    if (accountSize === "small") {
      advice.push("Small accounts grow by engaging with their community first — replies and conversations build your reach over time");
    }

    if (score < 50) {
      advice.push("Your score is low — try adding media, asking a question, or starting with a stronger hook to boost engagement");
    }

    let grade = "F";
    let category = "Low viral potential";
    if (score >= 90) {
      grade = "A+";
      category = "Excellent viral potential";
    } else if (score >= 80) {
      grade = "A";
      category = "Strong viral potential";
    } else if (score >= 70) {
      grade = "B+";
      category = "Good viral potential";
    } else if (score >= 60) {
      grade = "B";
      category = "Moderate viral potential";
    } else if (score >= 50) {
      grade = "C";
      category = "Average performance";
    } else if (score >= 40) {
      grade = "D";
      category = "Below average";
    }

    setResult({
      totalScore: Math.max(0, Math.min(100, score)),
      grade,
      category,
      boosts,
      risks,
      advice,
      breakdown,
    });
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      calculateScore();
    }, 300);
    return () => clearTimeout(timer);
  }, [tweetText, hasMedia, accountSize, postingTime, isVerified, isInstagramVerified, platform, audioTrending, isReel, dimensions, isCollab]);

  useEffect(() => {
    if (platform === "twitter") {
      setPreviewType("twitter");
    } else {
      if (isReel) {
        setPreviewType("ig-reel");
      } else {
        setPreviewType("ig-feed");
      }
    }
  }, [platform, isReel]);

  useEffect(() => {
    loadMedia();
    
    const handleMediaUpdate = () => {
      loadMedia();
    };
    
    window.addEventListener("simulatorMediaUpdated", handleMediaUpdate);
    return () => window.removeEventListener("simulatorMediaUpdated", handleMediaUpdate);
  }, []);

  const loadMedia = async () => {
    const media = await getSimulatorMedia();
    setUploadedMedia(media);
    
    if (media) {
      if (media.mediaType === "image" || media.mediaType === "gif") {
        setHasMedia({ image: true, video: false });
      } else if (media.mediaType === "video") {
        setHasMedia({ image: false, video: true });
      }
    }
  };

  const handleFileUpload = async (file: File, mediaType: "image" | "video" | "gif") => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const fileData = e.target?.result as string;
      
      // Detect dimensions
      let width: number | undefined;
      let height: number | undefined;
      let aspectRatio: string | undefined;
      
      if (mediaType === "image" || mediaType === "gif") {
        // Load image to get dimensions
        const img = new Image();
        await new Promise((resolve) => {
          img.onload = () => {
            width = img.width;
            height = img.height;
            
            // Calculate aspect ratio
            const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
            const divisor = gcd(width, height);
            const ratioW = width / divisor;
            const ratioH = height / divisor;
            
            // Simplify common aspect ratios
            const ratio = width / height;
            if (Math.abs(ratio - 16/9) < 0.01) aspectRatio = "16:9";
            else if (Math.abs(ratio - 9/16) < 0.01) aspectRatio = "9:16";
            else if (Math.abs(ratio - 4/5) < 0.01) aspectRatio = "4:5";
            else if (Math.abs(ratio - 5/4) < 0.01) aspectRatio = "5:4";
            else if (Math.abs(ratio - 1) < 0.01) aspectRatio = "1:1";
            else if (Math.abs(ratio - 1.91) < 0.01) aspectRatio = "1.91:1";
            else aspectRatio = `${ratioW}:${ratioH}`;
            
            resolve(null);
          };
          img.src = fileData;
        });
      } else if (mediaType === "video") {
        // Load video to get dimensions
        const video = document.createElement("video");
        await new Promise((resolve) => {
          video.onloadedmetadata = () => {
            width = video.videoWidth;
            height = video.videoHeight;
            
            // Calculate aspect ratio
            const ratio = width / height;
            if (Math.abs(ratio - 16/9) < 0.01) aspectRatio = "16:9";
            else if (Math.abs(ratio - 9/16) < 0.01) aspectRatio = "9:16";
            else if (Math.abs(ratio - 4/5) < 0.01) aspectRatio = "4:5";
            else if (Math.abs(ratio - 5/4) < 0.01) aspectRatio = "5:4";
            else if (Math.abs(ratio - 1) < 0.01) aspectRatio = "1:1";
            else if (Math.abs(ratio - 1.91) < 0.01) aspectRatio = "1.91:1";
            else {
              const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
              const divisor = gcd(width, height);
              aspectRatio = `${width / divisor}:${height / divisor}`;
            }
            
            resolve(null);
          };
          video.src = fileData;
        });
      }
      
      await saveSimulatorMedia({
        fileType: file.type,
        fileName: file.name,
        fileData,
        mediaType,
        width,
        height,
        aspectRatio,
      });
      
      // Auto-set dimensions dropdown based on detected aspect ratio
      if (aspectRatio) {
        if (aspectRatio === "9:16") {
          setDimensions("9:16");
        } else if (aspectRatio === "4:5") {
          setDimensions("1440x1880");  // Map 4:5 to Pro 4:5
        } else if (aspectRatio === "1:1") {
          setDimensions("1:1");
        } else if (aspectRatio === "1.91:1") {
          setDimensions("1.91:1");
        } else if (width && height) {
          // Try to map to closest standard ratio
          const ratio = width / height;
          if (ratio > 1.5 && ratio < 2.2) {
            setDimensions("1.91:1");  // Landscape
          } else if (ratio > 0.75 && ratio < 0.85) {
            setDimensions("1440x1880");  // Portrait-ish (Pro 4:5)
          } else if (ratio > 0.5 && ratio < 0.6) {
            setDimensions("9:16");  // Tall portrait
          } else {
            setDimensions("1:1");  // Default to square
          }
        }
      }
      
      loadMedia();
    };
    reader.readAsDataURL(file);
  };

  const handleMediaUpload = (type: "image" | "video" | "reel") => {
    const input = document.createElement("input");
    input.type = "file";
    
    if (type === "image") {
      input.accept = "image/*";
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          const isGif = file.type === "image/gif";
          handleFileUpload(file, isGif ? "gif" : "image");
          setHasMedia({ image: true, video: false });
        }
      };
    } else if (type === "video") {
      input.accept = "video/*";
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          handleFileUpload(file, "video");
          setHasMedia({ image: false, video: true });
        }
      };
    } else if (type === "reel") {
      input.accept = "video/*";
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          handleFileUpload(file, "video");
          setHasMedia({ image: false, video: false });
          setIsReel(true);
          if (platform !== "instagram") {
            setPlatform("instagram");
          }
          setPreviewType("ig-reel");
        }
      };
    }
    
    input.click();
  };

  const handleRemoveMedia = async () => {
    await deleteSimulatorMedia();
    setUploadedMedia(null);
    setHasMedia({ image: false, video: false });
    setIsReel(false);
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-400";
    if (score >= 70) return "text-blue-400";
    if (score >= 50) return "text-yellow-400";
    return "text-orange-400";
  };

  const getGradeColor = (grade: string) => {
    if (grade === "A+" || grade === "A") return "bg-green-500/20 text-green-400";
    if (grade === "B+" || grade === "B") return "bg-blue-500/20 text-blue-400";
    if (grade === "C") return "bg-yellow-500/20 text-yellow-400";
    return "bg-orange-500/20 text-orange-400";
  };

  const handlePreviewTypeChange = (newPreviewType: "twitter" | "ig-feed" | "ig-reel") => {
    setPreviewType(newPreviewType);
    // Sync isReel state with preview type selection
    if (newPreviewType === "ig-reel") {
      setIsReel(true);
    } else if (newPreviewType === "ig-feed") {
      setIsReel(false);
    }
    // Auto-switch platform when clicking cross-platform preview
    if (newPreviewType === "twitter" && platform === "instagram") {
      setPlatform("twitter");
    } else if ((newPreviewType === "ig-feed" || newPreviewType === "ig-reel") && platform === "twitter") {
      setPlatform("instagram");
    }
  };

  const [isAdviceOpen, setIsAdviceOpen] = useState(false);

  return (
    <div className="h-screen flex flex-col pl-20 animate-in fade-in duration-1000 ease-out">
      <div className="flex-1 overflow-auto">
        <div className="min-h-full flex items-center justify-center p-8">
          <div className="w-full max-w-[1800px] space-y-6 my-auto">
          <div className="grid grid-cols-1 lg:grid-cols-[0.85fr_1fr_0.85fr] gap-6">
            {/* Section 1: Input and Selection */}
            <div className="bg-black/20 rounded-[8px] p-6 space-y-4 lg:min-w-[360px] self-start">
              <Tabs value={platform} onValueChange={(v) => setPlatform(v as "twitter" | "instagram")}>
                <TabsList className="grid w-full grid-cols-2 bg-white/5 mb-4">
                  <TabsTrigger value="twitter" data-testid="tab-twitter" className="gap-2 data-[state=active]:bg-white/10">
                    <Twitter className="w-4 h-4" />
                    Tweet
                  </TabsTrigger>
                  <TabsTrigger value="instagram" data-testid="tab-instagram" className="gap-2 data-[state=active]:bg-white/10">
                    <Instagram className="w-4 h-4" />
                    Instagram
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              
              <div>
                <label className="text-xs text-white/50 mb-2 block">
                  {platform === "twitter" ? "Tweet Text" : "Caption"}
                </label>
                <Textarea
                  placeholder={platform === "twitter" ? "What's on your mind?" : "Write your caption..."}
                  value={tweetText}
                  onChange={(e) => setTweetText(e.target.value)}
                  className="min-h-[150px] resize-none bg-white/5 border-transparent text-white placeholder:text-white/40"
                  data-testid="textarea-tweet-input"
                />
                <p className="text-xs mt-1 text-white/40">
                  {tweetText.length} characters
                </p>
              </div>

              <div>
                <label className="text-xs text-white/50 mb-2 block">Account Size</label>
                <div className="flex gap-2">
                  {(["small", "medium", "large"] as const).map((size) => (
                    <Button
                      key={size}
                      variant="ghost"
                      onClick={() => setAccountSize(size)}
                      className={`flex-1 gap-2 rounded-[8px] ${accountSize === size ? 'bg-white/10 text-white' : 'bg-white/5 text-white/80 hover:bg-white/10'}`}
                      data-testid={`button-size-${size}`}
                    >
                      <Users className="w-4 h-4" />
                      {size.charAt(0).toUpperCase() + size.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>

              {platform === "instagram" && (
                <div>
                  <label className="text-xs text-white/50 mb-2 block">Dimensions / Aspect Ratio</label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDimensions("9:16")}
                      className={`gap-2 rounded-[8px] ${dimensions === "9:16" ? 'bg-white/10 text-white' : 'bg-transparent text-white/60 hover:bg-white/5'}`}
                      data-testid="button-dimension-9-16"
                    >
                      <Smartphone className="w-4 h-4" />
                      9:16 (Reels)
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDimensions("1440x1880")}
                      className={`gap-2 rounded-[8px] ${dimensions === "1440x1880" ? 'bg-white/10 text-white' : 'bg-transparent text-white/60 hover:bg-white/5'}`}
                      data-testid="button-dimension-pro"
                    >
                      <RectangleVertical className="w-4 h-4" />
                      Pro 4:5 (Feed)
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDimensions("1:1")}
                      className={`gap-2 rounded-[8px] ${dimensions === "1:1" ? 'bg-white/10 text-white' : 'bg-transparent text-white/60 hover:bg-white/5'}`}
                      data-testid="button-dimension-1-1"
                    >
                      <Square className="w-4 h-4" />
                      1:1 (Square)
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDimensions("1.91:1")}
                      className={`gap-2 rounded-[8px] ${dimensions === "1.91:1" ? 'bg-white/10 text-white' : 'bg-transparent text-white/60 hover:bg-white/5'}`}
                      data-testid="button-dimension-landscape"
                    >
                      <RectangleHorizontal className="w-4 h-4" />
                      1.91:1 (Landscape)
                    </Button>
                  </div>
                  <p className="text-xs text-white/60 mt-2">
                    {dimensions === "9:16" && "Best for Reels - 1080x1920 (+300% reach)"}
                    {dimensions === "1440x1880" && "Pro 4:5 - 1440x1880 (best Feed format, sharper than 1080x1350)"}
                    {dimensions === "1:1" && "Square format - 1080x1080 (baseline)"}
                    {dimensions === "1.91:1" && "Landscape - 1920x1080 (-50% reach penalty)"}
                  </p>
                </div>
              )}


              {platform === "instagram" && (
                <div className="flex items-center justify-between py-2 bg-white/5 rounded-[8px] px-4">
                  <div className="flex items-center gap-2">
                    <Users className={`w-5 h-5 ${isCollab ? 'text-purple-400' : 'text-white/40'}`} />
                    <div>
                      <Label htmlFor="collab-toggle" className="text-sm font-medium text-white cursor-pointer">
                        Collab Post
                      </Label>
                      <p className="text-xs text-white/60">
                        3x-4x more reach - pools both audiences
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="collab-toggle"
                    checked={isCollab}
                    onCheckedChange={setIsCollab}
                    data-testid="switch-collab"
                  />
                </div>
              )}

              {platform === "instagram" && (
                <div className="flex items-center justify-between py-2 bg-white/5 rounded-[8px] px-4">
                  <div className="flex items-center gap-2">
                    <Hash className={`w-5 h-5 ${audioTrending ? 'text-pink-400' : 'text-white/40'}`} />
                    <div>
                      <Label htmlFor="audio-toggle" className="text-sm font-medium text-white cursor-pointer">
                        Trending Audio
                      </Label>
                      <p className="text-xs text-white/60">
                        3-5x more reach with viral sounds
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="audio-toggle"
                    checked={audioTrending}
                    onCheckedChange={setAudioTrending}
                    data-testid="switch-audio"
                  />
                </div>
              )}

              {platform === "instagram" && (
                <div className="flex items-center justify-between py-2 bg-white/5 rounded-[8px] px-4">
                  <div className="flex items-center gap-2">
                    <BadgeCheck className={`w-5 h-5 ${isInstagramVerified ? 'text-blue-400' : 'text-white/40'}`} />
                    <div>
                      <Label htmlFor="ig-verified-toggle" className="text-sm font-medium text-white cursor-pointer">
                        Verified Account
                      </Label>
                      <p className="text-xs text-white/60">
                        +25% reach boost, 2x viral chance
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="ig-verified-toggle"
                    checked={isInstagramVerified}
                    onCheckedChange={handleInstagramVerifiedChange}
                    data-testid="switch-ig-verified-simulator"
                  />
                </div>
              )}

              {platform === "twitter" && (
                <div className="flex items-center justify-between py-2 bg-white/5 rounded-[8px] px-4">
                  <div className="flex items-center gap-2">
                    <BadgeCheck className={`w-5 h-5 ${isVerified ? 'text-blue-400' : 'text-white/40'}`} />
                    <div>
                      <Label htmlFor="verified-toggle" className="text-sm font-medium text-white cursor-pointer">
                        Verified Account
                      </Label>
                      <p className="text-xs text-white/60">
                        +228 boost, skips -128 penalty
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="verified-toggle"
                    checked={isVerified}
                    onCheckedChange={handleVerifiedChange}
                    data-testid="switch-verified"
                  />
                </div>
              )}

              {platform === "twitter" && (
                <div className="flex items-center justify-between py-2 bg-white/5 rounded-[8px] px-4">
                  <div className="flex items-center gap-2">
                    <Building2 className={`w-5 h-5 ${isOrganization ? "text-[#e2b719]" : "text-white/40"}`} />
                    <div>
                      <Label htmlFor="org-toggle" className="text-sm font-medium text-white cursor-pointer">
                        Official Organization
                      </Label>
                      <p className="text-xs text-white/60">
                        Gold badge, square profile
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="org-toggle"
                    checked={isOrganization}
                    onCheckedChange={handleOrganizationChange}
                    data-testid="switch-organization"
                  />
                </div>
              )}

              <div>
                <label className="text-xs text-white/50 mb-2 block">Posting Time</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["morning", "afternoon", "evening", "night"] as const).map((time) => (
                    <Button
                      key={time}
                      variant="ghost"
                      size="sm"
                      onClick={() => setPostingTime(time)}
                      className={`rounded-[8px] ${postingTime === time ? 'bg-white/10 text-white' : 'bg-transparent text-white/60 hover:bg-white/5'}`}
                      data-testid={`button-time-${time}`}
                    >
                      {time.charAt(0).toUpperCase() + time.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Media Upload Section */}
              <div>
                <label className="text-xs text-white/50 mb-2 block">Upload Media</label>
                {uploadedMedia ? (
                  <div className="flex items-center justify-between py-2 bg-white/5 rounded-[8px] px-4">
                    <div className="flex items-center gap-2">
                      {uploadedMedia.mediaType === "image" || uploadedMedia.mediaType === "gif" ? (
                        <ImageIcon className="w-4 h-4 text-white/60" />
                      ) : (
                        <Video className="w-4 h-4 text-white/60" />
                      )}
                      <span className="text-sm text-white/80 truncate max-w-[200px]">
                        {uploadedMedia.fileName}
                      </span>
                      {uploadedMedia.mediaType === "gif" && (
                        <Badge className="bg-purple-500/20 text-purple-400 text-xs">
                          GIF
                        </Badge>
                      )}
                      {uploadedMedia.aspectRatio && (
                        <Badge className="bg-blue-500/20 text-blue-400 text-xs">
                          {uploadedMedia.aspectRatio}
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveMedia}
                      className="rounded-[8px] h-8 w-8 p-0 hover:bg-red-500/10"
                      data-testid="button-remove-media"
                    >
                      <X className="w-4 h-4 text-red-400" />
                    </Button>
                  </div>
                ) : platform === "twitter" ? (
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      onClick={() => handleMediaUpload("image")}
                      className="flex-1 gap-2 rounded-[8px] bg-white/5 text-white/80 hover:bg-white/10"
                      data-testid="button-upload-image"
                    >
                      <Upload className="w-4 h-4" />
                      Image
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => handleMediaUpload("video")}
                      className="flex-1 gap-2 rounded-[8px] bg-white/5 text-white/80 hover:bg-white/10"
                      data-testid="button-upload-video"
                    >
                      <Upload className="w-4 h-4" />
                      Video
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      onClick={() => handleMediaUpload("image")}
                      className="flex-1 gap-2 rounded-[8px] bg-white/5 text-white/80 hover:bg-white/10"
                      data-testid="button-upload-image"
                    >
                      <Upload className="w-4 h-4" />
                      Image
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => handleMediaUpload("video")}
                      className="flex-1 gap-2 rounded-[8px] bg-white/5 text-white/80 hover:bg-white/10"
                      data-testid="button-upload-video"
                    >
                      <Upload className="w-4 h-4" />
                      Video Post
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => handleMediaUpload("reel")}
                      className="flex-1 gap-2 rounded-[8px] bg-white/5 text-white/80 hover:bg-white/10"
                      data-testid="button-upload-reel"
                    >
                      <Upload className="w-4 h-4" />
                      Reel
                    </Button>
                  </div>
                )}
              </div>

              {/* Save to Library and Clear All */}
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  onClick={handleSaveToLibrary}
                  className="flex-1 gap-2 rounded-[8px] bg-white/5 text-white/80 hover:bg-white/10"
                  data-testid="button-save-to-library"
                >
                  <Bookmark className="w-4 h-4" />
                  Save to Library
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleClearAll}
                  className="flex-1 gap-2 rounded-[8px] bg-white/5 text-white/80 hover:bg-red-500/10 hover:text-red-400"
                  data-testid="button-clear-simulator"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear All
                </Button>
              </div>

              {/* Set as Pinned/Featured for Profile Preview - Twitter only */}
              {platform === "twitter" && (
                <div>
                  <label className="text-xs text-white/50 mb-2 block">Profile Preview Tweets</label>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      onClick={handleSetAsPinned}
                      className="flex-1 gap-2 justify-center items-center rounded-[8px] bg-white/5 text-white/80 hover:bg-white/10"
                      data-testid="button-set-pinned"
                    >
                      <Pin className="w-4 h-4" />
                      Set as Pinned
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={handleSetAsFeatured}
                      className="flex-1 gap-2 justify-center items-center rounded-[8px] bg-white/5 text-white/80 hover:bg-white/10"
                      data-testid="button-set-featured"
                    >
                      <Twitter className="w-4 h-4" />
                      Set as Featured
                    </Button>
                  </div>
                  {/* Saved confirmation */}
                  <div className="h-6 mt-3 flex items-center">
                    {savedConfirmation ? (
                      <div 
                        className="flex items-center gap-1.5"
                        style={{ animation: 'fadeInOut 2.5s ease-in-out' }}
                      >
                        <div className="w-4 h-4 rounded-full bg-emerald-500/15 flex items-center justify-center">
                          <svg className="w-2.5 h-2.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                        <span className="text-xs text-emerald-400">{savedConfirmation}</span>
                      </div>
                    ) : (
                      <p className="text-xs text-white/40">
                        These tweets will appear on your Profile Simulator preview
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Section 2: Live Preview */}
            <div className="space-y-4">
              <div className="bg-black/20 rounded-[8px] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePreviewTypeChange("twitter")}
                      className={`rounded-[8px] h-7 px-3 gap-1.5 text-xs ${previewType === "twitter" ? 'bg-white/10 text-white' : 'bg-transparent text-white/60 hover:bg-white/5'}`}
                      data-testid="button-preview-twitter"
                    >
                      <Twitter className="w-3.5 h-3.5" />
                      Twitter
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePreviewTypeChange("ig-feed")}
                      className={`rounded-[8px] h-7 px-3 gap-1.5 text-xs ${previewType === "ig-feed" ? 'bg-white/10 text-white' : 'bg-transparent text-white/60 hover:bg-white/5'}`}
                      data-testid="button-preview-ig-feed"
                    >
                      <Square className="w-3.5 h-3.5" />
                      IG Feed
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePreviewTypeChange("ig-reel")}
                      className={`rounded-[8px] h-7 px-3 gap-1.5 text-xs ${previewType === "ig-reel" ? 'bg-white/10 text-white' : 'bg-transparent text-white/60 hover:bg-white/5'}`}
                      data-testid="button-preview-ig-reel"
                    >
                      <RectangleVertical className="w-3.5 h-3.5" />
                      IG Reel
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsMuted(!isMuted)}
                    className={`rounded-[8px] h-7 w-7 p-0 ${!isMuted ? 'bg-white/10 text-white' : 'bg-transparent text-white/60 hover:bg-white/5'}`}
                    data-testid="button-mute-toggle"
                    title={isMuted ? "Unmute" : "Mute"}
                  >
                    {isMuted ? (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                      </svg>
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      </svg>
                    )}
                  </Button>
                </div>

                <div className="flex items-center justify-center py-2">
                  {previewType === "twitter" && (
                    <div key="twitter" className="animate-in fade-in duration-1000 ease-out">
                      <TwitterPreview 
                        tweetText={tweetText} 
                        verified={isVerified}
                        isOrganization={isOrganization}
                        selectedDimensions={dimensions}
                        isMuted={isMuted}
                      />
                    </div>
                  )}
                  {previewType === "ig-feed" && (
                    <div key="ig-feed" className="animate-in fade-in duration-1000 ease-out">
                      <InstagramFeedPreview 
                        caption={tweetText} 
                        verified={isInstagramVerified}
                        hasImage={hasMedia.image || hasMedia.video}
                        selectedDimensions={dimensions}
                        isMuted={isMuted}
                        isCollab={isCollab}
                        useTrendingAudio={audioTrending}
                      />
                    </div>
                  )}
                  {previewType === "ig-reel" && (
                    <div key="ig-reel" className="animate-in fade-in duration-1000 ease-out">
                      <InstagramReelPreview 
                        caption={tweetText} 
                        verified={isInstagramVerified}
                        selectedDimensions={dimensions}
                        isMuted={isMuted}
                        isCollab={isCollab}
                        useTrendingAudio={audioTrending}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Section 3: Results and Scores */}
            <div className="space-y-4 self-start">
              {/* Account Size Guide - Always Visible */}
              <div className="bg-black/20 rounded-[8px] p-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-white/50">Account Size Guide</label>
                    <Badge className="bg-white/10 text-white/50 border-transparent text-xs">
                      Educational
                    </Badge>
                  </div>
                  <div className={`p-3 rounded-[8px] ${
                    accountSize === "small" 
                      ? "bg-blue-500/10" 
                      : accountSize === "medium" 
                      ? "bg-purple-500/10" 
                      : "bg-green-500/10"
                  }`} data-testid="account-size-guide">
                    <div className="flex items-start gap-2">
                      <Users className={`w-4 h-4 mt-0.5 ${
                        accountSize === "small" 
                          ? "text-blue-400" 
                          : accountSize === "medium" 
                          ? "text-purple-400" 
                          : "text-green-400"
                      }`} />
                      <div className="flex-1">
                        <span className="text-sm font-semibold text-white" style={{ textWrap: 'balance' }}>
                          {accountSize === "small" && "Small (0–10k) → Growing your\u00A0audience"}
                          {accountSize === "medium" && "Medium (10k–100k) → Building\u00A0momentum"}
                          {accountSize === "large" && "Large (100k+) → Established\u00A0reach"}
                        </span>
                        <p className="text-xs text-white/70 mt-1 leading-relaxed" style={{ textWrap: 'pretty' }}>
                          {accountSize === "small" && "Your reach grows with every post. Focus on engaging with your community — replies, retweets, and bookmarks all help your content spread\u00A0further."}
                          {accountSize === "medium" && "You're in the growth zone. Posting at the right time and using the right format matters most here — this is where breakout posts\u00A0happen."}
                          {accountSize === "large" && "Your posts already reach a wide audience. Stay consistent and keep engagement strong — one great post can spread across the\u00A0entire\u00A0platform."}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Viral Score */}
              {result && (
                <div className="bg-black/20 rounded-[8px] p-6 text-center">
                  <div className="flex items-center justify-center gap-3 mb-3">
                    <h2 className={`text-5xl font-bold ${getScoreColor(result.totalScore)}`}>
                      {result.totalScore}
                    </h2>
                    <Badge className={`text-xl px-4 py-1.5 ${getGradeColor(result.grade)}`}>
                      {result.grade}
                    </Badge>
                  </div>
                  <p className="text-sm text-white font-medium">{result.category}</p>
                  <p className="text-xs text-white/40 mt-2">Scores are educational and may be inaccurate</p>
                </div>
              )}

              {/* Boosts and Risks */}
              {result && (result.boosts.length > 0 || result.risks.length > 0) && (
                <div className="bg-black/20 rounded-[8px] p-4 space-y-4">
                  {result.boosts.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-white/80 text-sm font-medium">
                        <TrendingUp className="w-4 h-4 text-green-400" />
                        <span>Boosts ({result.boosts.length})</span>
                      </div>
                      <div className="space-y-2">
                        {result.boosts.map((boost, i) => (
                          <div
                            key={i}
                            className="p-3 rounded-[8px] bg-green-500/10"
                            data-testid={`boost-${i}`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-green-400 font-medium" style={{ textWrap: 'balance' }}>{boost.factor}</span>
                              <span className="text-green-400 text-sm font-bold">+{boost.score}</span>
                            </div>
                            <p className="text-xs text-white/60 mt-1" style={{ textWrap: 'pretty' }}>{boost.impact}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.risks.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-white/80 text-sm font-medium">
                        <TrendingDown className="w-4 h-4 text-red-400" />
                        <span>Risks ({result.risks.length})</span>
                      </div>
                      <div className="space-y-2">
                        {result.risks.map((risk, i) => (
                          <div
                            key={i}
                            className="p-3 rounded-[8px] bg-red-500/10"
                            data-testid={`risk-${i}`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-red-400 font-medium" style={{ textWrap: 'balance' }}>{risk.factor}</span>
                              <span className="text-red-400 text-sm font-bold">{risk.score}</span>
                            </div>
                            <p className="text-xs text-white/60 mt-1" style={{ textWrap: 'pretty' }}>{risk.impact}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Monitors Section */}
              {(mentionAnalysis.count > 0 || hashtagAnalysis.count > 0 || emojiAnalysis.count > 0) && (
                <div className="bg-black/20 rounded-[8px] p-4 space-y-4">
                  {/* @Mention Monitor */}
                  {mentionAnalysis.count > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-white/50">@Mention Monitor</label>
                        <Badge className="bg-white/10 text-white/50 border-transparent text-xs">
                          Educational
                        </Badge>
                      </div>
                      <div className={`p-3 rounded-[8px] ${
                        mentionAnalysis.status === "safe" 
                          ? "bg-green-500/10" 
                          : mentionAnalysis.status === "warning" 
                          ? "bg-yellow-500/10" 
                          : mentionAnalysis.status === "risky"
                          ? "bg-orange-500/10"
                          : "bg-red-500/10"
                      }`} data-testid="mention-analysis-display">
                        <div className="flex items-start gap-2">
                          <AtSign className={`w-4 h-4 mt-0.5 ${
                            mentionAnalysis.status === "safe" 
                              ? "text-green-400" 
                              : mentionAnalysis.status === "warning" 
                              ? "text-yellow-400" 
                              : mentionAnalysis.status === "risky"
                              ? "text-orange-400"
                              : "text-red-400"
                          }`} />
                          <div className="flex-1">
                            <span className="text-sm font-semibold text-white" style={{ textWrap: 'balance' }}>
                              {mentionAnalysis.message}
                            </span>
                            <p className="text-xs text-white/70 mt-1" style={{ textWrap: 'pretty' }}>
                              {mentionAnalysis.details}
                            </p>
                            {mentionAnalysis.mentions.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {mentionAnalysis.mentions.map((mention, index) => (
                                  <Badge key={index} className="bg-white/10 text-white/60 border-transparent text-xs">
                                    {mention}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Hashtag Monitor */}
                  {hashtagAnalysis.count > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-white/50">Hashtag Monitor</label>
                        <Badge className="bg-white/10 text-white/50 border-transparent text-xs">
                          Educational
                        </Badge>
                      </div>
                      <div className={`p-3 rounded-[8px] ${
                        hashtagAnalysis.status === "optimal" 
                          ? "bg-green-500/10" 
                          : hashtagAnalysis.status === "underuse" 
                          ? "bg-yellow-500/10" 
                          : "bg-red-500/10"
                      }`} data-testid="hashtag-analysis-display">
                        <div className="flex items-start gap-2">
                          <Hash className={`w-4 h-4 mt-0.5 ${
                            hashtagAnalysis.status === "optimal" 
                              ? "text-green-400" 
                              : hashtagAnalysis.status === "underuse" 
                              ? "text-yellow-400" 
                              : "text-red-400"
                          }`} />
                          <div className="flex-1">
                            <span className="text-sm font-semibold text-white" style={{ textWrap: 'balance' }}>
                              {hashtagAnalysis.message}
                            </span>
                            <p className="text-xs text-white/70 mt-1" style={{ textWrap: 'pretty' }}>
                              {hashtagAnalysis.details}
                            </p>
                            {hashtagAnalysis.hashtags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {hashtagAnalysis.hashtags.map((hashtag, index) => (
                                  <Badge key={index} className="bg-white/10 text-white/60 border-transparent text-xs">
                                    {hashtag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Emoji Monitor */}
                  {emojiAnalysis.count > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-white/50">Emoji Monitor</label>
                        <Badge className="bg-white/10 text-white/50 border-transparent text-xs">
                          Educational
                        </Badge>
                      </div>
                      <div className={`p-3 rounded-[8px] ${
                        emojiAnalysis.status === "optimal" 
                          ? "bg-green-500/10" 
                          : emojiAnalysis.status === "overuse"
                          ? "bg-red-500/10"
                          : "bg-white/5"
                      }`} data-testid="emoji-analysis-display">
                        <div className="flex items-start gap-2">
                          <span className={`text-lg mt-0.5 ${
                            emojiAnalysis.status === "optimal" 
                              ? "text-green-400" 
                              : emojiAnalysis.status === "overuse"
                              ? "text-red-400"
                              : "text-white/60"
                          }`}>&#127919;</span>
                          <div className="flex-1">
                            <span className="text-sm font-semibold text-white" style={{ textWrap: 'balance' }}>
                              {emojiAnalysis.message}
                            </span>
                            <p className="text-xs text-white/70 mt-1" style={{ textWrap: 'pretty' }}>
                              {emojiAnalysis.details}
                            </p>
                            {emojiAnalysis.emojis.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {emojiAnalysis.emojis.map((emoji, index) => (
                                  <span key={index} className="text-base">
                                    {emoji}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* How to Improve - Collapsible */}
              {result && result.advice.length > 0 && (
                <Collapsible open={isAdviceOpen} onOpenChange={setIsAdviceOpen}>
                  <div className="bg-black/20 rounded-[8px]">
                    <CollapsibleTrigger className="w-full p-4 flex items-center justify-between text-left" data-testid="button-toggle-advice">
                      <div className="flex items-center gap-2">
                        <Lightbulb className="w-4 h-4 text-white" />
                        <span className="text-sm font-semibold text-white">How to Improve</span>
                        <Badge className="bg-white/10 text-white/50 border-transparent text-xs">
                          {result.advice.length} tips
                        </Badge>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-white/60 transition-transform ${isAdviceOpen ? 'rotate-180' : ''}`} />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="px-4 pb-4">
                        <ul className="space-y-2">
                          {result.advice.map((tip, i) => (
                            <li key={i} className="text-sm text-white/80 flex items-start gap-2" data-testid={`advice-${i}`} style={{ textWrap: 'pretty' }}>
                              <span className="text-white/40">•</span>
                              {tip}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              )}
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
