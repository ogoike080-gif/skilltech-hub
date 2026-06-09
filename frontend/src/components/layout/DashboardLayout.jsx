// ============================================================
// components/layout/DashboardLayout.jsx
// ============================================================
import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { LayoutDashboard, BookOpen, Video, Bot, Award, Users, Briefcase, MessageSquare, User, Zap, ChevronRight, LogOut } from 'lucide-react';
import { selectUser } from '../../store';
import { useAuth } from '../../hooks';

const NAV = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/courses',      icon: BookOpen,        label: 'My Courses', end: false },
  { to: '/live',         icon: Video,           label: 'Live Classes' },
  { to: '/ai-tutor',     icon: Bot,             label: 'AI Tutor' },
  { to: '/certificates', icon: Award,           label: 'Certificates' },
  { to: '/mentors',      icon: Users,           label: 'Mentors' },
  { to: '/community',    icon: MessageSquare,   label: 'Community' },
  { to: '/jobs',         icon: Briefcase,       label: 'Jobs' },
  { to: '/profile',      icon: User,            label: 'Profile' },
];

const INSTRUCTOR_NAV = [
  { to: '/instructor', icon: Zap, label: 'Instructor Portal' },
];

export default function DashboardLayout() {
  const user       = useSelector(selectUser);
  const { logout } = useAuth();

  return (
    <div className="flex min-h-screen pt-16">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 fixed left-0 top-16 bottom-0 bg-surface-50 border-r border-white/10 overflow-y-auto hidden lg:flex flex-col">
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <img src={user?.avatarUrl || `https://api.dicebear.com/8.x/initials/svg?seed=${user?.firstName}`}
              alt="" className="w-9 h-9 rounded-full object-cover" />
            <div className="min-w-0">
              <p className="text-white font-semibold text-sm truncate">{user?.firstName} {user?.lastName}</p>
              <p className="text-white/40 text-xs capitalize">{user?.subscriptionTier} plan</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          {NAV.map(item => (
            <NavLink key={item.to} to={item.to} end={item.end !== false}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive ? 'bg-brand-500/20 text-brand-300' : 'text-white/60 hover:text-white hover:bg-white/5'
                }`
              }>
              <item.icon size={17} />
              {item.label}
            </NavLink>
          ))}

          {(user?.role === 'instructor' || user?.role === 'admin') && (
            <>
              <div className="pt-3 pb-1 px-3">
                <span className="text-white/20 text-xs font-semibold uppercase tracking-wider">Instructor</span>
              </div>
              {INSTRUCTOR_NAV.map(item => (
                <NavLink key={item.to} to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive ? 'bg-brand-500/20 text-brand-300' : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`
                  }>
                  <item.icon size={17} />
                  {item.label}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        <div className="p-3 border-t border-white/10">
          <button onClick={logout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all">
            <LogOut size={17} /> Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 lg:ml-60 p-6 min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
