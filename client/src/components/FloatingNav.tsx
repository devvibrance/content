import { Library, Target, Settings, UserCircle } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SettingsDialog } from "./SettingsDialog";
import { ProfileSwitcher } from "./ProfileSwitcher";
import { useState } from "react";

const navItems = [
  { title: "Profile", url: "/", icon: UserCircle },
  { title: "Simulator", url: "/simulator", icon: Target },
  { title: "Library", url: "/library", icon: Library },
];

export function FloatingNav() {
  const location = useLocation();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <nav
      className="fixed left-6 top-1/2 transform -translate-y-1/2 z-50 bg-[#0E0E0E]/80 backdrop-blur-xl rounded-2xl px-2 py-3 shadow-2xl animate-in fade-in slide-in-from-left-4 duration-500"
      data-testid="floating-nav"
    >
      <div className="flex flex-col items-center gap-2">
        <ProfileSwitcher />
        <div className="w-full h-px bg-white/10 my-1" />
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.url;
          return (
            <Link key={item.url} to={item.url}>
              <Button
                variant="ghost"
                size="icon"
                className={`rounded-full transition-all duration-300 relative group ${
                  isActive 
                    ? "bg-white/10 text-white" 
                    : "hover-elevate hover:scale-105"
                }`}
                data-testid={`nav-${item.title.toLowerCase()}`}
              >
                <Icon className="w-5 h-5" />
                <span className="absolute left-full ml-3 top-0 px-3 py-1.5 bg-black/40 backdrop-blur-md text-white text-sm rounded-[8px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-lg">
                  {item.title}
                </span>
              </Button>
            </Link>
          );
        })}
        <div className="w-full h-px bg-white/10 my-1" />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSettingsOpen(true)}
          className="rounded-full transition-all duration-300 relative group hover-elevate hover:scale-105"
          data-testid="nav-settings"
        >
          <Settings className="w-5 h-5" />
          <span className="absolute left-full ml-3 top-0 px-3 py-1.5 bg-black/40 backdrop-blur-md text-white text-sm rounded-[8px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-lg">
            Settings
          </span>
        </Button>
      </div>
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </nav>
  );
}
