import { useEffect, useState } from "react";

export default function Dashboard() {
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("contentOS_settings");
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        if (settings.displayName) {
          setDisplayName(settings.displayName);
        }
      } catch (e) {
        console.error("Error loading settings");
      }
    }
  }, []);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-12 pb-32 pl-28">
      <div className="text-center space-y-8 max-w-2xl">
        <h1 className="text-7xl font-bold tracking-tight leading-tight">
          {greeting()}{displayName && `, ${displayName}`}
        </h1>
        <p className="text-xl text-muted-foreground">
          Welcome to your creative space
        </p>
      </div>
    </div>
  );
}
