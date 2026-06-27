import React from 'react';

const Footer = () => {
  return (
    <footer className="w-full mt-auto py-8 border-t border-white/5 bg-darkBg-900/50 backdrop-blur-md text-center">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between text-slate-500 text-sm gap-4">
        <div>
          &copy; {new Date().getFullYear()} StartupHub AI. All rights reserved.
        </div>
        <div className="flex gap-6">
          <a href="#" className="hover:text-slate-300 transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-slate-300 transition-colors">Terms of Service</a>
          <a href="#" className="hover:text-slate-300 transition-colors">Support</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
