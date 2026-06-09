import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { selectUser } from '../../store';
import { useAuth } from '../../hooks';
import { User, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';

export default function ProfilePage() {
  const user = useSelector(selectUser);
  const { updateProfile } = useAuth();
  const [form, setForm] = useState({ firstName: user?.firstName || '', lastName: user?.lastName || '', bio: user?.bio || '', headline: user?.headline || '' });
  const [saving, setSaving] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setSaving(true);
    try { await updateProfile(form); } finally { setSaving(false); }
  };
  return (
    <div className="max-w-2xl space-y-6 animate-fade-in">
      <div><h1 className="text-2xl font-bold text-white">Profile Settings</h1><p className="text-white/50 mt-1">Update your personal information</p></div>
      <div className="card flex items-center gap-4">
        <img src={user?.avatarUrl || `https://api.dicebear.com/8.x/initials/svg?seed=${user?.firstName}`} alt="" className="w-16 h-16 rounded-full object-cover"/>
        <div><p className="text-white font-semibold">{user?.firstName} {user?.lastName}</p><p className="text-white/40 text-sm capitalize">{user?.role} · {user?.subscriptionTier} plan</p></div>
      </div>
      <form onSubmit={submit} className="card space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div><label className="text-white/60 text-sm mb-1 block">First Name</label><input value={form.firstName} onChange={e=>setForm({...form,firstName:e.target.value})} className="input"/></div>
          <div><label className="text-white/60 text-sm mb-1 block">Last Name</label><input value={form.lastName} onChange={e=>setForm({...form,lastName:e.target.value})} className="input"/></div>
        </div>
        <div><label className="text-white/60 text-sm mb-1 block">Headline</label><input value={form.headline} onChange={e=>setForm({...form,headline:e.target.value})} className="input" placeholder="e.g. Full Stack Developer"/></div>
        <div><label className="text-white/60 text-sm mb-1 block">Bio</label><textarea value={form.bio} onChange={e=>setForm({...form,bio:e.target.value})} className="input" rows={4} placeholder="Tell us about yourself"/></div>
        <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2"><Save size={16}/>{saving ? 'Saving...' : 'Save Changes'}</button>
      </form>
    </div>
  );
}
