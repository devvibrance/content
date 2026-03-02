import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { FloatingNav } from "@/components/FloatingNav";
import { ImmersiveBackground } from "@/components/immersive-background";
import { motion, AnimatePresence } from "framer-motion";
import Library from "@/pages/Library";
import Simulator from "@/pages/Simulator";
import ProfileSimulator from "@/pages/ProfileSimulator";
import NotFound from "@/pages/not-found";
import { useState, useEffect } from "react";
import { runMigration } from "@/lib/indexedDB";

function AnimatedRoutes() {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
        className="w-full h-full"
      >
        <Routes location={location}>
          <Route path="/" element={<ProfileSimulator />} />
          <Route path="/profile" element={<ProfileSimulator />} />
          <Route path="/simulator" element={<Simulator />} />
          <Route path="/library" element={<Library />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

export default function App() {
  const [migrationComplete, setMigrationComplete] = useState(false);
  const [immersiveSettings, setImmersiveSettings] = useState({
    isEnabled: false,
    backgroundUrl: "",
    brightness: 50,
    blur: 0,
  });

  useEffect(() => {
    runMigration()
      .then(() => setMigrationComplete(true))
      .catch((err) => {
        console.error("Migration failed:", err);
        setMigrationComplete(true);
      });
  }, []);

  useEffect(() => {
    const loadSettings = () => {
      const saved = localStorage.getItem('contentOS_settings');
      if (saved) {
        try {
          const settings = JSON.parse(saved);
          if (settings.immersiveEnabled !== undefined || settings.backgroundUrl) {
            setImmersiveSettings({
              isEnabled: settings.immersiveEnabled || false,
              backgroundUrl: settings.backgroundUrl || "",
              brightness: settings.brightness || 50,
              blur: settings.blur || 0,
            });
          }
        } catch (e) {
          console.error("Error loading immersive settings");
        }
      }
    };

    loadSettings();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'contentOS_settings') {
        loadSettings();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    const handleCustomUpdate = () => {
      loadSettings();
    };
    window.addEventListener('settingsUpdated', handleCustomUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('settingsUpdated', handleCustomUpdate);
    };
  }, []);

  if (!migrationComplete) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-black">
        <div className="text-white/60 text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <div className="relative min-h-screen w-full">
            <ImmersiveBackground
              isEnabled={immersiveSettings.isEnabled}
              backgroundUrl={immersiveSettings.backgroundUrl}
              brightness={immersiveSettings.brightness}
              blur={immersiveSettings.blur}
            />
            <main className="relative z-10 w-full">
              <AnimatedRoutes />
            </main>
            <FloatingNav />
          </div>
          <Toaster />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
