import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getActiveProfile, updateProfile, ProfileData, getProfileGridImages, saveProfileGridImages, getProfileReelGridImages, saveProfileReelGridImages, getCuratedTweets, clearAllCuratedTweets, clearPinnedTweet, deleteFeaturedTweet, promoteFeaturedToPinned, saveSimulatorMedia, deleteSimulatorMedia, type CuratedTweet } from "@/lib/indexedDB";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { 
  Twitter, 
  Instagram,
  BadgeCheck,
  AtSign,
  Type,
  AlignLeft,
  Sparkles,
  MapPin,
  Link2,
  MoreHorizontal,
  Mail,
  CalendarDays,
  Camera,
  X,
  Upload,
  ImageIcon,
  Pin,
  MessageCircle,
  Repeat2,
  Heart,
  Bookmark,
  Share,
  Building2,
  Trash2,
  ArrowLeft,
  Search,
  Tags,
  Users,
  Monitor,
  Tablet,
  Smartphone
} from "lucide-react";

// Helper to render text with blue @mentions, #hashtags, and links (Twitter style)
function renderTweetText(text: string) {
  if (!text) return null;
  const parts = text.split(/(@[\w.]+|#[\w]+|https?:\/\/[^\s]+)/g);
  return parts.map((part, index) => {
    if (part.match(/^@[\w.]+$/) || part.match(/^#[\w]+$/) || part.match(/^https?:\/\//)) {
      return <span key={index} className="text-[#1d9bf0]">{part}</span>;
    }
    return part;
  });
}

interface ScoreFactor {
  factor: string;
  impact: string;
  score: number;
  type: "username" | "bio" | "location" | "link" | "general";
}

interface ProfileScore {
  score: number;
  grade: string;
  category: string;
  boosts: ScoreFactor[];
  risks: ScoreFactor[];
}

interface HighlightItem {
  id: string;
  name: string;
  image: string;
}

interface SimulatorState {
  bio: string;
  category: string;
  isVerified: boolean;
  isOrganization: boolean;
  platform: "twitter" | "instagram";
  link: string;
  location: string;
  headerImage: string;
  profilePic: string;
  hasMultipleLinks: boolean;
  showHighlights: boolean;
  highlights: HighlightItem[];
  followerCount: number;
  followingCount: number;
  postCount: number;
}

// Format numbers: 1000 -> 1K, 1500000 -> 1.5M, etc.
function formatNumber(num: number): string {
  if (num >= 1000000) {
    const millions = num / 1000000;
    return millions % 1 === 0 ? `${millions}M` : `${millions.toFixed(1).replace(/\.0$/, '')}M`;
  }
  if (num >= 1000) {
    const thousands = num / 1000;
    return thousands % 1 === 0 ? `${thousands}K` : `${thousands.toFixed(1).replace(/\.0$/, '')}K`;
  }
  return num.toString();
}

// Parse number input (handles commas, "1M", "1K", etc.)
function parseNumberInput(value: string): number {
  const cleaned = value.replace(/,/g, '').trim().toUpperCase();
  if (cleaned.endsWith('M')) {
    return Math.round(parseFloat(cleaned.replace('M', '')) * 1000000) || 0;
  }
  if (cleaned.endsWith('K')) {
    return Math.round(parseFloat(cleaned.replace('K', '')) * 1000) || 0;
  }
  return parseInt(cleaned) || 0;
}

const SIMULATOR_STATE_KEY_PREFIX = "profileSimulatorState_";

function getSimulatorStateKey(profileId: string): string {
  return `${SIMULATOR_STATE_KEY_PREFIX}${profileId}`;
}

function saveSimulatorState(profileId: string, state: SimulatorState) {
  localStorage.setItem(getSimulatorStateKey(profileId), JSON.stringify(state));
}

function loadSimulatorState(profileId: string): SimulatorState | null {
  const saved = localStorage.getItem(getSimulatorStateKey(profileId));
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return null;
    }
  }
  return null;
}


interface ScoreInput {
  displayName: string;
  bio: string;
  isVerified: boolean;
  platform: "twitter" | "instagram";
}

function calculateProfileScore(input: ScoreInput): ProfileScore | null {
  const { displayName, bio, isVerified, platform } = input;
  
  if (!displayName.trim() && !bio.trim()) {
    return null;
  }

  let score = 35;
  const boosts: ScoreFactor[] = [];
  const risks: ScoreFactor[] = [];

  const cleanDisplayName = displayName.trim();

  // Verified: Platform-specific weights (matched to Simulator)
  if (isVerified) {
    if (platform === "twitter") {
      const boost = 12;
      score += boost;
      boosts.push({ factor: "Verified Account", impact: "Major credibility boost - algorithm gives +228 reputation baseline", score: boost, type: "general" });
    } else {
      const boost = 4;
      score += boost;
      boosts.push({ factor: "Verified Account", impact: "5% passive visibility increase", score: boost, type: "general" });
    }
  }

  // Display Name: Unicode/Emoji (1-4 = +4, 5+ = -5)
  if (cleanDisplayName) {
    const emojiRegex = /[\u2600-\u27BF\u2B50\u2764\uFE0F]|[\uD83C-\uD83E][\uDC00-\uDFFF]/g;
    const emojiMatches = cleanDisplayName.match(emojiRegex) || [];
    const emojiCount = emojiMatches.length;
    
    if (emojiCount >= 1 && emojiCount <= 4) {
      const boost = 4;
      score += boost;
      boosts.push({ factor: "Emoji in Display Name", impact: "Adds emotion and visual rhythm", score: boost, type: "username" });
    } else if (emojiCount >= 5) {
      const penalty = -5;
      score += penalty;
      risks.push({ factor: "Emoji Overuse in Display Name", impact: "5+ emojis break trust and visual rhythm", score: penalty, type: "username" });
    }
  }

  // Display Name: All Caps buff
  if (cleanDisplayName && cleanDisplayName === cleanDisplayName.toUpperCase() && /[A-Z]/.test(cleanDisplayName)) {
    const boost = 13;
    score += boost;
    boosts.push({ factor: "All Caps Display Name", impact: "Bold, memorable presence", score: boost, type: "username" });
  }

  // Display Name: One Word buff - no spaces = one word
  if (cleanDisplayName && !cleanDisplayName.includes(" ") && cleanDisplayName.length > 0) {
    const boost = 15;
    score += boost;
    boosts.push({ factor: "One Word Display Name", impact: "Pure linguistic identity", score: boost, type: "username" });
  }

  // Remove emojis from bio for counting
  const emojiRegexBio = /[\u2600-\u27BF\u2B50\u2764\uFE0F]|[\uD83C-\uD83E][\uDC00-\uDFFF]/g;
  const bioTextNoEmoji = bio.trim().replace(emojiRegexBio, '');
  const bioCharCount = bioTextNoEmoji.length;
  const bioWordCount = bioTextNoEmoji.split(/\s+/).filter(w => w.length > 0).length;
  const bioText = bio.trim();

  // Display Name: Lowercase buff (fully lowercase)
  if (cleanDisplayName && cleanDisplayName === cleanDisplayName.toLowerCase() && /[a-z]/.test(cleanDisplayName)) {
    const boost = 13;
    score += boost;
    boosts.push({ factor: "Lowercase Display Name", impact: "Modern, confident aesthetic", score: boost, type: "username" });
  }


  // Bio scoring - one-line fit at 598px
  // Core rules: under 100 chars, under 15 words
  // Preferred: 50-70 chars, 5-10 words
  
  const isIdealBio = bioCharCount >= 50 && bioCharCount <= 70 && bioWordCount >= 5 && bioWordCount <= 10;
  const isShortBio = bioCharCount < 100 && bioWordCount < 15;
  
  if (bioText && isIdealBio) {
    const boost = 14;
    score += boost;
    boosts.push({ factor: "Ideal Bio", impact: "50-70 chars, 5-10 words - perfect one-line fit", score: boost, type: "bio" });
  } else if (bioText && isShortBio) {
    const boost = 8;
    score += boost;
    boosts.push({ factor: "Short Bio", impact: "Under 100 chars and 15 words", score: boost, type: "bio" });
  }

  // Bio: Long debuff (>100 chars OR >15 words)
  if (bioText && (bioCharCount > 100 || bioWordCount > 15)) {
    const penalty = -10;
    score += penalty;
    risks.push({ factor: "Long Bio", impact: "Exceeds 100 chars or 15 words", score: penalty, type: "bio" });
  }

  // Bio: Long URL debuff
  const urlRegex = /https?:\/\/[^\s]+/g;
  const urls = bioText.match(urlRegex) || [];
  const hasLongUrl = urls.some(url => url.length > 25);
  if (hasLongUrl) {
    const penalty = -6;
    score += penalty;
    risks.push({ factor: "Long URL in Bio", impact: "URLs break one-line flow", score: penalty, type: "bio" });
  }

  // Bio: Flow-breaking symbols debuff
  const flowBreakers = /[|\\\/→←↔⇒⇐•·]/g;
  if (flowBreakers.test(bioText)) {
    const penalty = -4;
    score += penalty;
    risks.push({ factor: "Flow-Breaking Symbols", impact: "Symbols disrupt clean reading", score: penalty, type: "bio" });
  }

  // Bio: Lowercase buff
  if (bioText && bioText === bioText.toLowerCase() && /[a-z]/.test(bioText)) {
    const boost = 12;
    score += boost;
    boosts.push({ factor: "Lowercase Bio", impact: "Modern, soft, designer-coded aesthetic", score: boost, type: "bio" });
  }

  // Bio: Hashtag debuff
  if (bio.includes("#")) {
    const hashtagCount = (bio.match(/#\w+/g) || []).length;
    if (hashtagCount > 0) {
      const penalty = -11;
      score += penalty;
      risks.push({ factor: "Hashtag in Bio", impact: "Cheapens silhouette, beginner-coded energy", score: penalty, type: "bio" });
    }
  }

  // Bio: New line debuff
  if (bio.includes("\n")) {
    const newlineCount = (bio.match(/\n/g) || []).length;
    if (newlineCount > 0) {
      const penalty = -9;
      score += penalty;
      risks.push({ factor: "New Line in Bio", impact: "Breaks aura flow, feels unintentional", score: penalty, type: "bio" });
    }
  }

  score = Math.max(0, Math.min(100, score));

  let grade = "F";
  let category = "Low aura potential";

  if (score >= 90) {
    grade = "A+";
    category = "Elite aura profile";
  } else if (score >= 80) {
    grade = "A";
    category = "Strong presence";
  } else if (score >= 70) {
    grade = "B+";
    category = "Good foundation";
  } else if (score >= 60) {
    grade = "B";
    category = "Room to optimize";
  } else if (score >= 50) {
    grade = "C";
    category = "Average profile";
  } else if (score >= 40) {
    grade = "D";
    category = "Below average";
  }

  return {
    score,
    grade,
    category,
    boosts,
    risks,
  };
}

export default function ProfileSimulator() {
  const navigate = useNavigate();
  const [platform, setPlatformState] = useState<"twitter" | "instagram">(() => {
    const saved = localStorage.getItem("contentOS_activePlatform");
    return saved === "instagram" ? "instagram" : "twitter";
  });
  const setPlatform = (p: "twitter" | "instagram") => {
    setPlatformState(p);
    localStorage.setItem("contentOS_activePlatform", p);
  };
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const profileRef = useRef<ProfileData | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [handle, setHandle] = useState("");
  const [bio, setBio] = useState("");
  const [category, setCategory] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [isOrganization, setIsOrganization] = useState(false);
  const [link, setLink] = useState("");
  const [location, setLocation] = useState("");
  const [headerImage, setHeaderImage] = useState("");
  const [profilePic, setProfilePic] = useState("");
  const [hasMultipleLinks, setHasMultipleLinks] = useState(false);
  const [showHighlights, setShowHighlights] = useState(false);
  const [highlights, setHighlights] = useState<HighlightItem[]>([]);
  const [editingHighlightId, setEditingHighlightId] = useState<string | null>(null);
  const [gridImages, setGridImages] = useState<string[]>([]);
  const [reelImages, setReelImages] = useState<string[]>([]);
  const [activeIgTab, setActiveIgTab] = useState<"grid" | "reels">("grid");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dragType, setDragType] = useState<"grid" | "reel" | "tweet" | null>(null);
  const [result, setResult] = useState<ProfileScore | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [curatedTweets, setCuratedTweets] = useState<{ pinned: CuratedTweet | null; featured: CuratedTweet[] }>({ pinned: null, featured: [] });
  const [followerCount, setFollowerCount] = useState(8234);
  const [followingCount, setFollowingCount] = useState(742);
  const [postCount, setPostCount] = useState(847);
  const { toast } = useToast();

  const loadProfileData = async () => {
    const data = await getActiveProfile();
    setProfile(data);
    profileRef.current = data;
    if (data) {
      setDisplayName(data.username || "");
      setHandle(data.handle || "");
      setProfilePic(data.profilePic || "");
      setIsVerified(data.isVerified || false);
      setIsOrganization(data.isOrganization || false);
    }
  };

  const syncProfileToSettings = async (newDisplayName: string, newHandle: string) => {
    const currentProfile = profileRef.current;
    if (currentProfile) {
      const updatedProfile = {
        ...currentProfile,
        username: newDisplayName,
        handle: newHandle,
      };
      await updateProfile(updatedProfile);
      setProfile(updatedProfile);
      profileRef.current = updatedProfile;
    }
  };

  const handleDisplayNameChange = (value: string) => {
    setDisplayName(value);
    syncProfileToSettings(value, handle);
  };

  const handleHandleChange = (value: string) => {
    const formatted = value.startsWith("@") ? value : `@${value}`;
    setHandle(formatted);
    syncProfileToSettings(displayName, formatted);
  };

  const handleVerifiedChange = async (verified: boolean) => {
    setIsVerified(verified);
    if (profile) {
      const updatedProfile = { ...profile, isVerified: verified };
      await updateProfile(updatedProfile);
      setProfile(updatedProfile);
      profileRef.current = updatedProfile;
    }
  };

  const handleOrganizationChange = async (isOrg: boolean) => {
    setIsOrganization(isOrg);
    if (profile) {
      const updatedProfile = { ...profile, isOrganization: isOrg };
      await updateProfile(updatedProfile);
      setProfile(updatedProfile);
      profileRef.current = updatedProfile;
    }
  };

  const loadAllProfileData = async (profileId: string, profileData?: ProfileData | null) => {
    // Load simulator state for this profile
    const savedState = loadSimulatorState(profileId);
    if (savedState) {
      setBio(savedState.bio);
      setCategory(savedState.category || "");
      setIsVerified(savedState.isVerified);
      setIsOrganization(savedState.isOrganization || false);
      setLink(savedState.link || "");
      setLocation(savedState.location || "");
      setHeaderImage(savedState.headerImage || "");
      setHasMultipleLinks(savedState.hasMultipleLinks || false);
      setShowHighlights(savedState.showHighlights === true);
      setHighlights(savedState.highlights || []);
      setFollowerCount(savedState.followerCount ?? 8234);
      setFollowingCount(savedState.followingCount ?? 742);
      setPostCount(savedState.postCount ?? 847);
    } else {
      setBio("");
      setCategory("");
      setIsVerified(false);
      setIsOrganization(false);
      setLink("");
      setLocation("");
      setHeaderImage("");
      setHasMultipleLinks(false);
      setShowHighlights(false);
      setHighlights([]);
      setFollowerCount(8234);
      setFollowingCount(742);
      setPostCount(847);
    }
    
    // Always use profile pic from profile store (IndexedDB) as source of truth
    if (profileData) {
      setProfilePic(profileData.profilePic || "");
      setDisplayName(profileData.username || "");
      setHandle(profileData.handle || "");
      setIsVerified(profileData.isVerified || false);
      setIsOrganization(profileData.isOrganization || false);
    }

    // Load grid images from IndexedDB for this profile
    const savedGridImages = await getProfileGridImages(profileId);
    setGridImages(savedGridImages);

    // Load reel grid images from IndexedDB for this profile
    const savedReelImages = await getProfileReelGridImages(profileId);
    setReelImages(savedReelImages);

    // Load curated tweets for this profile
    const tweets = await getCuratedTweets(profileId);
    setCuratedTweets(tweets);
  };

  useEffect(() => {
    const initializeData = async () => {
      const profileData = await getActiveProfile();
      setProfile(profileData);
      profileRef.current = profileData;
      if (profileData) {
        await loadAllProfileData(profileData.id, profileData);
      }
      
      setIsLoaded(true);
    };
    
    initializeData();

    const handleProfileUpdate = () => {
      loadProfileData();
    };
    window.addEventListener("profileUpdated", handleProfileUpdate);

    const handleProfileChanged = async () => {
      setIsLoaded(false);
      const profileData = await getActiveProfile();
      setProfile(profileData);
      profileRef.current = profileData;
      if (profileData) {
        await loadAllProfileData(profileData.id, profileData);
      }
      setIsLoaded(true);
    };
    window.addEventListener("activeProfileChanged", handleProfileChanged);

    const handleTweetsUpdate = async () => {
      const currentProfile = profileRef.current;
      if (currentProfile) {
        const tweets = await getCuratedTweets(currentProfile.id);
        setCuratedTweets(tweets);
      }
    };
    window.addEventListener("profileTweetsUpdated", handleTweetsUpdate);

    return () => {
      window.removeEventListener("profileUpdated", handleProfileUpdate);
      window.removeEventListener("activeProfileChanged", handleProfileChanged);
      window.removeEventListener("profileTweetsUpdated", handleTweetsUpdate);
    };
  }, []);

  useEffect(() => {
    if (!isLoaded || !profile?.id) return;
    
    saveSimulatorState(profile.id, {
      platform,
      bio,
      category,
      isVerified,
      isOrganization,
      link,
      location,
      headerImage,
      profilePic,
      hasMultipleLinks,
      showHighlights,
      highlights,
      followerCount,
      followingCount,
      postCount,
    });
  }, [platform, bio, category, isVerified, isOrganization, link, location, headerImage, profilePic, hasMultipleLinks, showHighlights, highlights, followerCount, followingCount, postCount, isLoaded, profile?.id]);

  // Save grid images to IndexedDB separately (larger storage)
  useEffect(() => {
    if (!isLoaded || !profile?.id) return;
    saveProfileGridImages(profile.id, gridImages);
  }, [gridImages, isLoaded, profile?.id]);

  // Save reel grid images to IndexedDB separately
  useEffect(() => {
    if (!isLoaded || !profile?.id) return;
    saveProfileReelGridImages(profile.id, reelImages);
  }, [reelImages, isLoaded, profile?.id]);

  const cleanHandle = handle.replace(/^@/, "") || "";

  useEffect(() => {
    const score = calculateProfileScore({
      displayName,
      bio,
      isVerified,
      platform,
    });
    setResult(score);
  }, [displayName, bio, isVerified, platform]);

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

  const getBoostLabel = (factor: string): string => {
    const mappings: Record<string, string> = {
      "One Word Display Name": "One Word Boost",
      "Lowercase Display Name": "Lowercase Boost",
      "All Caps Display Name": "All Caps Boost",
      "Emoji in Display Name": "Unicode Boost",
      "Verified Account": "Verified Boost",
      "Ideal Bio": "Ideal Bio Boost",
      "Short Bio": "Short Bio Boost",
      "Lowercase Bio": "Lowercase Boost",
    };
    return mappings[factor] || factor.replace(" Display Name", " Boost").replace(" in Bio", " Boost");
  };

  const getDebuffLabel = (factor: string): string => {
    const mappings: Record<string, string> = {
      "Emoji Overuse in Display Name": "Emoji Overuse Debuff",
      "Long Bio": "Long Bio Debuff",
      "Long URL in Bio": "Long URL Debuff",
      "Flow-Breaking Symbols": "Symbol Debuff",
      "Hashtag in Bio": "Hashtag Debuff",
      "New Line in Bio": "New Line Debuff",
    };
    return mappings[factor] || factor + " Debuff";
  };

  const handleHeaderImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setHeaderImage(dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeHeaderImage = () => {
    setHeaderImage("");
  };

  const handleProfilePicUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const dataUrl = event.target?.result as string;
        setProfilePic(dataUrl);
        // Sync to profile store
        if (profile) {
          const updatedProfile = { ...profile, profilePic: dataUrl };
          await updateProfile(updatedProfile);
          setProfile(updatedProfile);
          profileRef.current = updatedProfile;
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const removeProfilePic = async () => {
    setProfilePic("");
    // Sync to profile store
    if (profile) {
      const updatedProfile = { ...profile, profilePic: null };
      await updateProfile(updatedProfile);
      setProfile(updatedProfile);
      profileRef.current = updatedProfile;
    }
  };

  const handleGridImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newImages: string[] = [];
      const maxToAdd = Math.min(files.length, 6 - gridImages.length);
      
      for (let i = 0; i < maxToAdd; i++) {
        const file = files[i];
        const reader = new FileReader();
        reader.onload = (event) => {
          const dataUrl = event.target?.result as string;
          setGridImages(prev => {
            if (prev.length >= 6) return prev;
            return [...prev, dataUrl];
          });
        };
        reader.readAsDataURL(file);
      }
    }
    // Reset input
    e.target.value = '';
  };

  const removeGridImage = (index: number) => {
    setGridImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleReelImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const maxToAdd = Math.min(files.length, 6 - reelImages.length);

      for (let i = 0; i < maxToAdd; i++) {
        const file = files[i];
        const reader = new FileReader();
        reader.onload = (event) => {
          const dataUrl = event.target?.result as string;
          setReelImages(prev => {
            if (prev.length >= 6) return prev;
            return [...prev, dataUrl];
          });
        };
        reader.readAsDataURL(file);
      }
    }
    e.target.value = '';
  };

  const removeReelImage = (index: number) => {
    setReelImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleDragStart = (index: number, type: "grid" | "reel" | "tweet") => {
    setDragIndex(index);
    setDragType(type);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
    setDragType(null);
  };

  const handleDrop = (toIndex: number, type: "grid" | "reel" | "tweet") => {
    if (dragIndex === null || dragType !== type) return;
    if (type === "tweet") {
      setCuratedTweets(prev => {
        const updated = [...prev.featured];
        const [moved] = updated.splice(dragIndex, 1);
        updated.splice(toIndex, 0, moved);
        return { ...prev, featured: updated };
      });
    } else {
      const setImages = type === "grid" ? setGridImages : setReelImages;
      setImages(prev => {
        const updated = [...prev];
        const [moved] = updated.splice(dragIndex, 1);
        updated.splice(toIndex, 0, moved);
        return updated;
      });
    }
    handleDragEnd();
  };

  const handleHighlightImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const maxToAdd = Math.min(files.length, 6 - highlights.length);
      for (let i = 0; i < maxToAdd; i++) {
        const file = files[i];
        const reader = new FileReader();
        reader.onload = (event) => {
          const dataUrl = event.target?.result as string;
          const newHighlight: HighlightItem = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            name: "Highlight",
            image: dataUrl,
          };
          setHighlights(prev => {
            if (prev.length >= 6) return prev;
            return [...prev, newHighlight];
          });
        };
        reader.readAsDataURL(file);
      }
    }
    e.target.value = '';
  };

  const removeHighlight = (id: string) => {
    setHighlights(prev => prev.filter(h => h.id !== id));
  };

  const updateHighlightName = (id: string, name: string) => {
    setHighlights(prev => prev.map(h => h.id === id ? { ...h, name } : h));
  };

  const handleClearAll = async () => {
    if (!profile?.id) return;
    
    await clearAllCuratedTweets(profile.id);
    setCuratedTweets({ pinned: null, featured: [] });
    
    window.dispatchEvent(new Event("profileTweetsUpdated"));
    
    toast({ title: "Cleared", description: "Profile tweets have been cleared" });
  };

  return (
    <div className="h-screen flex flex-col pl-20 animate-in fade-in duration-700 ease-in-out">
      <div className="flex-1 overflow-auto">
        <div className="min-h-full flex items-center justify-center p-8">
          <div className="w-full max-w-[1800px] space-y-6 my-auto">
            <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr_1.1fr] gap-6">
              
              {/* Section 1: Input */}
              <div className="bg-black/20 rounded-[8px] p-6 space-y-4 lg:min-w-[360px] self-start">
                <Tabs value={platform} onValueChange={(v) => setPlatform(v as "twitter" | "instagram")}>
                  <TabsList className="grid w-full grid-cols-2 bg-white/5 mb-4">
                    <TabsTrigger value="twitter" data-testid="tab-profile-twitter" className="gap-2 data-[state=active]:bg-white/10">
                      <Twitter className="w-4 h-4" />
                      Twitter
                    </TabsTrigger>
                    <TabsTrigger value="instagram" data-testid="tab-profile-instagram" className="gap-2 data-[state=active]:bg-white/10">
                      <Instagram className="w-4 h-4" />
                      Instagram
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                {/* Profile Preview Section */}
                <div className="space-y-3">
                  <label className="text-xs text-white/50 block">Profile Preview</label>
                  <p className="text-xs text-white/40">Customize how your content appears in the live preview.</p>
                  
                  {/* Profile Picture Upload */}
                  <div className="flex items-center gap-3">
                    <div className="relative group">
                      <div className="w-14 h-14 rounded-full bg-zinc-800 overflow-hidden ">
                        {profilePic ? (
                          <img 
                            src={profilePic} 
                            alt="Profile"
                            className="w-full h-full object-cover"
                            data-testid="img-input-profile-pic"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-6 h-6 text-white/30" />
                          </div>
                        )}
                      </div>
                      {profilePic && (
                        <button
                          onClick={removeProfilePic}
                          className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 transition-colors"
                          data-testid="button-remove-profile-pic"
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                      )}
                    </div>
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleProfilePicUpload}
                        className="hidden"
                        id="profile-pic-upload"
                        data-testid="input-profile-pic-upload"
                      />
                      <label
                        htmlFor="profile-pic-upload"
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-[8px] bg-white/5  text-sm text-white/80 cursor-pointer hover:bg-white/10 transition-colors"
                        data-testid="button-upload-profile-pic"
                      >
                        <Upload className="w-4 h-4" />
                        Upload Profile Picture
                      </label>
                      <p className="text-xs text-white/40 mt-1">JPEG, PNG, GIF, WebP (max 5MB)</p>
                    </div>
                  </div>

                  {/* Header Image Upload - Twitter only */}
                  {platform === "twitter" && (
                  <div>
                    <label className="text-xs text-white/50 mb-2 block">Upload Header</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleHeaderImageUpload}
                      className="hidden"
                      id="header-image-upload-input"
                      data-testid="input-header-image-upload-input"
                    />
                    {headerImage ? (
                      <div className="flex items-center justify-between py-2 bg-white/5 rounded-[8px] px-4 ">
                        <div className="flex items-center gap-2">
                          <Camera className="w-4 h-4 text-white/60" />
                          <span className="text-sm text-white/80 truncate max-w-[200px]">
                            Header Image
                          </span>
                          <Badge className="bg-blue-500/20 text-blue-400 text-xs">
                            3:1
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={removeHeaderImage}
                          className="rounded-[8px] h-8 w-8 p-0 hover:bg-red-500/10"
                          data-testid="button-remove-header-input"
                        >
                          <X className="w-4 h-4 text-red-400" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => document.getElementById('header-image-upload-input')?.click()}
                        className="rounded-[8px] bg-transparent text-white/60 hover:bg-white/5 w-full justify-center h-auto py-3"
                        data-testid="button-upload-header-input"
                      >
                        <Upload className="w-5 h-5 mr-2" />
                        <span className="text-sm">Upload Header Image</span>
                      </Button>
                    )}
                  </div>
                  )}
                </div>

                <div>
                  <label className="text-xs text-white/50 mb-2 block">
                    Display Name
                  </label>
                  <Input
                    placeholder="Your Name"
                    value={displayName}
                    onChange={(e) => handleDisplayNameChange(e.target.value)}
                    className="bg-white/5 border-transparent text-white placeholder:text-white/40"
                    data-testid="input-display-name"
                  />
                </div>

                <div>
                  <label className="text-xs text-white/50 mb-2 block">
                    Handle
                  </label>
                  <Input
                    placeholder="@yourhandle"
                    value={handle}
                    onChange={(e) => handleHandleChange(e.target.value)}
                    className="bg-white/5 border-transparent text-white placeholder:text-white/40"
                    data-testid="input-handle"
                  />
                  <p className="text-xs mt-1 text-white/40">
                    {cleanHandle.length} characters
                  </p>
                </div>

                {/* Category - Instagram only */}
                {platform === "instagram" && (
                  <div>
                    <label className="text-xs text-white/50 mb-2 block">
                      Category
                    </label>
                    <Input
                      placeholder="Musician, Artist, Entertainer..."
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="bg-white/5 border-transparent text-white placeholder:text-white/40"
                      data-testid="input-category"
                    />
                  </div>
                )}

                <div>
                  <label className="text-xs text-white/50 mb-2 block">
                    Bio
                  </label>
                  <Textarea
                    placeholder="Write your bio..."
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="min-h-[100px] resize-none bg-white/5 border-transparent text-white placeholder:text-white/40"
                    data-testid="textarea-bio"
                  />
                  <p className="text-xs mt-1 text-white/40">
                    {(() => {
                      const noEmoji = bio.trim().replace(/[\u2600-\u27BF\u2B50\u2764\uFE0F]|[\uD83C-\uD83E][\uDC00-\uDFFF]/g, '');
                      const chars = noEmoji.length;
                      const words = noEmoji.split(/\s+/).filter(w => w.length > 0).length;
                      return `${chars} chars · ${words} words`;
                    })()}
                  </p>
                </div>

                {/* Link and Location Row */}
                <div className={`grid gap-3 ${platform === "twitter" ? "grid-cols-2" : "grid-cols-1"}`}>
                  <div>
                    <label className="text-xs text-white/50 mb-2 block">
                      Link
                    </label>
                    <Input
                      placeholder="https://yourwebsite.com"
                      value={link}
                      onChange={(e) => setLink(e.target.value)}
                      className="bg-white/5 border-transparent text-white placeholder:text-white/40"
                      data-testid="input-link"
                    />
                  </div>
                  {platform === "twitter" && (
                    <div>
                      <label className="text-xs text-white/50 mb-2 block">
                        Location
                      </label>
                      <Input
                        placeholder="New York, NY"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="bg-white/5 border-transparent text-white placeholder:text-white/40"
                        data-testid="input-location"
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between p-3 rounded-[8px] bg-white/5 ">
                  <div className="flex items-center gap-2">
                    <BadgeCheck className={`w-4 h-4 ${isVerified ? "text-blue-400" : "text-white/40"}`} />
                    <span className="text-sm text-white/80">Verified Account</span>
                  </div>
                  <Switch
                    checked={isVerified}
                    onCheckedChange={handleVerifiedChange}
                    data-testid="switch-verified"
                  />
                </div>

                {/* Official Organization Toggle - Twitter only */}
                {platform === "twitter" && (
                <div className="flex items-center justify-between p-3 rounded-[8px] bg-white/5 ">
                  <div className="flex items-center gap-2">
                    <Building2 className={`w-4 h-4 ${isOrganization ? "text-[#e2b719]" : "text-white/40"}`} />
                    <span className="text-sm text-white/80">Official Organization</span>
                  </div>
                  <Switch
                    checked={isOrganization}
                    onCheckedChange={handleOrganizationChange}
                    data-testid="switch-organization"
                  />
                </div>
                )}

                {/* Stats Section */}
                <div className="space-y-3">
                  <label className="text-xs text-white/50 block">
                    Stats
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Input
                        placeholder="Followers"
                        value={followerCount.toLocaleString()}
                        onChange={(e) => setFollowerCount(parseNumberInput(e.target.value))}
                        className="bg-white/5 border-transparent text-white placeholder:text-white/40 text-center"
                        data-testid="input-followers"
                      />
                      <p className="text-xs mt-1 text-white/40 text-center">Followers</p>
                    </div>
                    <div>
                      <Input
                        placeholder="Following"
                        value={followingCount.toLocaleString()}
                        onChange={(e) => setFollowingCount(parseNumberInput(e.target.value))}
                        className="bg-white/5 border-transparent text-white placeholder:text-white/40 text-center"
                        data-testid="input-following"
                      />
                      <p className="text-xs mt-1 text-white/40 text-center">Following</p>
                    </div>
                    <div>
                      <Input
                        placeholder="Posts"
                        value={postCount.toLocaleString()}
                        onChange={(e) => setPostCount(parseNumberInput(e.target.value))}
                        className="bg-white/5 border-transparent text-white placeholder:text-white/40 text-center"
                        data-testid="input-posts"
                      />
                      <p className="text-xs mt-1 text-white/40 text-center">Posts</p>
                    </div>
                  </div>
                </div>

                
                {/* Instagram-specific toggles */}
                {platform === "instagram" && (
                  <>
                    {/* Multiple Links Toggle */}
                    <div className="flex items-center justify-between p-3 rounded-[8px] bg-white/5 ">
                      <div className="flex items-center gap-2">
                        <Link2 className={`w-4 h-4 ${hasMultipleLinks ? "text-[#85A1FF]" : "text-white/40"}`} />
                        <span className="text-sm text-white/80">Multiple Links</span>
                      </div>
                      <Switch
                        checked={hasMultipleLinks}
                        onCheckedChange={setHasMultipleLinks}
                        data-testid="switch-multiple-links"
                      />
                    </div>

                    {/* Show Highlights Toggle */}
                    <div className="flex items-center justify-between p-3 rounded-[8px] bg-white/5 ">
                      <div className="flex items-center gap-2">
                        <Sparkles className={`w-4 h-4 ${showHighlights ? "text-[#85A1FF]" : "text-white/40"}`} />
                        <span className="text-sm text-white/80">Show Highlights</span>
                      </div>
                      <Switch
                        checked={showHighlights}
                        onCheckedChange={setShowHighlights}
                        data-testid="switch-show-highlights"
                      />
                    </div>
                    </>
                )}

                </div>

              {/* Section 2: Live Preview */}
              <div className="bg-black/20 rounded-[8px] p-6 space-y-4 self-start">

                {/* Preview Container */}
                <div className="flex items-start justify-center">
                  {platform === "twitter" ? (
                    <div className="w-[600px] mx-auto animate-in fade-in duration-700 ease-in-out">
                      <div className="bg-black rounded-2xl overflow-hidden overflow-y-auto max-h-[985px]" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }} data-testid="preview-twitter-profile">
                        {/* Top Header Bar */}
                        <div className="flex items-center justify-between px-4 h-[53px] bg-black/80 backdrop-blur-md sticky top-0 z-10">
                          <div className="flex items-center gap-6">
                            <button className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors" data-testid="button-twitter-back">
                              <ArrowLeft className="w-5 h-5 text-white" />
                            </button>
                            <div className="flex flex-col">
                              <div className="flex items-center gap-[3px]">
                                <span className="text-[17px] font-bold text-white tracking-normal" data-testid="text-header-display-name">
                                  {displayName || "Your Name"}
                                </span>
                                {isVerified && (
                                  isOrganization ? (
                                    <svg viewBox="0 0 22 22" className="w-[18px] h-[18px]">
                                      <defs>
                                        <linearGradient id="goldGradientHeader" x1="0%" y1="0%" x2="100%" y2="100%">
                                          <stop offset="0%" stopColor="#F5D547" />
                                          <stop offset="100%" stopColor="#D4A017" />
                                        </linearGradient>
                                      </defs>
                                      <path fill="url(#goldGradientHeader)" d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681.132-.637.075-1.299-.165-1.903.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816z" />
                                      <path fill="#000" d="M9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" />
                                    </svg>
                                  ) : (
                                    <svg viewBox="0 0 22 22" className="w-[18px] h-[18px] text-[#1d9bf0]" fill="currentColor">
                                      <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681.132-.637.075-1.299-.165-1.903.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" />
                                    </svg>
                                  )
                                )}
                              </div>
                              <span className="text-[13px] text-[#71767b]" data-testid="text-header-post-count">22.2K posts</span>
                            </div>
                          </div>
                          <button className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors" data-testid="button-twitter-search">
                            <Search className="w-5 h-5 text-white" />
                          </button>
                        </div>
                        
                        {/* Header Image - 3:1 aspect ratio */}
                        <div className="relative group">
                          {headerImage ? (
                            <img 
                              src={headerImage} 
                              alt="Header"
                              className="w-full object-cover"
                              style={{ aspectRatio: '3/1' }}
                              data-testid="img-twitter-header"
                            />
                          ) : (
                            <div 
                              className="w-full bg-zinc-900"
                              style={{ aspectRatio: '3/1' }}
                            />
                          )}
                          
                          {/* Hover overlay with camera icon */}
                          <label 
                            htmlFor="header-image-upload-input"
                            className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            data-testid="button-upload-header"
                          >
                            <div className="flex items-center gap-2 text-white">
                              <Camera className="w-5 h-5" />
                              <span className="text-sm font-medium">Add header photo</span>
                            </div>
                          </label>
                          
                          {/* Remove button when image exists */}
                          {headerImage && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeHeaderImage();
                              }}
                              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black"
                              data-testid="button-remove-header"
                            >
                              <X className="w-4 h-4 text-white" />
                            </button>
                          )}
                          
                          {/* Profile Picture - overlapping header (134px like real Twitter) */}
                          <div className="absolute -bottom-[67px] left-4">
                            <div className={`w-[134px] h-[134px] ${isOrganization ? 'rounded-[4px]' : 'rounded-full'} border-4 border-black bg-zinc-800 overflow-hidden`}>
                              {profilePic ? (
                                <img 
                                  src={profilePic} 
                                  alt="Profile"
                                  className="w-full h-full object-cover"
                                  data-testid="img-twitter-profile-pic"
                                />
                              ) : (
                                <div className="w-full h-full bg-zinc-700" />
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Profile Content */}
                        <div className="pt-[50px] px-4 pb-4">
                          {/* Action Buttons */}
                          <div className="flex justify-end gap-2 mb-2">
                            <button className="w-[34px] h-[34px] rounded-full border border-[#536471] flex items-center justify-center hover:bg-white/10 transition-colors" data-testid="button-twitter-more">
                              <MoreHorizontal className="w-[18px] h-[18px] text-white" />
                            </button>
                            <button className="w-[34px] h-[34px] rounded-full border border-[#536471] flex items-center justify-center hover:bg-white/10 transition-colors" data-testid="button-twitter-message">
                              <Mail className="w-[18px] h-[18px] text-white" />
                            </button>
                            <button className="px-4 h-[34px] rounded-full bg-white text-black font-bold text-[15px] hover:bg-white/90 transition-colors" data-testid="button-twitter-follow">
                              Follow
                            </button>
                          </div>
                          
                          {/* Display Name & Verification */}
                          <div className="flex items-center gap-[3px] mt-3">
                            <span className="text-xl font-black text-white leading-6 tracking-normal" data-testid="text-twitter-display-name">
                              {displayName || "Your Name"}
                            </span>
                            {isVerified && (
                              isOrganization ? (
                                <svg viewBox="0 0 22 22" className="w-5 h-5" data-testid="icon-twitter-org-verified">
                                  <defs>
                                    <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                      <stop offset="0%" stopColor="#F5D547" />
                                      <stop offset="100%" stopColor="#D4A017" />
                                    </linearGradient>
                                  </defs>
                                  <path fill="url(#goldGradient)" d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681.132-.637.075-1.299-.165-1.903.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816z" />
                                  <path fill="#000" d="M9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" />
                                </svg>
                              ) : (
                                <svg viewBox="0 0 22 22" className="w-5 h-5 text-[#1d9bf0]" fill="currentColor" data-testid="icon-twitter-verified">
                                  <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681.132-.637.075-1.299-.165-1.903.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" />
                                </svg>
                              )
                            )}
                          </div>
                          
                          {/* Handle */}
                          <div className="text-[#71767b] text-[15px] leading-5 mt-0.5" data-testid="text-twitter-handle">
                            @{cleanHandle || "yourhandle"}
                          </div>
                          
                          {/* Bio */}
                          {bio && (
                            <div className="mt-3 text-white text-[15px] leading-5 whitespace-pre-wrap" data-testid="text-twitter-bio">
                              {bio.split(/(@[\w.]+|#[\w]+|https?:\/\/[^\s]+|(?:[\w-]+\.)+[a-z]{2,}(?:\/[^\s]*)?)/gi).map((part, i) => 
                                (part.match(/^@[\w.]+$/) || part.match(/^#[\w]+$/) || part.match(/^https?:\/\//) || part.match(/\.[a-z]{2,}(?:\/|$)/i))
                                  ? <span key={i} className="text-[#1d9bf0]">{part}</span>
                                  : part
                              )}
                            </div>
                          )}
                          
                          {/* Location, Link, Join Date Row */}
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 text-[#71767b] text-[15px]">
                            {location && (
                              <div className="flex items-center gap-1" data-testid="text-twitter-location">
                                <MapPin className="w-[18px] h-[18px]" />
                                <span>{location}</span>
                              </div>
                            )}
                            {link && (
                              <div className="flex items-center gap-1" data-testid="text-twitter-link">
                                <Link2 className="w-[18px] h-[18px]" style={{ transform: 'rotate(120deg)' }} />
                                <span className="text-[#1d9bf0]">
                                  {link.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                                </span>
                              </div>
                            )}
                            <div className="flex items-center gap-1" data-testid="text-twitter-joined">
                              <CalendarDays className="w-[18px] h-[18px]" />
                              <span>Joined December 2022</span>
                            </div>
                          </div>
                          
                          {/* Following/Followers */}
                          <div className="flex items-center gap-4 mt-3 text-[15px]" data-testid="text-twitter-stats">
                            <div>
                              <span className="text-white font-bold">{formatNumber(followingCount)}</span>
                              <span className="text-[#71767b] ml-1">Following</span>
                            </div>
                            <div>
                              <span className="text-white font-bold">{formatNumber(followerCount)}</span>
                              <span className="text-[#71767b] ml-1">Followers</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Profile Tabs */}
                        <div className="border-b border-transparent">
                          <div className="flex" data-testid="twitter-profile-tabs">
                            <button className="flex-1 py-4 text-center text-[15px] font-bold text-white border-b-4 border-[#1d9bf0]" data-testid="tab-posts">
                              Posts
                            </button>
                            <button className="flex-1 py-4 text-center text-[15px] font-medium text-[#71767b] hover:bg-white/5 transition-colors" data-testid="tab-replies">
                              Replies
                            </button>
                            <button className="flex-1 py-4 text-center text-[15px] font-medium text-[#71767b] hover:bg-white/5 transition-colors" data-testid="tab-highlights">
                              Highlights
                            </button>
                            <button className="flex-1 py-4 text-center text-[15px] font-medium text-[#71767b] hover:bg-white/5 transition-colors" data-testid="tab-media">
                              Media
                            </button>
                          </div>
                        </div>
                        
                        {/* Curated Tweets Section */}
                        {(curatedTweets.pinned || (curatedTweets.featured && curatedTweets.featured.length > 0)) && (
                          <div className="border-t border-transparent">
                            {/* Pinned Tweet */}
                            {curatedTweets.pinned && (
                              <div className="p-4 border-b border-transparent" data-testid="twitter-pinned-tweet">
                                <div className="flex gap-1 mb-0.5 items-center pl-[52px]">
                                  <Pin className="w-3 h-3 fill-[#71767b] text-[#71767b]" />
                                  <span className="font-semibold text-[#71767b] text-[13px]">Pinned</span>
                                </div>
                                <div className="flex gap-3">
                                  <div className={`w-10 h-10 ${isOrganization ? 'rounded-[4px]' : 'rounded-full'} overflow-hidden flex-shrink-0`}>
                                    {profilePic ? (
                                      <img src={profilePic} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                      <div className="w-full h-full bg-zinc-700" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1 flex-wrap">
                                      <span className="text-white font-bold text-[15px]">{displayName || "Your Name"}</span>
                                      {isVerified && (
                                        isOrganization ? (
                                          <svg viewBox="0 0 22 22" className="w-[18px] h-[18px]">
                                            <defs>
                                              <linearGradient id="goldGradientPinned" x1="0%" y1="0%" x2="100%" y2="100%">
                                                <stop offset="0%" stopColor="#F5D547" />
                                                <stop offset="100%" stopColor="#D4A017" />
                                              </linearGradient>
                                            </defs>
                                            <path fill="url(#goldGradientPinned)" d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681.132-.637.075-1.299-.165-1.903.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816z" />
                                            <path fill="#000" d="M9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" />
                                          </svg>
                                        ) : (
                                          <svg viewBox="0 0 22 22" className="w-[18px] h-[18px] text-[#1d9bf0]" fill="currentColor">
                                            <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681.132-.637.075-1.299-.165-1.903.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" />
                                          </svg>
                                        )
                                      )}
                                      <span className="text-white/50 text-[15px]">@{cleanHandle || "yourhandle"}</span>
                                      <span className="text-white/50 text-[15px]">·</span>
                                      <span className="text-white/50 text-[15px]">2h</span>
                                    </div>
                                    <div className="text-white text-[15px] mt-1 whitespace-pre-wrap" data-testid="text-pinned-tweet-content">
                                      {renderTweetText(curatedTweets.pinned.text)}
                                    </div>
                                    {curatedTweets.pinned.mediaData && (
                                      <div 
                                        className="mt-3 rounded-2xl overflow-hidden "
                                        style={curatedTweets.pinned.mediaWidth && curatedTweets.pinned.mediaHeight ? {
                                          aspectRatio: `${curatedTweets.pinned.mediaWidth}/${curatedTweets.pinned.mediaHeight}`,
                                          width: '100%'
                                        } : { width: '100%' }}
                                      >
                                        {curatedTweets.pinned.mediaType === "video" ? (
                                          <video 
                                            src={curatedTweets.pinned.mediaData} 
                                            className="w-full h-full object-cover bg-black"
                                            controls
                                            autoPlay
                                            loop
                                            muted
                                            playsInline
                                          />
                                        ) : (
                                          <img 
                                            src={curatedTweets.pinned.mediaData} 
                                            alt="Tweet media"
                                            className="w-full h-full object-cover"
                                          />
                                        )}
                                      </div>
                                    )}
                                    <div className="flex items-center justify-between mt-3 w-full">
                                      <button className="flex items-center gap-[3px] text-[#71767b] hover:text-[#1d9bf0] transition-colors">
                                        <MessageCircle className="w-[18.75px] h-[18.75px]" />
                                        <span className="text-[13px]">50</span>
                                      </button>
                                      <button className="flex items-center gap-[3px] text-[#71767b] hover:text-[#00ba7c] transition-colors">
                                        <Repeat2 className="w-[18.75px] h-[18.75px]" />
                                        <span className="text-[13px]">532</span>
                                      </button>
                                      <button className="flex items-center gap-[3px] text-[#71767b] hover:text-[#f91880] transition-colors">
                                        <Heart className="w-[18.75px] h-[18.75px]" />
                                        <span className="text-[13px]">1.9K</span>
                                      </button>
                                      <button className="flex items-center gap-[3px] text-[#71767b] hover:text-[#1d9bf0] transition-colors">
                                        <svg viewBox="0 0 24 24" className="w-[18.75px] h-[18.75px]" fill="currentColor">
                                          <path d="M8.75 21V3h2v18h-2zM18 21V8.5h2V21h-2zM4 21l.004-10h2L6 21H4zm9.248 0v-7h2v7h-2z" />
                                        </svg>
                                        <span className="text-[13px]">126K</span>
                                      </button>
                                      <div className="flex items-center gap-[3px]">
                                        <button className="flex items-center text-[#71767b] hover:text-[#1d9bf0] transition-colors">
                                          <Bookmark className="w-[18.75px] h-[18.75px]" />
                                        </button>
                                        <button className="flex items-center text-[#71767b] hover:text-[#1d9bf0] transition-colors">
                                          <Share className="w-[18.75px] h-[18.75px]" />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {/* Featured Tweets */}
                            {(curatedTweets.featured || []).map((tweet, index) => (
                              <div key={tweet.id} className="p-4 border-b border-transparent" data-testid={`twitter-featured-tweet-${tweet.id}`}>
                                <div className="flex gap-3">
                                  <div className={`w-10 h-10 ${isOrganization ? 'rounded-[4px]' : 'rounded-full'} overflow-hidden flex-shrink-0`}>
                                    {profilePic ? (
                                      <img src={profilePic} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                      <div className="w-full h-full bg-zinc-700" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1 flex-wrap">
                                      <span className="text-white font-bold text-[15px]">{displayName || "Your Name"}</span>
                                      {isVerified && (
                                        isOrganization ? (
                                          <svg viewBox="0 0 22 22" className="w-[18px] h-[18px]">
                                            <defs>
                                              <linearGradient id={`goldGradientFeatured${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
                                                <stop offset="0%" stopColor="#F5D547" />
                                                <stop offset="100%" stopColor="#D4A017" />
                                              </linearGradient>
                                            </defs>
                                            <path fill={`url(#goldGradientFeatured${index})`} d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681.132-.637.075-1.299-.165-1.903.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816z" />
                                            <path fill="#000" d="M9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" />
                                          </svg>
                                        ) : (
                                          <svg viewBox="0 0 22 22" className="w-[18px] h-[18px] text-[#1d9bf0]" fill="currentColor">
                                            <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681.132-.637.075-1.299-.165-1.903.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" />
                                          </svg>
                                        )
                                      )}
                                      <span className="text-white/50 text-[15px]">@{cleanHandle || "yourhandle"}</span>
                                      <span className="text-white/50 text-[15px]">·</span>
                                      <span className="text-white/50 text-[15px]">{index + 1}h</span>
                                    </div>
                                    <div className="text-white text-[15px] mt-1 whitespace-pre-wrap" data-testid={`text-featured-tweet-content-${tweet.id}`}>
                                      {renderTweetText(tweet.text)}
                                    </div>
                                    {tweet.mediaData && (
                                      <div 
                                        className="mt-3 rounded-2xl overflow-hidden "
                                        style={tweet.mediaWidth && tweet.mediaHeight ? {
                                          aspectRatio: `${tweet.mediaWidth}/${tweet.mediaHeight}`,
                                          width: '100%'
                                        } : { width: '100%' }}
                                      >
                                        {tweet.mediaType === "video" ? (
                                          <video 
                                            src={tweet.mediaData} 
                                            className="w-full h-full object-cover bg-black"
                                            controls
                                            autoPlay
                                            loop
                                            muted
                                            playsInline
                                          />
                                        ) : (
                                          <img 
                                            src={tweet.mediaData} 
                                            alt="Tweet media"
                                            className="w-full h-full object-cover"
                                          />
                                        )}
                                      </div>
                                    )}
                                    <div className="flex items-center justify-between mt-3 w-full">
                                      <button className="flex items-center gap-[3px] text-[#71767b] hover:text-[#1d9bf0] transition-colors">
                                        <MessageCircle className="w-[18.75px] h-[18.75px]" />
                                        <span className="text-[13px]">50</span>
                                      </button>
                                      <button className="flex items-center gap-[3px] text-[#71767b] hover:text-[#00ba7c] transition-colors">
                                        <Repeat2 className="w-[18.75px] h-[18.75px]" />
                                        <span className="text-[13px]">532</span>
                                      </button>
                                      <button className="flex items-center gap-[3px] text-[#71767b] hover:text-[#f91880] transition-colors">
                                        <Heart className="w-[18.75px] h-[18.75px]" />
                                        <span className="text-[13px]">1.9K</span>
                                      </button>
                                      <button className="flex items-center gap-[3px] text-[#71767b] hover:text-[#1d9bf0] transition-colors">
                                        <svg viewBox="0 0 24 24" className="w-[18.75px] h-[18.75px]" fill="currentColor">
                                          <path d="M8.75 21V3h2v18h-2zM18 21V8.5h2V21h-2zM4 21l.004-10h2L6 21H4zm9.248 0v-7h2v7h-2z" />
                                        </svg>
                                        <span className="text-[13px]">126K</span>
                                      </button>
                                      <div className="flex items-center gap-[3px]">
                                        <button className="flex items-center text-[#71767b] hover:text-[#1d9bf0] transition-colors">
                                          <Bookmark className="w-[18.75px] h-[18.75px]" />
                                        </button>
                                        <button className="flex items-center text-[#71767b] hover:text-[#1d9bf0] transition-colors">
                                          <Share className="w-[18.75px] h-[18.75px]" />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Instagram Profile Preview - Dynamic width based on aspect */
                    <div 
                      className="bg-[#000000] rounded-2xl overflow-hidden w-[950px] mx-auto animate-in fade-in duration-700 ease-in-out"
                      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }} 
                      data-testid="instagram-profile-preview"
                    >
                        {/* Profile Header Section */}
                        <div className="pt-5 pb-3">
                          {/* Profile Content - Scaled 595px centered wrapper */}
                          <div className="mx-auto px-3 max-w-[595px]">
                            <div className="flex items-start gap-6">
                              {/* Large Profile Picture with Gradient Ring */}
                              <div className="flex-shrink-0">
                                <div 
                                  className="w-[150px] h-[150px] rounded-full p-[4px] flex-shrink-0"
                                  style={{ background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)' }}
                                >
                                  <div className="w-full h-full rounded-full bg-black p-[4px]">
                                    {profilePic ? (
                                      <img 
                                        src={profilePic} 
                                        alt="Profile"
                                        className="w-full h-full rounded-full object-cover"
                                        data-testid="img-instagram-profile-pic"
                                      />
                                    ) : (
                                      <div className="w-full h-full rounded-full bg-zinc-700" />
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              {/* Profile Info */}
                              <div className="flex-1 pt-2">
                                {/* Handle with Verified Badge & More Button */}
                                <div className="flex items-center gap-[3px] mb-1">
                                  <span className="text-white text-xl font-bold tracking-tight" data-testid="text-instagram-handle">
                                    {cleanHandle || "yourhandle"}
                                  </span>
                                  {isVerified && (
                                    <svg viewBox="0 0 22 22" className="w-5 h-5 text-[#0095f6]" fill="currentColor" data-testid="icon-instagram-verified">
                                      <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681.132-.637.075-1.299-.165-1.903.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" />
                                    </svg>
                                  )}
                                  <button className="ml-2 text-white/60 hover:text-white transition-colors" data-testid="button-instagram-more">
                                    <MoreHorizontal className="w-5 h-5" />
                                  </button>
                                </div>
                                
                                {/* Display Name - only show if provided */}
                                {displayName && (
                                  <div className="text-white text-[15px] mb-3" data-testid="text-instagram-display-name">
                                    {displayName}
                                  </div>
                                )}
                                
                                {/* Stats Row */}
                                <div className="flex items-center gap-3 mb-4" data-testid="text-instagram-stats">
                                  <div className="text-[15px] text-white font-bold">
                                    <span>{formatNumber(postCount)}</span>
                                    <span className="ml-1 gap-3 text-[15px] text-white font-medium">posts</span>
                                  </div>
                                  <div className="text-[15px] text-white font-bold">
                                    <span>{formatNumber(followerCount)}</span>
                                    <span className="ml-1 gap-3 text-[15px] text-white font-medium">followers</span>
                                  </div>
                                  <div className="text-[15px] text-white font-semibold">
                                    <span>{formatNumber(followingCount)}</span>
                                    <span className="ml-1 gap-3 text-[15px] text-white font-medium">following</span>
                                  </div>
                                </div>
                                
                                {/* Category */}
                                {category && (
                                  <div className="text-[#a8a8a8] text-[14px] leading-[1.4] mb-0.5" data-testid="text-instagram-category">
                                    {category}
                                  </div>
                                )}
                                
                                {/* Bio - @mentions: bold blue (#85A1FF) for single, bold white for multiple */}
                                {bio && (
                                  <div className="text-[#F5F5F5] text-[14px] leading-[1.4] whitespace-pre-wrap mb-1 max-w-[600px]" data-testid="text-instagram-bio">
                                    {(() => {
                                      const mentions = bio.match(/@[\w.]+/g) || [];
                                      const hasMultipleMentions = mentions.length > 1;
                                      return bio.split(/(@[\w.]+)/g).map((part, i) => 
                                        part.match(/^@[\w.]+$/) 
                                          ? <span key={i} className={`font-semibold ${hasMultipleMentions ? 'text-white' : 'text-[#85A1FF]'}`}>{part}</span>
                                          : part
                                      );
                                    })()}
                                  </div>
                                )}
                                
                                {/* Link with Link Icon - rotated 120deg */}
                                {link && (
                                  <div className="flex items-center gap-1.5 text-[15px]" data-testid="text-instagram-link">
                                    <Link2 className={`w-4 h-4 ${hasMultipleLinks ? 'text-white' : 'text-[#85A1FF]'}`} style={{ transform: 'rotate(120deg)' }} />
                                    <span className={`font-semibold ${hasMultipleLinks ? 'text-white' : 'text-[#85A1FF]'}`}>
                                      {link.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                                      {hasMultipleLinks && <span className="text-white font-semibold"> and 2 more</span>}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          
                            {/* Action Buttons - inside 680px wrapper */}
                            <div className="flex items-center gap-2 mt-4">
                              <button className="flex-1 h-9 rounded-lg bg-[#4A5DF9] text-white font-semibold text-sm hover:bg-[#3d4ed6] transition-colors" data-testid="button-instagram-follow">
                                Follow
                              </button>
                              <button className="flex-1 h-9 rounded-lg bg-zinc-800 text-white font-semibold text-sm hover:bg-zinc-700 transition-colors" data-testid="button-instagram-message">
                                Message
                              </button>
                              <button className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center hover:bg-zinc-700 transition-colors" data-testid="button-instagram-add-friend">
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                  <circle cx="8.5" cy="7" r="4" />
                                  <line x1="20" y1="8" x2="20" y2="14" />
                                  <line x1="23" y1="11" x2="17" y2="11" />
                                </svg>
                              </button>
                            </div>
                            
                            {/* Story Highlights - inside 680px wrapper */}
                            {showHighlights && (
                              <div className="pt-2">
                                <div className="flex items-start gap-0 overflow-x-auto py-2 px-2" style={{ scrollbarWidth: 'none' }}>
                                  {highlights.length > 0 ? (
                                    highlights.slice(0, 6).map((highlight) => (
                                      <div key={highlight.id} className="flex flex-col items-center gap-1 flex-shrink-0 w-[77px]">
                                        <div className="w-[64px] h-[64px] rounded-full p-[2px] border border-zinc-600">
                                          <div className="w-full h-full rounded-full bg-black p-[1.5px]">
                                            <img
                                              src={highlight.image}
                                              alt={highlight.name}
                                              className="w-full h-full rounded-full object-cover"
                                            />
                                          </div>
                                        </div>
                                        <span className="text-white text-[11px] max-w-[72px] truncate">{highlight.name}</span>
                                      </div>
                                    ))
                                  ) : (
                                    [1, 2, 3, 4].map((i) => (
                                      <div key={i} className="flex flex-col items-center gap-1 flex-shrink-0 w-[77px]">
                                        <div className="w-[64px] h-[64px] rounded-full p-[2px] border border-zinc-600">
                                          <div className="w-full h-full rounded-full bg-black p-[1.5px]">
                                            <div className="w-full h-full rounded-full bg-zinc-800" />
                                          </div>
                                        </div>
                                        <span className="text-white text-[11px]">Highlight</span>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Grid/Reels/Tagged Tabs */}
                        <div className="flex border-t border-transparent">
                          <button onClick={() => setActiveIgTab("grid")} className={`flex-1 py-3 flex items-center justify-center border-t-2 -mt-[1px] ${activeIgTab === "grid" ? "border-white" : "border-transparent"}`} data-testid="button-instagram-grid">
                            <svg className={`w-6 h-6 ${activeIgTab === "grid" ? "text-white" : "text-white/40"}`} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                              <rect x="3" y="3" width="5.5" height="5.5" rx="0.5" />
                              <rect x="9.25" y="3" width="5.5" height="5.5" rx="0.5" />
                              <rect x="15.5" y="3" width="5.5" height="5.5" rx="0.5" />
                              <rect x="3" y="9.25" width="5.5" height="5.5" rx="0.5" />
                              <rect x="9.25" y="9.25" width="5.5" height="5.5" rx="0.5" />
                              <rect x="15.5" y="9.25" width="5.5" height="5.5" rx="0.5" />
                              <rect x="3" y="15.5" width="5.5" height="5.5" rx="0.5" />
                              <rect x="9.25" y="15.5" width="5.5" height="5.5" rx="0.5" />
                              <rect x="15.5" y="15.5" width="5.5" height="5.5" rx="0.5" />
                            </svg>
                          </button>
                          <button onClick={() => setActiveIgTab("reels")} className={`flex-1 py-3 flex items-center justify-center border-t-2 -mt-[1px] ${activeIgTab === "reels" ? "border-white" : "border-transparent"}`} data-testid="button-instagram-reels">
                            <svg className={`w-6 h-6 ${activeIgTab === "reels" ? "text-white" : "text-white/40"}`} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                              <rect x="4" y="4" width="16" height="16" rx="4" />
                              <polygon points="10,8 10,16 16,12" fill="currentColor" stroke="none" />
                            </svg>
                          </button>
                          <button className="flex-1 py-3 flex items-center justify-center border-t-2 border-transparent -mt-[1px]" data-testid="button-instagram-tagged">
                            <svg className="w-6 h-6 text-white/40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                              <rect x="4" y="4" width="16" height="16" rx="2" />
                              <circle cx="12" cy="10" r="2.5" />
                              <path d="M8 18c0-2.5 1.8-4 4-4s4 1.5 4 4" />
                            </svg>
                          </button>
                        </div>

                        {/* Photo Grid - 3 columns with 4:5 aspect ratio */}
                        {activeIgTab === "grid" && (
                        <div className="grid grid-cols-3 gap-[1px]">
                          {[0, 1, 2, 3, 4, 5].map((i) => (
                            <div
                              key={i}
                              className="bg-zinc-900 flex items-center justify-center relative"
                              style={{ aspectRatio: '4/5' }}
                            >
                              {gridImages[i] ? (
                                <>
                                  <img
                                    src={gridImages[i]}
                                    alt={`Grid ${i + 1}`}
                                    className="w-full h-full object-cover"
                                    data-testid={`img-instagram-grid-${i}`}
                                  />
                                  {i < 3 && (
                                    <div className="absolute top-2 right-2">
                                      <svg className="w-3.5 h-3.5 text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]" fill="currentColor" viewBox="0 0 16 16">
                                        <path d="M9.828.722a.5.5 0 0 1 .354.146l4.95 4.95a.5.5 0 0 1 0 .707c-.48.48-1.072.588-1.503.588-.177 0-.335-.018-.46-.039l-3.134 3.134a5.927 5.927 0 0 1 .16 1.013c.046.702-.032 1.687-.72 2.375a.5.5 0 0 1-.707 0l-2.829-2.828-3.182 3.182a.5.5 0 1 1-.707-.707l3.182-3.182L2.404 7.222a.5.5 0 0 1 0-.707c.688-.688 1.673-.767 2.375-.72a5.922 5.922 0 0 1 1.013.16l3.134-3.133a2.772 2.772 0 0 1-.04-.461c0-.43.108-1.022.589-1.503a.5.5 0 0 1 .353-.146z"/>
                                      </svg>
                                    </div>
                                  )}
                                </>
                              ) : (
                                <Camera className="w-8 h-8 text-white/10" />
                              )}
                            </div>
                          ))}
                        </div>
                        )}

                        {/* Reels Grid - 3 columns with 279.8/435.53 aspect ratio */}
                        {activeIgTab === "reels" && (
                        <div className="grid grid-cols-3 gap-[1px]">
                          {[0, 1, 2, 3, 4, 5].map((i) => (
                            <div
                              key={i}
                              className="bg-zinc-900 flex items-center justify-center relative"
                              style={{ aspectRatio: '279.8/435.53' }}
                            >
                              {reelImages[i] ? (
                                <>
                                  <img src={reelImages[i]} alt={`Reel ${i + 1}`} className="w-full h-full object-cover" />
                                  <div className="absolute bottom-2 left-3 flex items-center gap-1.5">
                                    <svg className="w-3.5 h-3.5 text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]" viewBox="0 0 24 24" fill="none">
                                      <circle cx="12" cy="14" r="5" fill="currentColor" />
                                      <circle cx="15" cy="11" r="2" fill="white" opacity="0.3" />
                                      <path d="M0 10Q12 -2 24 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                                    </svg>
                                    <span className="text-white text-sm font-bold drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                                      {["3.6M", "1.7M", "892K", "2.1M", "4.3M", "1.2M"][i]}
                                    </span>
                                  </div>
                                </>
                              ) : (
                                <Camera className="w-8 h-8 text-white/10" />
                              )}
                            </div>
                          ))}
                        </div>
                        )}
                    </div>
                  )}
                </div>
              </div>

              {/* Section 3: Scores */}
              <div className="bg-black/20 rounded-[8px] p-6 space-y-4 self-start">
                
                {result ? (
                  <div className="space-y-4">
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="flex items-center justify-center gap-3 mb-2">
                        <span className={`text-5xl font-bold ${getScoreColor(result.score)}`}>
                          {result.score}
                        </span>
                        <Badge className={`${getGradeColor(result.grade)} text-lg px-3 py-1`} data-testid="badge-grade">
                          {result.grade}
                        </Badge>
                      </div>
                      <p className="text-white/60 text-sm" data-testid="text-category">
                        {result.category}
                      </p>
                    </div>

                    {/* Username Section */}
                    {(() => {
                      const usernameBoosts = result.boosts.filter(b => b.type === "username");
                      const usernameRisks = result.risks.filter(r => r.type === "username");
                      if (usernameBoosts.length === 0 && usernameRisks.length === 0) return null;
                      return (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-white/80 text-sm font-medium">
                            <AtSign className="w-4 h-4" />
                            <span>Username</span>
                          </div>
                          <div className="space-y-2">
                            {usernameBoosts.map((boost, index) => (
                              <div
                                key={`username-boost-${index}`}
                                className="p-3 rounded-[8px] bg-green-500/10"
                                data-testid={`username-boost-${index}`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-green-400 font-medium">{getBoostLabel(boost.factor)}</span>
                                  <span className="text-green-400 text-sm font-bold">+{boost.score}</span>
                                </div>
                                <p className="text-xs text-white/60 mt-1">{boost.impact}</p>
                              </div>
                            ))}
                            {usernameRisks.map((risk, index) => (
                              <div
                                key={`username-risk-${index}`}
                                className="p-3 rounded-[8px] bg-red-500/10"
                                data-testid={`username-risk-${index}`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-red-400 font-medium">{getDebuffLabel(risk.factor)}</span>
                                  <span className="text-red-400 text-sm font-bold">{risk.score}</span>
                                </div>
                                <p className="text-xs text-white/60 mt-1">{risk.impact}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Bio Section */}
                    {(() => {
                      const bioBoosts = result.boosts.filter(b => b.type === "bio");
                      const bioRisks = result.risks.filter(r => r.type === "bio");
                      if (bioBoosts.length === 0 && bioRisks.length === 0) return null;
                      return (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-white/80 text-sm font-medium">
                            <AlignLeft className="w-4 h-4" />
                            <span>Bio</span>
                          </div>
                          <div className="space-y-2">
                            {bioBoosts.map((boost, index) => (
                              <div
                                key={`bio-boost-${index}`}
                                className="p-3 rounded-[8px] bg-green-500/10"
                                data-testid={`bio-boost-${index}`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-green-400 font-medium">{getBoostLabel(boost.factor)}</span>
                                  <span className="text-green-400 text-sm font-bold">+{boost.score}</span>
                                </div>
                                <p className="text-xs text-white/60 mt-1">{boost.impact}</p>
                              </div>
                            ))}
                            {bioRisks.map((risk, index) => (
                              <div
                                key={`bio-risk-${index}`}
                                className="p-3 rounded-[8px] bg-red-500/10"
                                data-testid={`bio-risk-${index}`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-red-400 font-medium">{getDebuffLabel(risk.factor)}</span>
                                  <span className="text-red-400 text-sm font-bold">{risk.score}</span>
                                </div>
                                <p className="text-xs text-white/60 mt-1">{risk.impact}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    {/* General Section */}
                    {(() => {
                      const generalBoosts = result.boosts.filter(b => b.type === "general");
                      const generalRisks = result.risks.filter(r => r.type === "general");
                      if (generalBoosts.length === 0 && generalRisks.length === 0) return null;
                      return (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-white/80 text-sm font-medium">
                            <Sparkles className="w-4 h-4" />
                            <span>General</span>
                          </div>
                          <div className="space-y-2">
                            {generalBoosts.map((boost, index) => (
                              <div
                                key={`general-boost-${index}`}
                                className="p-3 rounded-[8px] bg-green-500/10"
                                data-testid={`general-boost-${index}`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-green-400 font-medium">{getBoostLabel(boost.factor)}</span>
                                  <span className="text-green-400 text-sm font-bold">+{boost.score}</span>
                                </div>
                                <p className="text-xs text-white/60 mt-1">{boost.impact}</p>
                              </div>
                            ))}
                            {generalRisks.map((risk, index) => (
                              <div
                                key={`general-risk-${index}`}
                                className="p-3 rounded-[8px] bg-red-500/10"
                                data-testid={`general-risk-${index}`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-red-400 font-medium">{getDebuffLabel(risk.factor)}</span>
                                  <span className="text-red-400 text-sm font-bold">{risk.score}</span>
                                </div>
                                <p className="text-xs text-white/60 mt-1">{risk.impact}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    {result.boosts.length === 0 && result.risks.length === 0 && (
                      <div className="p-4 rounded-[8px] bg-white/5  text-center">
                        <p className="text-white/40 text-sm">Enter your profile details to see scoring factors</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
                    <Type className="w-12 h-12 text-white/20 mb-4" />
                    <p className="text-white/40 text-sm">
                      Enter your username or bio to calculate your profile aura score
                    </p>
                  </div>
                )}

                {/* Highlights Section - Instagram only */}
                {platform === "instagram" && (
                  <div className="space-y-2 pt-3 border-t border-white/10">
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-white/50">
                        Highlights ({Math.min(highlights.length, 6)}/6)
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleHighlightImageUpload}
                        className="hidden"
                        id="highlight-image-upload-score"
                        data-testid="input-highlight-image-upload"
                        disabled={highlights.length >= 6}
                      />
                      {highlights.length < 6 && (
                        <label
                          htmlFor="highlight-image-upload-score"
                          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-[6px] bg-white/5 text-[11px] text-white/80 cursor-pointer hover:bg-white/10 transition-colors"
                          data-testid="button-upload-highlights"
                        >
                          <Upload className="w-3 h-3" />
                          Add
                        </label>
                      )}
                    </div>
                    
                    {highlights.length > 0 && (
                      <div className="flex gap-2 pb-1 pt-1">
                        {highlights.slice(0, 6).map((highlight) => (
                          <div key={highlight.id} className="flex flex-col items-center gap-1">
                            <div className="relative group">
                              <div className="w-[52px] h-[52px] rounded-full overflow-hidden border border-zinc-600">
                                <img
                                  src={highlight.image}
                                  alt={highlight.name}
                                  className="w-full h-full object-cover"
                                  data-testid={`img-highlight-preview-${highlight.id}`}
                                />
                              </div>
                              <button
                                onClick={() => removeHighlight(highlight.id)}
                                className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                                data-testid={`button-remove-highlight-${highlight.id}`}
                              >
                                <X className="w-2.5 h-2.5 text-white" />
                              </button>
                            </div>
                            {editingHighlightId === highlight.id ? (
                              <input
                                type="text"
                                defaultValue={highlight.name}
                                autoFocus
                                className="text-[10px] text-white/60 max-w-[52px] bg-transparent border-none outline-none text-center"
                                onBlur={(e) => {
                                  updateHighlightName(highlight.id, e.target.value);
                                  setEditingHighlightId(null);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    updateHighlightName(highlight.id, (e.target as HTMLInputElement).value);
                                    setEditingHighlightId(null);
                                  }
                                }}
                              />
                            ) : (
                              <span
                                className="text-[10px] text-white/60 max-w-[52px] truncate cursor-pointer"
                                onClick={() => setEditingHighlightId(highlight.id)}
                              >
                                {highlight.name}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Grid Images Section - Instagram only */}
                {platform === "instagram" && (
                  <div className="space-y-2 pt-3 border-t border-white/10">
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-white/50">
                        Grid Images ({gridImages.length}/6)
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleGridImageUpload}
                        className="hidden"
                        id="grid-image-upload-score"
                        data-testid="input-grid-image-upload"
                        disabled={gridImages.length >= 6}
                      />
                      {gridImages.length < 6 && (
                        <label
                          htmlFor="grid-image-upload-score"
                          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-[6px] bg-white/5 text-[11px] text-white/80 cursor-pointer hover:bg-white/10 transition-colors"
                          data-testid="button-upload-grid-images"
                        >
                          <Upload className="w-3 h-3" />
                          Add
                        </label>
                      )}
                    </div>
                    
                    {gridImages.length > 0 && (
                      <div className="grid grid-cols-3 gap-1.5">
                        {gridImages.map((img, index) => (
                          <div
                            key={index}
                            className={`relative group cursor-grab active:cursor-grabbing transition-all ${dragIndex === index && dragType === "grid" ? "opacity-50" : ""} ${dragOverIndex === index && dragType === "grid" ? "ring-2 ring-blue-500 rounded-[6px]" : ""}`}
                            style={{ aspectRatio: '4/5' }}
                            draggable
                            onDragStart={() => handleDragStart(index, "grid")}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDrop={() => handleDrop(index, "grid")}
                            onDragEnd={handleDragEnd}
                          >
                            <img
                              src={img}
                              alt={`Grid ${index + 1}`}
                              className="w-full h-full object-cover rounded-[6px] pointer-events-none"
                              data-testid={`img-grid-preview-${index}`}
                            />
                            <button
                              onClick={() => removeGridImage(index)}
                              className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                              data-testid={`button-remove-grid-image-${index}`}
                            >
                              <X className="w-2.5 h-2.5 text-white" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Reel Images Section - Instagram only */}
                {platform === "instagram" && (
                  <div className="space-y-2 pt-3 border-t border-white/10">
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-white/50">
                        Reel Images ({reelImages.length}/6)
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleReelImageUpload}
                        className="hidden"
                        id="reel-image-upload-score"
                        disabled={reelImages.length >= 6}
                      />
                      {reelImages.length < 6 && (
                        <label
                          htmlFor="reel-image-upload-score"
                          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-[6px] bg-white/5 text-[11px] text-white/80 cursor-pointer hover:bg-white/10 transition-colors"
                        >
                          <Upload className="w-3 h-3" />
                          Add
                        </label>
                      )}
                    </div>

                    {reelImages.length > 0 && (
                      <div className="grid grid-cols-3 gap-1.5">
                        {reelImages.map((img, index) => (
                          <div
                            key={index}
                            className={`relative group cursor-grab active:cursor-grabbing transition-all ${dragIndex === index && dragType === "reel" ? "opacity-50" : ""} ${dragOverIndex === index && dragType === "reel" ? "ring-2 ring-blue-500 rounded-[6px]" : ""}`}
                            style={{ aspectRatio: '279.8/435.53' }}
                            draggable
                            onDragStart={() => handleDragStart(index, "reel")}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDrop={() => handleDrop(index, "reel")}
                            onDragEnd={handleDragEnd}
                          >
                            <img
                              src={img}
                              alt={`Reel ${index + 1}`}
                              className="w-full h-full object-cover rounded-[6px] pointer-events-none"
                            />
                            <button
                              onClick={() => removeReelImage(index)}
                              className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <X className="w-2.5 h-2.5 text-white" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Profile Tweets Section - Twitter only */}
                {platform === "twitter" && (curatedTweets.pinned || (curatedTweets.featured && curatedTweets.featured.length > 0)) && (
                  <div className="space-y-3 pt-3 border-t border-white/10">
                    <label className="text-xs text-white/50 block">
                      Profile Tweets
                    </label>
                    <div className="space-y-2">
                      {curatedTweets.pinned && (
                        <div className="flex items-center justify-between py-2 px-3 bg-white/5 rounded-[8px] group">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <Pin className="w-3.5 h-3.5 fill-[#1d9bf0] text-[#1d9bf0] flex-shrink-0" />
                            <span className="text-sm text-white/80 truncate">
                              {curatedTweets.pinned.text.slice(0, 40)}{curatedTweets.pinned.text.length > 40 ? "..." : ""}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                if (curatedTweets.pinned?.mediaData) {
                                  await saveSimulatorMedia({
                                    fileType: curatedTweets.pinned.mediaType === "video" ? "video/mp4" : "image/jpeg",
                                    fileName: `loaded-media.${curatedTweets.pinned.mediaType === "video" ? "mp4" : "jpg"}`,
                                    fileData: curatedTweets.pinned.mediaData,
                                    mediaType: curatedTweets.pinned.mediaType === "video" ? "video" : "image",
                                    width: curatedTweets.pinned.mediaWidth || undefined,
                                    height: curatedTweets.pinned.mediaHeight || undefined,
                                  });
                                } else {
                                  await deleteSimulatorMedia();
                                }
                                sessionStorage.setItem("loadToSimulator", JSON.stringify({
                                  type: "library",
                                  data: {
                                    contentType: curatedTweets.pinned?.mediaType === "video" ? "video" : curatedTweets.pinned?.mediaData ? "image" : "text",
                                    content: curatedTweets.pinned?.text || "",
                                    mediaFromDB: !!curatedTweets.pinned?.mediaData,
                                  },
                                }));
                                navigate("/simulator");
                              }}
                              className="h-6 w-6 p-0 rounded-[6px] text-white/40 hover:text-blue-400 transition-all duration-200"
                              data-testid="button-edit-pinned"
                              title="Edit in Simulator"
                            >
                              <Sparkles className="w-3 h-3 fill-current" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                if (profile?.id) await clearPinnedTweet(profile.id);
                                toast({ title: "Pinned tweet removed" });
                              }}
                              className="h-6 w-6 p-0 rounded-[6px] text-white/40 hover:text-red-400 transition-all duration-200"
                              data-testid="button-delete-pinned-score"
                              title="Remove"
                            >
                              <X className="w-3 h-3 fill-current" />
                            </Button>
                          </div>
                        </div>
                      )}
                      {(curatedTweets.featured || []).map((tweet, index) => (
                        <div
                          key={tweet.id}
                          className={`flex items-center justify-between py-2 px-3 bg-white/5 rounded-[8px] group cursor-grab active:cursor-grabbing transition-all ${dragIndex === index && dragType === "tweet" ? "opacity-50" : ""} ${dragOverIndex === index && dragType === "tweet" ? "ring-2 ring-blue-500" : ""}`}
                          draggable
                          onDragStart={() => handleDragStart(index, "tweet")}
                          onDragOver={(e) => handleDragOver(e, index)}
                          onDrop={() => handleDrop(index, "tweet")}
                          onDragEnd={handleDragEnd}
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <MessageCircle className="w-3.5 h-3.5 fill-white/40 text-white/40 flex-shrink-0" />
                            <span className="text-sm text-white/80 truncate">
                              {tweet.text.slice(0, 40)}{tweet.text.length > 40 ? "..." : ""}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                if (tweet.mediaData) {
                                  await saveSimulatorMedia({
                                    fileType: tweet.mediaType === "video" ? "video/mp4" : "image/jpeg",
                                    fileName: `loaded-media.${tweet.mediaType === "video" ? "mp4" : "jpg"}`,
                                    fileData: tweet.mediaData,
                                    mediaType: tweet.mediaType === "video" ? "video" : "image",
                                    width: tweet.mediaWidth || undefined,
                                    height: tweet.mediaHeight || undefined,
                                  });
                                } else {
                                  await deleteSimulatorMedia();
                                }
                                sessionStorage.setItem("loadToSimulator", JSON.stringify({
                                  type: "library",
                                  data: {
                                    contentType: tweet.mediaType === "video" ? "video" : tweet.mediaData ? "image" : "text",
                                    content: tweet.text,
                                    mediaFromDB: !!tweet.mediaData,
                                  },
                                }));
                                navigate("/simulator");
                              }}
                              className="h-6 w-6 p-0 rounded-[6px] text-white/40 hover:text-blue-400 transition-all duration-200"
                              data-testid={`button-edit-tweet-${tweet.id}`}
                              title="Edit in Simulator"
                            >
                              <Sparkles className="w-3 h-3 fill-current" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                if (profile) {
                                  await promoteFeaturedToPinned(profile.id, tweet.id);
                                  toast({ title: "Tweet pinned" });
                                }
                              }}
                              className="h-6 w-6 p-0 rounded-[6px] text-white/40 hover:text-white transition-all duration-200"
                              data-testid={`button-pin-tweet-${tweet.id}`}
                              title="Pin this tweet"
                            >
                              <Pin className="w-3 h-3 fill-current" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                await deleteFeaturedTweet(tweet.id);
                                toast({ title: "Tweet removed" });
                              }}
                              className="h-6 w-6 p-0 rounded-[6px] text-white/40 hover:text-red-400 transition-all duration-200"
                              data-testid={`button-delete-tweet-score-${tweet.id}`}
                              title="Remove"
                            >
                              <X className="w-3 h-3 fill-current" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {platform === "twitter" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearAll}
                    className="w-full rounded-[8px] bg-white/5 text-white/60 hover:bg-red-500/10 hover:text-red-400 mt-3"
                    data-testid="button-clear-tweets"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear All
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
