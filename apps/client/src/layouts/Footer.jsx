import { Heart, Sparkles, Crown } from 'lucide-react';

const Footer = ({ sidebarCollapsed }) => {
  return (
    <footer 
      className={`fixed bottom-0 right-0 h-14 bg-white/80 backdrop-blur-xl border-t border-cream-200 
        flex items-center justify-between px-6 z-40 transition-all duration-500
        ${sidebarCollapsed ? 'left-20' : 'left-72'}`}
    >
      {/* Left — Copyright */}
      <div className="flex items-center gap-2 text-xs text-velvet-400">
        <span>© 2026 Marquee ERP</span>
        <span className="text-royal-300">|</span>
        <span className="flex items-center gap-1">
          Made with <Heart className="w-3 h-3 text-royal-500 fill-royal-500" /> for
        </span>
        <span className="font-display text-royal-600 font-semibold">Luxury Events</span>
      </div>

      {/* Center — Status */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gold-50 rounded-full border border-gold-200">
          <Crown className="w-3 h-3 text-gold-600" />
          <span className="text-xs font-semibold text-gold-700">Premium Plan</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-royal-50 rounded-full border border-royal-200">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs font-semibold text-royal-700">System Online</span>
        </div>
      </div>

      {/* Right — Version */}
      <div className="flex items-center gap-2 text-xs text-velvet-400">
        <Sparkles className="w-3 h-3 text-gold-500" />
        <span className="font-medium">v1.0.0</span>
      </div>
    </footer>
  );
};

export default Footer;