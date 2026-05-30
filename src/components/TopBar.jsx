import React from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useAppContext } from "../context/AppContext";
import GlobalSearch from "./GlobalSearch";
import { Menu } from "lucide-react";

const TopBar = ({ setMobileMenuOpen }) => {
  const location = useLocation();
  const { currentUser } = useAuth();
  const { state } = useAppContext();

  // Dynamic titles and subtitles based on route
  const getHeaderInfo = () => {
    const path = location.pathname;
    const hotelName = state.hotelConfig?.hotel_name || "your hotel";

    if (path.startsWith("/dashboard")) {
      return { title: "Hotel Performance", subtitle: `Here's what's happening at ${hotelName} today.` };
    } else if (path.startsWith("/reviews")) {
      return { title: "Guest Reviews", subtitle: "Monitor, analyze, and respond to your guests." };
    } else if (path.startsWith("/settings")) {
      return { title: "Settings", subtitle: "Configure properties, team notifications, and automations." };
    } else if (path.startsWith("/tickets")) {
      return { title: "Operations Tickets", subtitle: "Track automated escalations and guest request resolution." };
    } else if (path.startsWith("/reports") || path.startsWith("/analytics")) {
      return { title: "Reports & Analytics", subtitle: "Visual trends and department breakdown insights." };
    } else {
      return { title: "ReviewRescue", subtitle: "Rescue reviews and protect hotel reputation." };
    }
  };

  const { title, subtitle } = getHeaderInfo();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-4 md:px-6 lg:px-8 py-3 md:py-4 bg-white/95 backdrop-blur-sm border-b border-zinc-200/80 transition-all duration-300">
      <div className="flex items-center gap-3">
        <button 
          onClick={() => setMobileMenuOpen(true)}
          className="lg:hidden p-2 -ml-2 text-zinc-500 hover:text-zinc-900 focus:outline-none rounded-lg"
          aria-label="Open sidebar"
        >
          <Menu size={24} />
        </button>
        <div className="flex flex-col">
          <h2 className="text-lg md:text-xl font-bold text-zinc-900 font-display leading-tight">{title}</h2>
          <p className="hidden md:block text-[11px] md:text-xs text-zinc-400 font-normal mt-0.5">{subtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 md:gap-4">
        <div className="hidden sm:block">
          <GlobalSearch />
        </div>
        
        <div className="h-8 w-px bg-zinc-200 hidden sm:block" />

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 md:w-9 md:h-9 bg-orange-50 border border-orange-100 text-orange-600 rounded-full flex items-center justify-center font-bold text-sm shadow-sm select-none">
            {currentUser?.avatar_initials || currentUser?.name?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="hidden md:flex flex-col text-left">
            <span className="text-xs font-semibold text-zinc-800 leading-none">{currentUser?.name}</span>
            <span className="text-[10px] text-zinc-400 capitalize mt-0.5">{currentUser?.role?.replace("_", " ")}</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopBar;
