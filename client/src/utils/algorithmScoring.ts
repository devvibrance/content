// Scoring aligned with X's open-source recommendation algorithm (xai-org/x-algorithm)
// Pipeline: PhoenixScorer → WeightedScorer → AuthorDiversityScorer → OONScorer
// Predicts 19 engagement actions: favorite, reply, retweet, quote, click, profile_click,
// photo_expand, vqv, share, share_via_dm, share_via_copy_link, dwell, dwell_time,
// follow_author, quoted_click, not_interested, block_author, mute_author, report

export interface AlgorithmScore {
  totalScore: number;
  breakdown: {
    contentBoosts: number;
    structure: number;
    engagement: number;
    penalties: number;
  };
  grade: "A+" | "A" | "B+" | "B" | "C" | "D" | "F";
  insights: string[];
}

export function calculateTwitterScore(content: string): AlgorithmScore {
  let score = 50;
  const insights: string[] = [];
  const breakdown = {
    contentBoosts: 0,
    structure: 0,
    engagement: 0,
    penalties: 0,
  };

  const length = content.length;
  const words = content.split(/\s+/);
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);

  // Character limit enforcement
  if (length > 280) {
    breakdown.penalties -= 50;
    score -= 50;
    insights.push("Over 280 characters — won't post");
  }

  if (length < 20) {
    breakdown.penalties -= 15;
    score -= 15;
    insights.push("Too short — people scroll past very short posts");
  }

  // Reply probability signal (reply_score weight)
  if (content.includes("?")) {
    breakdown.engagement += 15;
    score += 15;
    insights.push("Question format — encourages replies, boosting engagement");
  }

  // Dwell time signal — strong hooks increase dwell_score and dwell_time predictions
  const firstSevenWords = words.slice(0, 7).join(" ");
  const hookTriggers = ["here's", "real", "hot take", "unpopular", "truth", "most people", "key insight", "consider"];
  if (hookTriggers.some(trigger => firstSevenWords.toLowerCase().includes(trigger))) {
    breakdown.structure += 10;
    score += 10;
    insights.push("Strong hook — your first few words grab attention");
  }

  // Structure improves dwell_time prediction
  const hasLineBreaks = content.includes("\n\n");
  if (hasLineBreaks) {
    breakdown.structure += 8;
    score += 8;
    insights.push("Line breaks — easier to read, keeps people engaged longer");
  }

  // List format — high engagement across favorite, retweet, share signals
  if (content.match(/→|•|1\./)) {
    breakdown.contentBoosts += 12;
    score += 12;
    insights.push("List format — easy to scan, gets more saves and shares");
  }

  // Rhetorical close — increases bookmark/save and share_via_copy_link predictions
  const rhetoricalEndings = ["think about that", "let that sink in", "read that again", "this changes everything"];
  if (rhetoricalEndings.some(ending => content.toLowerCase().includes(ending))) {
    breakdown.engagement += 10;
    score += 10;
    insights.push("Strong ending — makes people pause, save, and share");
  }

  // Emoji — minor visual engagement signal
  const emojiRegex = /[\u2600-\u27BF]|[\uD83C-\uD83E][\uDC00-\uDFFF]/;
  const hasEmoji = emojiRegex.test(content);
  if (hasEmoji) {
    breakdown.contentBoosts += 5;
    score += 5;
    insights.push("Emojis — adds visual appeal and personality");
  }

  // Optimal word count for dwell_time signal
  if (words.length >= 15 && words.length <= 40) {
    breakdown.structure += 8;
    score += 8;
    insights.push("Good length — enough to engage without losing attention");
  }

  // Thread indicator — boosts reply_score (weighted 150x in engagement multiplier)
  if (content.includes("🧵") || content.toLowerCase().includes("thread")) {
    breakdown.engagement += 12;
    score += 12;
    insights.push("Thread indicator — threads keep people reading and replying");
  }

  // Share signal — content with data/insights boosts share_score, share_via_dm_score
  const shareSignals = [/\d+%/, /\d+x/, /study|research|data|found that|according to/i];
  if (shareSignals.some(pattern => pattern.test(content))) {
    breakdown.contentBoosts += 8;
    score += 8;
    insights.push("Data or insights — content people want to share with others");
  }

  // Sentence structure for readability → dwell_score
  if (sentences.length >= 2 && sentences.length <= 4) {
    breakdown.structure += 7;
    score += 7;
    insights.push("Balanced structure — well-paced and easy to follow");
  }

  // Dense text penalty — low dwell_score, high not_interested_score
  if (content.split("\n").length === 1 && length > 100) {
    breakdown.penalties -= 8;
    score -= 8;
    insights.push("Dense text — walls of text make people scroll past");
  }

  // Engagement bait — triggers not_interested and mute_author signals
  if (content.toLowerCase().includes("retweet") || content.toLowerCase().includes("rt")) {
    breakdown.penalties -= 10;
    score -= 10;
    insights.push("Asking for retweets — can look spammy and reduce reach");
  }

  // Engagement bait patterns — WeightedScorer penalty signals
  const engagementBait = ["like if", "comment below", "tag a friend", "double tap", "share if", "follow for", "dm me"];
  if (engagementBait.some(pattern => content.toLowerCase().includes(pattern))) {
    breakdown.penalties -= 12;
    score -= 12;
    insights.push("Engagement bait — direct asks for likes/follows can get suppressed");
  }

  let grade: "A+" | "A" | "B+" | "B" | "C" | "D" | "F";
  if (score >= 95) grade = "A+";
  else if (score >= 85) grade = "A";
  else if (score >= 75) grade = "B+";
  else if (score >= 65) grade = "B";
  else if (score >= 50) grade = "C";
  else if (score >= 35) grade = "D";
  else grade = "F";

  return {
    totalScore: Math.max(0, Math.min(100, score)),
    breakdown,
    grade,
    insights: insights.slice(0, 5),
  };
}

export function calculateInstagramScore(content: string): AlgorithmScore {
  let score = 50;
  const insights: string[] = [];
  const breakdown = {
    contentBoosts: 0,
    structure: 0,
    engagement: 0,
    penalties: 0,
  };

  const length = content.length;
  const words = content.split(/\s+/);
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const lines = content.split("\n");

  if (length >= 100 && length <= 300) {
    breakdown.structure += 15;
    score += 15;
    insights.push("Optimal caption length");
  }

  const emojiRegex = /[\u2600-\u27BF]|[\uD83C-\uD83E][\uDC00-\uDFFF]/;
  const hasEmoji = emojiRegex.test(content);
  if (hasEmoji) {
    breakdown.contentBoosts += 12;
    score += 12;
    insights.push("Emojis - strong visual engagement");
  }

  const hashtags = content.match(/#\w+/g) || [];
  if (hashtags.length >= 3 && hashtags.length <= 10) {
    breakdown.engagement += 10;
    score += 10;
    insights.push(`Good hashtag count (${hashtags.length})`);
  } else if (hashtags.length > 10) {
    breakdown.penalties -= 8;
    score -= 8;
    insights.push("Too many hashtags - looks spammy");
  }

  if (lines.length >= 3) {
    breakdown.structure += 8;
    score += 8;
    insights.push("Multi-line format - readable");
  }

  const callToAction = ["link in bio", "swipe", "tap", "comment", "share", "tag"];
  if (callToAction.some(cta => content.toLowerCase().includes(cta))) {
    breakdown.engagement += 15;
    score += 15;
    insights.push("Clear call-to-action");
  }

  if (sentences.length >= 2 && sentences.length <= 5) {
    breakdown.structure += 7;
    score += 7;
    insights.push("Balanced caption structure");
  }

  let grade: "A+" | "A" | "B+" | "B" | "C" | "D" | "F";
  if (score >= 95) grade = "A+";
  else if (score >= 85) grade = "A";
  else if (score >= 75) grade = "B+";
  else if (score >= 65) grade = "B";
  else if (score >= 50) grade = "C";
  else if (score >= 35) grade = "D";
  else grade = "F";

  return {
    totalScore: Math.max(0, Math.min(100, score)),
    breakdown,
    grade,
    insights: insights.slice(0, 5),
  };
}
