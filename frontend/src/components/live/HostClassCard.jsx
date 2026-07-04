// frontend/src/components/live/HostClassCard.jsx

import React, { useState } from 'react';
import { Copy, Check, Radio, Play, Share2, Facebook, Instagram, Music2, X as XIcon, Link2, Video, Download, Loader } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';

const SITE_URL = 'https://skilltech-hub-frontend-production.up.railway.app';

function ShareMenu({ courseUrl, courseTitle, recordingUrl, onClose }) {
  const encodedUrl = encodeURIComponent(courseUrl);
  const encodedText = encodeURIComponent(`Check out my class recording: ${courseTitle}`);

  const copyLink = () => {
    navigator.clipboard.writeText(courseUrl);
    toast.success('Link copied!');
    onClose();
  };

  const downloadRecording = () => {
    if (!recordingUrl) {
      toast.error('Recording not available yet');
      return;
    }
    const a = document.createElement('a');
    a.href = recordingUrl;
    a.download = `${courseTitle || 'recording'}.mp4`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    onClose();
  };

  const shareTargets = [
    {
      label: 'X (Twitter)',
      icon: XIcon,
      action: () => { window.open(`https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`, '_blank'); onClose(); },
    },
    {
      label: 'Facebook',
      icon: Facebook,
      action: () => { window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, '_blank'); onClose(); },
    },
    {
      label: 'Instagram',
      icon: Instagram,
      action: () => {
        navigator.clipboard.writeText(courseUrl);
        toast('Link copied! Paste it into your Instagram bio or story.', { icon: '📋', duration: 5000 });
        onClose();
      },
    },
    {
      label: 'TikTok',
      icon: Music2,
      action: () => {
        navigator.clipboard.writeText(courseUrl);
        toast('Link copied! Paste it into your TikTok bio or video description.', { icon: '📋', duration: 5000 });
        onClose();
      },
    },
  ];

  return (
    <div className="absolute right-0 top-full mt-2 w-56 bg-surface-50 border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden">
      {shareTargets.map(t => (
        <button key={t.label} onClick={t.action}
          className="flex items-center gap-2.5 w-full px-4 py-2.5 hover:bg-white/5 text-white/70 hover:text-white text-sm transition-colors">
          <t.icon size={15} /> {t.label}
        </button>
      ))}
      <div className="border-t border-white/10">
        <button onClick={copyLink}
          className="flex items-center gap-2.5 w-full px-4 py-2.5 hover:bg-white/5 text-white/70 hover:text-white text-sm transition-colors">
          <Link2 size={15} /> Copy link
        </button>
        {recordingUrl && (
          <button onClick={downloadRecording}
            className="flex items-center gap-2.5 w-full px-4 py-2.5 hover:bg-white/5 text-white/70 hover:text-white text-sm transition-colors">
            <Download size={15} /> Download recording
          </button>
        )}
      </div>
    </div>
  );
}

export default function HostClassCard({ session, onStarted, onProcessed }) {
  const [copied, setCopied]       = useState(false);
  const [starting, setStarting]   = useState(false);
  const [processing, setProcessing] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const formattedCode = session.meeting_code?.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3');
  const courseUrl = session.auto_course_slug
    ? `${SITE_URL}/courses/${session.auto_course_slug}`
    : null;

  // Show the manual process button when:
  // – session has ended AND has a recording_url
  // – but no auto_course_slug yet (auto-pipeline may have failed or not fired)
  const canManuallyProcess =
    session.status === 'ended' &&
    session.recording_url &&
    !session.auto_course_slug;

  const copyDetails = () => {
    const text = `Join my live class on SkillTech Hub!\n\nMeeting Code: ${formattedCode}\nPasscode: ${session.passcode}\n\nGo to skilltech-hub-frontend-production.up.railway.app/join and enter these details.`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Class details copied — share with your students!');
    setTimeout(() => setCopied(false), 2000);
  };

  const startClass = async () => {
    setStarting(true);
    try {
      await api.post(`/live/${session.id}/start`);
      toast.success("You're live! 🔴");
      onStarted?.();
    } catch {
      // api.js interceptor handles the toast
    } finally {
      setStarting(false);
    }
  };

  // Manual trigger: process the recording (noise reduction + captions)
  // and create/update the course on Cloudinary. Useful when the auto
  // webhook pipeline didn't fire or the instructor wants to re-trigger.
  const processAndPost = async () => {
    setProcessing(true);
    toast('Processing your recording — this may take a few minutes...', {
      icon: '⏳',
      duration: 8000,
    });
    try {
      await api.post(`/live/${session.id}/process-recording`);
      toast.success('Recording processed and posted to your courses!');
      onProcessed?.();
    } catch {
      // api.js interceptor handles the toast
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="card border-brand-500/30">
      <div className="flex items-center gap-2 mb-4">
        <Radio size={18} className="text-brand-400" />
        <h3 className="font-semibold text-white">{session.title}</h3>
        {session.status === 'ended' && (
          <span className="ml-auto badge bg-white/5 text-white/40 text-xs">Ended</span>
        )}
      </div>

      {/* Meeting code — only show for non-ended sessions */}
      {session.status !== 'ended' && (
        <>
          <div className="bg-surface-100 rounded-xl p-4 mb-4 text-center">
            <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Meeting Code</p>
            <p className="text-2xl font-mono font-bold text-white tracking-wider">{formattedCode}</p>
            <div className="flex items-center justify-center gap-2 mt-3">
              <p className="text-white/40 text-xs uppercase tracking-wider">Passcode:</p>
              <p className="font-mono font-bold text-brand-300">{session.passcode}</p>
            </div>
          </div>

          <button onClick={copyDetails}
            className="btn-secondary w-full flex items-center justify-center gap-2 mb-3 text-sm">
            {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
            {copied ? 'Copied!' : 'Copy & Share With Students'}
          </button>

          <button onClick={startClass} disabled={starting || session.status === 'live'}
            className="btn-primary w-full flex items-center justify-center gap-2">
            {session.status === 'live' ? (
              <><div className="w-2 h-2 bg-white rounded-full animate-pulse" /> Live Now</>
            ) : starting ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Starting...</>
            ) : (
              <><Play size={16} fill="white" /> Start Class</>
            )}
          </button>

          <p className="text-white/30 text-xs text-center mt-3">
            Only you can start this class. Students join with the code above once you've started.
          </p>
        </>
      )}

      {/* Manual process button — appears when session ended with a
          recording but the auto-pipeline hasn't created a course yet */}
      {canManuallyProcess && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <p className="text-white/40 text-xs text-center mb-2">
            Your recording is ready. Post it as a course?
          </p>
          <button onClick={processAndPost} disabled={processing}
            className="btn-primary w-full flex items-center justify-center gap-2 text-sm">
            {processing ? (
              <><Loader size={15} className="animate-spin" /> Processing...</>
            ) : (
              <><Video size={15} /> Process & Post to Courses</>
            )}
          </button>
          <p className="text-white/30 text-xs text-center mt-2">
            Noise removal + auto-captions applied before upload to Cloudinary.
          </p>
        </div>
      )}

      {/* Share + Download — appears once the course exists */}
      {courseUrl && (
        <div className="relative mt-3 pt-3 border-t border-white/10">
          <p className="text-white/40 text-xs text-center mb-2">
            🎉 Your recording is live as a course!
          </p>
          <button onClick={() => setShareOpen(!shareOpen)}
            className="btn-secondary w-full flex items-center justify-center gap-2 text-sm">
            <Share2 size={15} /> Share & Download
          </button>
          {shareOpen && (
            <ShareMenu
              courseUrl={courseUrl}
              courseTitle={session.auto_course_title || session.title}
              recordingUrl={session.recording_url}
              onClose={() => setShareOpen(false)}
            />
          )}
        </div>
      )}
    </div>
  );
}
