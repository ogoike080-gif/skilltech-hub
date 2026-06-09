import React from 'react';
import { Link } from 'react-router-dom';
import { Zap, Github, Twitter, Linkedin, Youtube } from 'lucide-react';

const LINKS = {
  Platform:   [{ to: '/courses', l: 'Courses' }, { to: '/live', l: 'Live Classes' }, { to: '/schools', l: 'Schools' }, { to: '/mentors', l: 'Mentors' }, { to: '/jobs', l: 'Job Board' }],
  Community:  [{ to: '/community', l: 'Forums' }, { to: '/community?type=project', l: 'Projects' }, { to: '/community?type=event', l: 'Hackathons' }],
  Company:    [{ to: '/about', l: 'About' }, { to: '/blog', l: 'Blog' }, { to: '/careers', l: 'Careers' }, { to: '/contact', l: 'Contact' }],
  Legal:      [{ to: '/privacy', l: 'Privacy' }, { to: '/terms', l: 'Terms' }, { to: '/cookies', l: 'Cookies' }],
};

export default function Footer() {
  return (
    <footer className="bg-surface-50 border-t border-white/10 mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 font-black text-xl mb-4">
              <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
                <Zap size={16} className="text-white" />
              </div>
              <span className="gradient-text">SkillTech</span>
            </Link>
            <p className="text-white/40 text-sm leading-relaxed mb-4">
              The most advanced platform for live tech education, AI-powered learning, and career development.
            </p>
            <div className="flex gap-3">
              {[Github, Twitter, Linkedin, Youtube].map((Icon, i) => (
                <a key={i} href="#" className="w-8 h-8 rounded-lg bg-white/5 hover:bg-brand-500/20 flex items-center justify-center text-white/40 hover:text-brand-300 transition-colors">
                  <Icon size={15} />
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          {Object.entries(LINKS).map(([section, links]) => (
            <div key={section}>
              <h4 className="text-white font-semibold text-sm mb-4">{section}</h4>
              <ul className="space-y-2">
                {links.map(link => (
                  <li key={link.l}>
                    <Link to={link.to} className="text-white/40 hover:text-white/70 text-sm transition-colors">{link.l}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-white/30 text-sm">© {new Date().getFullYear()} SkillTech Hub. All rights reserved.</p>
          <p className="text-white/20 text-xs">Built with ❤️ for the next generation of tech professionals</p>
        </div>
      </div>
    </footer>
  );
}
