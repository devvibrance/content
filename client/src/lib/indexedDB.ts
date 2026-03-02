const DB_NAME = "ContentOS";
const DB_VERSION = 15;
const LIBRARY_STORE = "library";
const MEDIA_STORE = "media";
const PROFILE_STORE = "profile";
const SIMULATOR_MEDIA_STORE = "simulator_media";
const SIMULATOR_STATE_STORE = "simulator_state";
const PROFILE_GRID_STORE = "profile_grid";
const PROFILE_TWITTER_STORE = "profile_twitter";
const SAVED_SIMULATIONS_STORE = "saved_simulations";
const PROFILES_STORE = "profiles";
const ACTIVE_PROFILE_STORE = "active_profile";
const PROFILE_REEL_GRID_STORE = "profile_reel_grid";

export interface LibraryItem {
  id: string;
  type: "text" | "image" | "video" | "tweet" | "instagram" | "reel";
  content: string | null;
  embedUrl?: string | null;
  metadata?: any;
  createdAt: number;
  profileId?: string;
}

export interface MediaFile {
  id: string;
  libraryItemId: string;
  fileType: string;
  fileData: string;
}

export interface ProfileData {
  id: string;
  username: string;
  handle: string;
  profilePic: string | null;
  isVerified: boolean;
  isInstagramVerified?: boolean;
  isOrganization?: boolean;
  createdAt?: number;
  label?: string;
}

export interface SimulatorMedia {
  id: string;
  fileType: string;
  fileName: string;
  fileData: string;
  mediaType: "image" | "video" | "gif";
  width?: number;
  height?: number;
  aspectRatio?: string;
}

export interface SimulatorState {
  id: string;
  platform: "twitter" | "instagram";
  previewType: "twitter" | "ig-feed" | "ig-reel";
  tweetText: string;
  hasMedia: { image: boolean; video: boolean };
  isReel: boolean;
  dimensions: "9:16" | "4:5" | "1440x1880" | "1:1" | "1.91:1";
  isCollab: boolean;
  accountSize: "small" | "medium" | "large";
  postingTime: "morning" | "afternoon" | "evening" | "night";
  isVerified: boolean;
  isOrganization: boolean;
  isInstagramVerified: boolean;
  audioTrending: boolean;
}

export interface CuratedTweet {
  id: string;
  profileId: string;
  type: "pinned" | "featured";
  text: string;
  mediaData: string | null;
  mediaType: "image" | "video" | "gif" | null;
  mediaWidth?: number | null;
  mediaHeight?: number | null;
  createdAt: number;
}

export interface SavedSimulation {
  id: string;
  platform: "twitter" | "instagram";
  previewType: "twitter" | "ig-feed" | "ig-reel";
  text: string;
  mediaData: string | null;
  mediaType: "image" | "video" | "gif" | null;
  mediaWidth?: number | null;
  mediaHeight?: number | null;
  profileUsername: string;
  profileHandle: string;
  profilePic: string | null;
  isVerified: boolean;
  isOrganization: boolean;
  isInstagramVerified: boolean;
  dimensions: "9:16" | "4:5" | "1440x1880" | "1:1" | "1.91:1";
  isCollab: boolean;
  createdAt: number;
  profileId?: string;
}

let dbInstance: IDBDatabase | null = null;
let dbPromise: Promise<IDBDatabase> | null = null;

function forceCloseDB(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
  dbPromise = null;
}

function openDB(): Promise<IDBDatabase> {
  // Check if we have a cached connection with the correct version AND all required stores
  if (dbInstance) {
    const hasCorrectVersion = dbInstance.version === DB_VERSION;
    const hasAllStores = dbInstance.objectStoreNames.contains(PROFILE_TWITTER_STORE) &&
                         dbInstance.objectStoreNames.contains(SAVED_SIMULATIONS_STORE) &&
                         dbInstance.objectStoreNames.contains(PROFILES_STORE) &&
                         dbInstance.objectStoreNames.contains(ACTIVE_PROFILE_STORE);

    if (hasCorrectVersion && hasAllStores) {
      return Promise.resolve(dbInstance);
    }
    // Version mismatch or missing stores - close stale connection and reopen
    forceCloseDB();
  }

  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };

    request.onsuccess = () => {
      const db = request.result;
      // Double-check we have all required stores - if not, delete and recreate
      const hasAllRequiredStores =
        db.objectStoreNames.contains(PROFILE_TWITTER_STORE) &&
        db.objectStoreNames.contains(SAVED_SIMULATIONS_STORE) &&
        db.objectStoreNames.contains(PROFILES_STORE) &&
        db.objectStoreNames.contains(ACTIVE_PROFILE_STORE);
      
      if (!hasAllRequiredStores) {
        db.close();
        dbPromise = null;
        // Delete the database and try again
        const deleteRequest = indexedDB.deleteDatabase(DB_NAME);
        deleteRequest.onsuccess = () => {
          dbInstance = null;
          openDB().then(resolve).catch(reject);
        };
        deleteRequest.onerror = () => {
          reject(new Error("Failed to recreate database"));
        };
        return;
      }
      dbInstance = db;
      dbPromise = null;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(LIBRARY_STORE)) {
        const libraryStore = db.createObjectStore(LIBRARY_STORE, { keyPath: "id" });
        libraryStore.createIndex("createdAt", "createdAt", { unique: false });
      }

      if (!db.objectStoreNames.contains(MEDIA_STORE)) {
        const mediaStore = db.createObjectStore(MEDIA_STORE, { keyPath: "id" });
        mediaStore.createIndex("libraryItemId", "libraryItemId", { unique: false });
      }

      if (!db.objectStoreNames.contains(PROFILE_STORE)) {
        db.createObjectStore(PROFILE_STORE, { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains(SIMULATOR_MEDIA_STORE)) {
        db.createObjectStore(SIMULATOR_MEDIA_STORE, { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains(SIMULATOR_STATE_STORE)) {
        db.createObjectStore(SIMULATOR_STATE_STORE, { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains(PROFILE_GRID_STORE)) {
        db.createObjectStore(PROFILE_GRID_STORE, { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains(PROFILE_TWITTER_STORE)) {
        db.createObjectStore(PROFILE_TWITTER_STORE, { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains(SAVED_SIMULATIONS_STORE)) {
        const savedSimStore = db.createObjectStore(SAVED_SIMULATIONS_STORE, { keyPath: "id" });
        savedSimStore.createIndex("createdAt", "createdAt", { unique: false });
      }

      if (!db.objectStoreNames.contains(PROFILES_STORE)) {
        const profilesStore = db.createObjectStore(PROFILES_STORE, { keyPath: "id" });
        profilesStore.createIndex("createdAt", "createdAt", { unique: false });
      }

      if (!db.objectStoreNames.contains(ACTIVE_PROFILE_STORE)) {
        db.createObjectStore(ACTIVE_PROFILE_STORE, { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains(PROFILE_REEL_GRID_STORE)) {
        db.createObjectStore(PROFILE_REEL_GRID_STORE, { keyPath: "id" });
      }
    };
  });

  return dbPromise;
}

export async function getAllLibraryItems(): Promise<(LibraryItem & { mediaFiles: MediaFile[] })[]> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([LIBRARY_STORE, MEDIA_STORE], "readonly");
    const libraryStore = transaction.objectStore(LIBRARY_STORE);
    const mediaStore = transaction.objectStore(MEDIA_STORE);
    
    const request = libraryStore.getAll();
    
    request.onsuccess = async () => {
      const items = request.result as LibraryItem[];
      
      const itemsWithMedia = await Promise.all(
        items.map((item) => {
          return new Promise<LibraryItem & { mediaFiles: MediaFile[] }>((res, rej) => {
            const mediaRequest = mediaStore.index("libraryItemId").getAll(item.id);
            mediaRequest.onsuccess = () => {
              res({ ...item, mediaFiles: mediaRequest.result });
            };
            mediaRequest.onerror = () => rej(mediaRequest.error);
          });
        })
      );
      
      itemsWithMedia.sort((a, b) => a.createdAt - b.createdAt);
      resolve(itemsWithMedia);
    };
    
    request.onerror = () => reject(request.error);
  });
}

export async function createLibraryItem(
  item: Omit<LibraryItem, "id" | "createdAt">,
  mediaFiles?: Omit<MediaFile, "id" | "libraryItemId">[]
): Promise<LibraryItem & { mediaFiles: MediaFile[] }> {
  const db = await openDB();

  // Get active profile ID if not provided
  let profileId = item.profileId;
  if (!profileId) {
    profileId = (await getActiveProfileId()) || undefined;
  }

  const newItem: LibraryItem = {
    ...item,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    profileId,
  };
  
  const newMediaFiles: MediaFile[] = mediaFiles
    ? mediaFiles.map((media) => ({
        ...media,
        id: crypto.randomUUID(),
        libraryItemId: newItem.id,
      }))
    : [];
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([LIBRARY_STORE, MEDIA_STORE], "readwrite");
    const libraryStore = transaction.objectStore(LIBRARY_STORE);
    const mediaStore = transaction.objectStore(MEDIA_STORE);
    
    libraryStore.add(newItem);
    newMediaFiles.forEach((media) => mediaStore.add(media));
    
    transaction.oncomplete = () => {
      resolve({ ...newItem, mediaFiles: newMediaFiles });
    };
    
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function deleteLibraryItem(id: string): Promise<void> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([LIBRARY_STORE, MEDIA_STORE], "readwrite");
    const libraryStore = transaction.objectStore(LIBRARY_STORE);
    const mediaStore = transaction.objectStore(MEDIA_STORE);
    
    libraryStore.delete(id);
    
    const mediaIndex = mediaStore.index("libraryItemId");
    const mediaRequest = mediaIndex.getAllKeys(id);
    
    mediaRequest.onsuccess = () => {
      const keys = mediaRequest.result;
      keys.forEach((key) => mediaStore.delete(key));
    };
    
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

const PROFILE_ID = "user-profile";

export async function getProfile(): Promise<ProfileData> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PROFILE_STORE], "readonly");
    const profileStore = transaction.objectStore(PROFILE_STORE);
    
    const request = profileStore.get(PROFILE_ID);
    
    request.onsuccess = () => {
      const profile = request.result as ProfileData | undefined;
      
      if (profile) {
        resolve(profile);
      } else {
        const defaultProfile: ProfileData = {
          id: PROFILE_ID,
          username: "Your Name",
          handle: "@yourhandle",
          profilePic: null,
          isVerified: false,
          isInstagramVerified: false,
        };
        resolve(defaultProfile);
      }
    };
    
    request.onerror = () => reject(request.error);
  });
}

export async function saveProfile(profile: Omit<ProfileData, "id">): Promise<ProfileData> {
  const db = await openDB();
  
  const profileData: ProfileData = {
    ...profile,
    id: PROFILE_ID,
  };
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PROFILE_STORE], "readwrite");
    const profileStore = transaction.objectStore(PROFILE_STORE);
    
    profileStore.put(profileData);
    
    transaction.oncomplete = () => resolve(profileData);
    transaction.onerror = () => reject(transaction.error);
  });
}

const SIMULATOR_MEDIA_ID = "simulator-current-media";

export async function saveSimulatorMedia(media: Omit<SimulatorMedia, "id">): Promise<SimulatorMedia> {
  const db = await openDB();
  
  const mediaData: SimulatorMedia = {
    ...media,
    id: SIMULATOR_MEDIA_ID,
  };
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([SIMULATOR_MEDIA_STORE], "readwrite");
    const mediaStore = transaction.objectStore(SIMULATOR_MEDIA_STORE);
    
    mediaStore.put(mediaData);
    
    transaction.oncomplete = () => {
      window.dispatchEvent(new Event("simulatorMediaUpdated"));
      resolve(mediaData);
    };
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function getSimulatorMedia(): Promise<SimulatorMedia | null> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([SIMULATOR_MEDIA_STORE], "readonly");
    const mediaStore = transaction.objectStore(SIMULATOR_MEDIA_STORE);
    
    const request = mediaStore.get(SIMULATOR_MEDIA_ID);
    
    request.onsuccess = () => {
      resolve(request.result || null);
    };
    
    request.onerror = () => reject(request.error);
  });
}

export async function deleteSimulatorMedia(): Promise<void> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([SIMULATOR_MEDIA_STORE], "readwrite");
    const mediaStore = transaction.objectStore(SIMULATOR_MEDIA_STORE);
    
    mediaStore.delete(SIMULATOR_MEDIA_ID);
    
    transaction.oncomplete = () => {
      window.dispatchEvent(new Event("simulatorMediaUpdated"));
      resolve();
    };
    transaction.onerror = () => reject(transaction.error);
  });
}

const SIMULATOR_STATE_ID = "simulator-current-state";

export async function saveSimulatorState(state: Omit<SimulatorState, "id">): Promise<SimulatorState> {
  const db = await openDB();
  
  const stateData: SimulatorState = {
    ...state,
    id: SIMULATOR_STATE_ID,
  };
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([SIMULATOR_STATE_STORE], "readwrite");
    const stateStore = transaction.objectStore(SIMULATOR_STATE_STORE);
    
    stateStore.put(stateData);
    
    transaction.oncomplete = () => resolve(stateData);
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function getSimulatorState(): Promise<SimulatorState | null> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([SIMULATOR_STATE_STORE], "readonly");
    const stateStore = transaction.objectStore(SIMULATOR_STATE_STORE);
    
    const request = stateStore.get(SIMULATOR_STATE_ID);
    
    request.onsuccess = () => {
      resolve(request.result || null);
    };
    
    request.onerror = () => reject(request.error);
  });
}

export async function clearSimulatorState(): Promise<void> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([SIMULATOR_STATE_STORE], "readwrite");
    const stateStore = transaction.objectStore(SIMULATOR_STATE_STORE);
    
    stateStore.delete(SIMULATOR_STATE_ID);
    
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

// Profile Grid Images (for Profile Simulator)
export interface ProfileGridImage {
  id: string;
  profileId: string;
  index: number;
  fileData: string;
}

const PROFILE_GRID_PREFIX = "profile-grid-";

export async function saveProfileGridImages(profileId: string, images: string[]): Promise<void> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PROFILE_GRID_STORE], "readwrite");
    const store = transaction.objectStore(PROFILE_GRID_STORE);
    
    // First, get all existing images and delete ones for this profile
    const getAllRequest = store.getAll();
    
    getAllRequest.onsuccess = () => {
      const allImages = (getAllRequest.result as ProfileGridImage[]) || [];
      // Delete existing images for this profile
      allImages.filter(img => img.profileId === profileId).forEach(img => {
        store.delete(img.id);
      });
      
      // Add new images for this profile
      images.forEach((fileData, index) => {
        const gridImage: ProfileGridImage = {
          id: `${PROFILE_GRID_PREFIX}${profileId}-${index}`,
          profileId,
          index,
          fileData,
        };
        store.put(gridImage);
      });
    };
    
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function getProfileGridImages(profileId: string): Promise<string[]> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PROFILE_GRID_STORE], "readonly");
    const store = transaction.objectStore(PROFILE_GRID_STORE);
    
    const request = store.getAll();
    
    request.onsuccess = () => {
      const allImages = (request.result as ProfileGridImage[]) || [];
      // Filter by profileId, sort by index, and return just the file data
      const profileImages = allImages.filter(img => img.profileId === profileId);
      profileImages.sort((a, b) => a.index - b.index);
      resolve(profileImages.map(img => img.fileData));
    };
    
    request.onerror = () => reject(request.error);
  });
}

export async function clearProfileGridImages(profileId: string): Promise<void> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PROFILE_GRID_STORE], "readwrite");
    const store = transaction.objectStore(PROFILE_GRID_STORE);
    
    const getAllRequest = store.getAll();
    
    getAllRequest.onsuccess = () => {
      const allImages = (getAllRequest.result as ProfileGridImage[]) || [];
      // Delete only images for this profile
      allImages.filter(img => img.profileId === profileId).forEach(img => {
        store.delete(img.id);
      });
    };
    
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

// Profile Reel Grid Images (for Profile Simulator)
const PROFILE_REEL_GRID_PREFIX = "profile-reel-grid-";

export async function saveProfileReelGridImages(profileId: string, images: string[]): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PROFILE_REEL_GRID_STORE], "readwrite");
    const store = transaction.objectStore(PROFILE_REEL_GRID_STORE);

    const getAllRequest = store.getAll();

    getAllRequest.onsuccess = () => {
      const allImages = (getAllRequest.result as ProfileGridImage[]) || [];
      allImages.filter(img => img.profileId === profileId).forEach(img => {
        store.delete(img.id);
      });

      images.forEach((fileData, index) => {
        const gridImage: ProfileGridImage = {
          id: `${PROFILE_REEL_GRID_PREFIX}${profileId}-${index}`,
          profileId,
          index,
          fileData,
        };
        store.put(gridImage);
      });
    };

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function getProfileReelGridImages(profileId: string): Promise<string[]> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PROFILE_REEL_GRID_STORE], "readonly");
    const store = transaction.objectStore(PROFILE_REEL_GRID_STORE);

    const request = store.getAll();

    request.onsuccess = () => {
      const allImages = (request.result as ProfileGridImage[]) || [];
      const profileImages = allImages.filter(img => img.profileId === profileId);
      profileImages.sort((a, b) => a.index - b.index);
      resolve(profileImages.map(img => img.fileData));
    };

    request.onerror = () => reject(request.error);
  });
}

export async function clearProfileReelGridImages(profileId: string): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PROFILE_REEL_GRID_STORE], "readwrite");
    const store = transaction.objectStore(PROFILE_REEL_GRID_STORE);

    const getAllRequest = store.getAll();

    getAllRequest.onsuccess = () => {
      const allImages = (getAllRequest.result as ProfileGridImage[]) || [];
      allImages.filter(img => img.profileId === profileId).forEach(img => {
        store.delete(img.id);
      });
    };

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

// Curated Tweets for Profile Preview
const PINNED_TWEET_PREFIX = "curated-pinned-";

function getPinnedTweetId(profileId: string): string {
  return `${PINNED_TWEET_PREFIX}${profileId}`;
}

export async function savePinnedTweet(profileId: string, tweet: Omit<CuratedTweet, "id" | "profileId" | "type" | "createdAt">): Promise<CuratedTweet> {
  const db = await openDB();
  
  const tweetData: CuratedTweet = {
    ...tweet,
    id: getPinnedTweetId(profileId),
    profileId,
    type: "pinned",
    createdAt: Date.now(),
  };
  
  // Check if store exists before trying to use it
  if (!db.objectStoreNames.contains(PROFILE_TWITTER_STORE)) {
    // Force database recreation
    forceCloseDB();
    const newDb = await openDB();
    if (!newDb.objectStoreNames.contains(PROFILE_TWITTER_STORE)) {
      throw new Error("Failed to create profile twitter store. Please refresh the page.");
    }
    return savePinnedTweet(profileId, tweet);
  }
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PROFILE_TWITTER_STORE], "readwrite");
    const store = transaction.objectStore(PROFILE_TWITTER_STORE);
    
    store.put(tweetData);
    
    transaction.oncomplete = () => {
      window.dispatchEvent(new Event("profileTweetsUpdated"));
      resolve(tweetData);
    };
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function addFeaturedTweet(profileId: string, tweet: Omit<CuratedTweet, "id" | "profileId" | "type" | "createdAt">): Promise<CuratedTweet> {
  const db = await openDB();
  
  const tweetData: CuratedTweet = {
    ...tweet,
    id: `featured-${profileId}-${Date.now()}`,
    profileId,
    type: "featured",
    createdAt: Date.now(),
  };
  
  if (!db.objectStoreNames.contains(PROFILE_TWITTER_STORE)) {
    forceCloseDB();
    const newDb = await openDB();
    if (!newDb.objectStoreNames.contains(PROFILE_TWITTER_STORE)) {
      throw new Error("Failed to create profile twitter store. Please refresh the page.");
    }
    return addFeaturedTweet(profileId, tweet);
  }
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PROFILE_TWITTER_STORE], "readwrite");
    const store = transaction.objectStore(PROFILE_TWITTER_STORE);
    
    store.put(tweetData);
    
    transaction.oncomplete = () => {
      window.dispatchEvent(new Event("profileTweetsUpdated"));
      resolve(tweetData);
    };
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function getCuratedTweets(profileId: string): Promise<{ pinned: CuratedTweet | null; featured: CuratedTweet[] }> {
  try {
    const db = await openDB();
    
    if (!db.objectStoreNames.contains(PROFILE_TWITTER_STORE)) {
      return { pinned: null, featured: [] };
    }
    
    return new Promise((resolve) => {
      try {
        const transaction = db.transaction([PROFILE_TWITTER_STORE], "readonly");
        const store = transaction.objectStore(PROFILE_TWITTER_STORE);
        
        const allRequest = store.getAll();
        
        allRequest.onsuccess = () => {
          const all = (allRequest.result as CuratedTweet[]) || [];
          // Filter by profileId
          const profileTweets = all.filter(t => t.profileId === profileId);
          const pinned = profileTweets.find(t => t.type === "pinned") || null;
          const featured = profileTweets
            .filter(t => t.type === "featured")
            .sort((a, b) => b.createdAt - a.createdAt);
          resolve({ pinned, featured });
        };
        
        allRequest.onerror = () => resolve({ pinned: null, featured: [] });
      } catch {
        resolve({ pinned: null, featured: [] });
      }
    });
  } catch {
    return { pinned: null, featured: [] };
  }
}

export async function deleteFeaturedTweet(id: string): Promise<void> {
  try {
    const db = await openDB();
    
    if (!db.objectStoreNames.contains(PROFILE_TWITTER_STORE)) {
      return;
    }
    
    return new Promise((resolve) => {
      try {
        const transaction = db.transaction([PROFILE_TWITTER_STORE], "readwrite");
        const store = transaction.objectStore(PROFILE_TWITTER_STORE);
        
        store.delete(id);
        
        transaction.oncomplete = () => {
          window.dispatchEvent(new Event("profileTweetsUpdated"));
          resolve();
        };
        transaction.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  } catch {
    return;
  }
}

export async function clearPinnedTweet(profileId: string): Promise<void> {
  try {
    const db = await openDB();
    
    if (!db.objectStoreNames.contains(PROFILE_TWITTER_STORE)) {
      return;
    }
    
    return new Promise((resolve) => {
      try {
        const transaction = db.transaction([PROFILE_TWITTER_STORE], "readwrite");
        const store = transaction.objectStore(PROFILE_TWITTER_STORE);
        
        store.delete(getPinnedTweetId(profileId));
        
        transaction.oncomplete = () => {
          window.dispatchEvent(new Event("profileTweetsUpdated"));
          resolve();
        };
        transaction.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  } catch {
    return;
  }
}

export async function clearAllCuratedTweets(profileId: string): Promise<void> {
  try {
    const db = await openDB();
    
    if (!db.objectStoreNames.contains(PROFILE_TWITTER_STORE)) {
      return;
    }
    
    return new Promise((resolve) => {
      try {
        const transaction = db.transaction([PROFILE_TWITTER_STORE], "readwrite");
        const store = transaction.objectStore(PROFILE_TWITTER_STORE);
        
        // Get all tweets and delete only those for this profile
        const getAllRequest = store.getAll();
        
        getAllRequest.onsuccess = () => {
          const allTweets = (getAllRequest.result as CuratedTweet[]) || [];
          allTweets.filter(t => t.profileId === profileId).forEach(t => {
            store.delete(t.id);
          });
        };
        
        transaction.oncomplete = () => {
          window.dispatchEvent(new Event("profileTweetsUpdated"));
          resolve();
        };
        transaction.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  } catch {
    return;
  }
}

// Promote a featured tweet to pinned (moves old pinned to featured)
export async function promoteFeaturedToPinned(profileId: string, featuredTweetId: string): Promise<void> {
  try {
    const db = await openDB();
    
    if (!db.objectStoreNames.contains(PROFILE_TWITTER_STORE)) {
      return;
    }
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([PROFILE_TWITTER_STORE], "readwrite");
      const store = transaction.objectStore(PROFILE_TWITTER_STORE);
      
      // Get all tweets first
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = () => {
        const allTweets = (getAllRequest.result as CuratedTweet[]) || [];
        const profileTweets = allTweets.filter(t => t.profileId === profileId);
        const currentPinned = profileTweets.find(t => t.type === "pinned");
        const featuredTweet = profileTweets.find(t => t.id === featuredTweetId);
        
        if (!featuredTweet) {
          resolve();
          return;
        }
        
        // If there's a current pinned tweet, convert it to featured
        if (currentPinned) {
          const demotedTweet: CuratedTweet = {
            ...currentPinned,
            id: `featured-${profileId}-${Date.now()}`,
            type: "featured",
            createdAt: Date.now(),
          };
          store.put(demotedTweet);
          // Delete old pinned
          store.delete(currentPinned.id);
        }
        
        // Promote the featured tweet to pinned
        const newPinned: CuratedTweet = {
          ...featuredTweet,
          id: getPinnedTweetId(profileId),
          type: "pinned",
          createdAt: Date.now(),
        };
        store.put(newPinned);
        
        // Delete the old featured tweet entry
        store.delete(featuredTweetId);
      };
      
      transaction.oncomplete = () => {
        window.dispatchEvent(new Event("profileTweetsUpdated"));
        resolve();
      };
      
      transaction.onerror = () => reject(transaction.error);
    });
  } catch {
    return;
  }
}

// Saved Simulations for Library
export async function saveSimulation(simulation: Omit<SavedSimulation, "id" | "createdAt">): Promise<SavedSimulation> {
  let db = await openDB();

  // Check if store exists - if not, force recreation
  if (!db.objectStoreNames.contains(SAVED_SIMULATIONS_STORE)) {
    forceCloseDB();
    db = await openDB();
    if (!db.objectStoreNames.contains(SAVED_SIMULATIONS_STORE)) {
      throw new Error("Database migration failed. Please clear your browser data and refresh.");
    }
  }

  // Get active profile ID if not provided
  let profileId = simulation.profileId;
  if (!profileId) {
    profileId = (await getActiveProfileId()) || undefined;
  }

  const simData: SavedSimulation = {
    ...simulation,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    profileId,
  };
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([SAVED_SIMULATIONS_STORE], "readwrite");
    const store = transaction.objectStore(SAVED_SIMULATIONS_STORE);
    
    store.add(simData);
    
    transaction.oncomplete = () => {
      window.dispatchEvent(new Event("savedSimulationsUpdated"));
      resolve(simData);
    };
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function getAllSavedSimulations(): Promise<SavedSimulation[]> {
  const db = await openDB();
  
  if (!db.objectStoreNames.contains(SAVED_SIMULATIONS_STORE)) {
    return [];
  }
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([SAVED_SIMULATIONS_STORE], "readonly");
    const store = transaction.objectStore(SAVED_SIMULATIONS_STORE);
    
    const request = store.getAll();
    
    request.onsuccess = () => {
      const simulations = request.result as SavedSimulation[];
      simulations.sort((a, b) => b.createdAt - a.createdAt);
      resolve(simulations);
    };
    
    request.onerror = () => reject(request.error);
  });
}

export async function deleteSavedSimulation(id: string): Promise<void> {
  let db = await openDB();

  if (!db.objectStoreNames.contains(SAVED_SIMULATIONS_STORE)) {
    forceCloseDB();
    db = await openDB();
    if (!db.objectStoreNames.contains(SAVED_SIMULATIONS_STORE)) {
      return;
    }
  }

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([SAVED_SIMULATIONS_STORE], "readwrite");
    const store = transaction.objectStore(SAVED_SIMULATIONS_STORE);

    store.delete(id);

    transaction.oncomplete = () => {
      window.dispatchEvent(new Event("savedSimulationsUpdated"));
      resolve();
    };
    transaction.onerror = () => reject(transaction.error);
  });
}

// ==================== Multi-Profile System ====================

const ACTIVE_PROFILE_KEY = "active-profile-id";
let migrationCompleted = false;

export async function getAllProfiles(): Promise<ProfileData[]> {
  const db = await openDB();

  if (!db.objectStoreNames.contains(PROFILES_STORE)) {
    return [];
  }

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PROFILES_STORE], "readonly");
    const store = transaction.objectStore(PROFILES_STORE);

    const request = store.getAll();

    request.onsuccess = () => {
      const profiles = request.result as ProfileData[];
      profiles.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      resolve(profiles);
    };

    request.onerror = () => reject(request.error);
  });
}

export async function createProfile(profile: Omit<ProfileData, "id" | "createdAt">): Promise<ProfileData> {
  const db = await openDB();

  const newProfile: ProfileData = {
    ...profile,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PROFILES_STORE], "readwrite");
    const store = transaction.objectStore(PROFILES_STORE);

    store.add(newProfile);

    transaction.oncomplete = () => {
      window.dispatchEvent(new Event("profilesListUpdated"));
      resolve(newProfile);
    };
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function updateProfile(profile: ProfileData): Promise<ProfileData> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PROFILES_STORE], "readwrite");
    const store = transaction.objectStore(PROFILES_STORE);

    store.put(profile);

    transaction.oncomplete = () => {
      window.dispatchEvent(new Event("profilesListUpdated"));
      window.dispatchEvent(new Event("profileUpdated"));
      resolve(profile);
    };
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function deleteProfile(profileId: string): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const stores = [PROFILES_STORE, LIBRARY_STORE, SAVED_SIMULATIONS_STORE, MEDIA_STORE];
    const transaction = db.transaction(stores, "readwrite");

    // Delete profile
    const profilesStore = transaction.objectStore(PROFILES_STORE);
    profilesStore.delete(profileId);

    // Delete all library items for this profile
    const libraryStore = transaction.objectStore(LIBRARY_STORE);
    const libraryRequest = libraryStore.getAll();
    libraryRequest.onsuccess = () => {
      const items = libraryRequest.result as LibraryItem[];
      items
        .filter((item) => item.profileId === profileId)
        .forEach((item) => {
          libraryStore.delete(item.id);
          // Also delete associated media
          const mediaStore = transaction.objectStore(MEDIA_STORE);
          const mediaIndex = mediaStore.index("libraryItemId");
          const mediaRequest = mediaIndex.getAllKeys(item.id);
          mediaRequest.onsuccess = () => {
            mediaRequest.result.forEach((key) => mediaStore.delete(key));
          };
        });
    };

    // Delete all saved simulations for this profile
    const simStore = transaction.objectStore(SAVED_SIMULATIONS_STORE);
    const simRequest = simStore.getAll();
    simRequest.onsuccess = () => {
      const sims = simRequest.result as SavedSimulation[];
      sims
        .filter((sim) => sim.profileId === profileId)
        .forEach((sim) => simStore.delete(sim.id));
    };

    transaction.oncomplete = () => {
      window.dispatchEvent(new Event("profilesListUpdated"));
      window.dispatchEvent(new Event("savedSimulationsUpdated"));
      resolve();
    };
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function getActiveProfileId(): Promise<string | null> {
  const db = await openDB();

  if (!db.objectStoreNames.contains(ACTIVE_PROFILE_STORE)) {
    return null;
  }

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([ACTIVE_PROFILE_STORE], "readonly");
    const store = transaction.objectStore(ACTIVE_PROFILE_STORE);

    const request = store.get(ACTIVE_PROFILE_KEY);

    request.onsuccess = () => {
      const result = request.result;
      resolve(result?.profileId || null);
    };

    request.onerror = () => reject(request.error);
  });
}

export async function setActiveProfileId(profileId: string): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([ACTIVE_PROFILE_STORE], "readwrite");
    const store = transaction.objectStore(ACTIVE_PROFILE_STORE);

    store.put({ id: ACTIVE_PROFILE_KEY, profileId });

    transaction.oncomplete = () => {
      window.dispatchEvent(new Event("activeProfileChanged"));
      window.dispatchEvent(new Event("profileUpdated"));
      resolve();
    };
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function getActiveProfile(): Promise<ProfileData> {
  const activeId = await getActiveProfileId();

  if (!activeId) {
    // Return default if no active profile
    return {
      id: "default",
      username: "Your Name",
      handle: "@yourhandle",
      profilePic: null,
      isVerified: false,
      isInstagramVerified: false,
    };
  }

  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PROFILES_STORE], "readonly");
    const store = transaction.objectStore(PROFILES_STORE);

    const request = store.get(activeId);

    request.onsuccess = () => {
      const profile = request.result as ProfileData | undefined;

      if (profile) {
        resolve(profile);
      } else {
        resolve({
          id: "default",
          username: "Your Name",
          handle: "@yourhandle",
          profilePic: null,
          isVerified: false,
          isInstagramVerified: false,
        });
      }
    };

    request.onerror = () => reject(request.error);
  });
}

export async function getLibraryItemsForProfile(
  profileId: string
): Promise<(LibraryItem & { mediaFiles: MediaFile[] })[]> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([LIBRARY_STORE, MEDIA_STORE], "readonly");
    const libraryStore = transaction.objectStore(LIBRARY_STORE);
    const mediaStore = transaction.objectStore(MEDIA_STORE);

    const request = libraryStore.getAll();

    request.onsuccess = async () => {
      const items = (request.result as LibraryItem[]).filter(
        (item) => item.profileId === profileId
      );

      const itemsWithMedia = await Promise.all(
        items.map((item) => {
          return new Promise<LibraryItem & { mediaFiles: MediaFile[] }>((res, rej) => {
            const mediaRequest = mediaStore.index("libraryItemId").getAll(item.id);
            mediaRequest.onsuccess = () => {
              res({ ...item, mediaFiles: mediaRequest.result });
            };
            mediaRequest.onerror = () => rej(mediaRequest.error);
          });
        })
      );

      itemsWithMedia.sort((a, b) => a.createdAt - b.createdAt);
      resolve(itemsWithMedia);
    };

    request.onerror = () => reject(request.error);
  });
}

export async function getSavedSimulationsForProfile(profileId: string): Promise<SavedSimulation[]> {
  const db = await openDB();

  if (!db.objectStoreNames.contains(SAVED_SIMULATIONS_STORE)) {
    return [];
  }

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([SAVED_SIMULATIONS_STORE], "readonly");
    const store = transaction.objectStore(SAVED_SIMULATIONS_STORE);

    const request = store.getAll();

    request.onsuccess = () => {
      const simulations = (request.result as SavedSimulation[]).filter(
        (sim) => sim.profileId === profileId
      );
      simulations.sort((a, b) => b.createdAt - a.createdAt);
      resolve(simulations);
    };

    request.onerror = () => reject(request.error);
  });
}

export async function runMigration(): Promise<void> {
  if (migrationCompleted) {
    return;
  }

  const db = await openDB();

  // Check if migration already ran (profiles store has data)
  const profiles = await getAllProfiles();
  if (profiles.length > 0) {
    migrationCompleted = true;
    return;
  }

  // Get existing profile from old PROFILE_STORE
  const existingProfile = await new Promise<ProfileData | null>((resolve) => {
    if (!db.objectStoreNames.contains(PROFILE_STORE)) {
      resolve(null);
      return;
    }

    const transaction = db.transaction([PROFILE_STORE], "readonly");
    const store = transaction.objectStore(PROFILE_STORE);
    const request = store.get(PROFILE_ID);

    request.onsuccess = () => {
      resolve(request.result || null);
    };
    request.onerror = () => resolve(null);
  });

  // Create new profile with UUID
  const newProfileId = crypto.randomUUID();
  const newProfile: ProfileData = existingProfile
    ? {
        ...existingProfile,
        id: newProfileId,
        createdAt: Date.now(),
        label: "Default",
      }
    : {
        id: newProfileId,
        username: "Your Name",
        handle: "@yourhandle",
        profilePic: null,
        isVerified: false,
        isInstagramVerified: false,
        createdAt: Date.now(),
        label: "Default",
      };

  // Save new profile to profiles store
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction([PROFILES_STORE], "readwrite");
    const store = transaction.objectStore(PROFILES_STORE);
    store.add(newProfile);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });

  // Set as active profile
  await setActiveProfileId(newProfileId);

  // Migrate all library items to have profileId
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction([LIBRARY_STORE], "readwrite");
    const store = transaction.objectStore(LIBRARY_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
      const items = request.result as LibraryItem[];
      items.forEach((item) => {
        if (!item.profileId) {
          item.profileId = newProfileId;
          store.put(item);
        }
      });
    };

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });

  // Migrate all saved simulations to have profileId
  await new Promise<void>((resolve, reject) => {
    if (!db.objectStoreNames.contains(SAVED_SIMULATIONS_STORE)) {
      resolve();
      return;
    }

    const transaction = db.transaction([SAVED_SIMULATIONS_STORE], "readwrite");
    const store = transaction.objectStore(SAVED_SIMULATIONS_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
      const sims = request.result as SavedSimulation[];
      sims.forEach((sim) => {
        if (!sim.profileId) {
          sim.profileId = newProfileId;
          store.put(sim);
        }
      });
    };

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });

  migrationCompleted = true;
  window.dispatchEvent(new Event("profilesListUpdated"));
}
