import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Menu, X, Bell, User, LogOut, BookOpen, LayoutDashboard, Zap, ChevronDown, Bot } from 'lucide-react';
import { selectUser, selectIsAuth, selectUnreadCount } from '../../store';
import { useAuth } from '../../hooks';

export default function Navbar() {
  const [open, setOpen]       = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const isAuth     = useSelector(selectIsAuth);
  const user       = useSelector(selectUser);
  const unread     = useSelector(selectUnreadCount);
  const { logout } = useAuth();
  const location   = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setOpen(false); setUserMenu(false); }, [location]);

  const navLinks = [
    { to: '/courses',   label: 'Courses' },
    { to: '/live',      label: 'Live Classes' },
    { to: '/schools',   label: 'Schools' },
    { to: '/mentors',   label: 'Mentors' },
    { to: '/community', label: 'Community' },
    { to: '/jobs',      label: 'Jobs' },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-surface/95 backdrop-blur-md border-b border-white/10 shadow-lg' : 'bg-transparent'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 font-black text-xl">
            <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
              <Zap size={16} className="text-white" />
            </div>
            <span className="gradient-text">SkillTech Hub</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(link => (
              <Link key={link.to} to={link.to}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${location.pathname.startsWith(link.to) ? 'text-brand-400 bg-brand-500/10' : 'text-white/70 hover:text-white hover:bg-white/5'}`}>
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right actions */}
          <div className="hidden md:flex items-center gap-2">
            {isAuth ? (
              <>
                <Link to="/ai-tutor" className="btn-ghost flex items-center gap-1.5 text-sm">
                  <Bot size={16} className="text-brand-400" /> AI Tutor
                </Link>
                <Link to="/dashboard" className="relative btn-ghost p-2">
                  <Bell size={18} />
                  {unread > 0 && <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-xs flex items-center justify-center text-white">{unread}</span>}
                </Link>

                {/* User dropdown */}
                <div className="relative">
                  <button onClick={() => setUserMenu(!userMenu)} className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-white/5 transition-colors">
                    <img src={user?.avatarUrl || `https://api.dicebear.com/8.x/initials/svg?seed=${user?.firstName}`}
                      alt="" className="w-7 h-7 rounded-full object-cover" />
                    <span className="text-white/80 text-sm font-medium">{user?.firstName}</span>
                    <ChevronDown size={14} className={`text-white/40 transition-transform ${userMenu ? 'rotate-180' : ''}`} />
                  </button>

                  {userMenu && (
                    <div className="absolute right-0 top-full mt-2 w-52 bg-surface-50 border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden">
                      <div className="p-3 border-b border-white/10">
                        <p className="text-white font-semibold text-sm">{user?.firstName} {user?.lastName}</p>
                        <p className="text-white/40 text-xs capitalize">{user?.role} · {user?.subscriptionTier}</p>
                      </div>
                      {[
                        { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
                        { to: '/profile',    icon: User,            label: 'Profile' },
                        { to: '/certificates', icon: BookOpen,      label: 'Certificates' },
                        ...(user?.role === 'instructor' || user?.role === 'admin' ? [{ to: '/instructor', icon: Zap, label: 'Instructor Portal' }] : []),
                        ...(user?.role === 'admin' ? [{ to: '/admin', icon: Zap, label: 'Admin Panel' }] : []),
                      ].map(item => (
                        <Link key={item.to} to={item.to} className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-white/5 text-white/70 hover:text-white text-sm transition-colors">
                          <item.icon size={14} /> {item.label}
                        </Link>
                      ))}
                      <div className="border-t border-white/10">
                        <button onClick={logout} className="flex items-center gap-2.5 w-full px-4 py-2.5 hover:bg-red-500/10 text-red-400 hover:text-red-300 text-sm transition-colors">
                          <LogOut size={14} /> Sign out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link to="/login"    className="btn-ghost text-sm">Sign in</Link>
                <Link to="/register" className="btn-primary text-sm px-4 py-2">Get Started</Link>
              </>
            )}
          </div>

          {/* Mobile toggle */}
          <button onClick={() => setOpen(!open)} className="md:hidden p-2 rounded-lg hover:bg-white/5 text-white">
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile menu */}
        {open && (
          <div className="md:hidden py-4 border-t border-white/10 animate-slide-up">
            {navLinks.map(link => (
              <Link key={link.to} to={link.to} className="block px-3 py-2.5 text-white/70 hover:text-white text-sm rounded-lg hover:bg-white/5 mb-1">
                {link.label}
              </Link>
            ))}
            {!isAuth && (
              <div className="flex gap-2 mt-4 pt-4 border-t border-white/10">
                <Link to="/login"    className="btn-secondary text-sm flex-1 text-center">Sign in</Link>
                <Link to="/register" className="btn-primary text-sm flex-1 text-center">Register</Link>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
