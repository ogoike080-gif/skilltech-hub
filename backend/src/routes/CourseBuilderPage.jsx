// frontend/src/pages/instructor/CourseBuilderPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronDown, ChevronRight, Plus, Trash2, Upload,
  Edit2, Check, X, Eye, Globe, Lock, Video,
  GripVertical, Loader, BookOpen, Save
} from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

// ── Inline editable text ───────────────────────────────────
function EditableText({ value, onSave, className = '', placeholder = 'Click to edit' }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(value);
  const inputRef              = useRef(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const save = () => {
    if (draft.trim() && draft !== value) onSave(draft.trim());
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1 flex-1">
        <input ref={inputRef} value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
          className="input py-1 text-sm flex-1" />
        <button onClick={save} className="p-1 text-green-400 hover:text-green-300"><Check size={14} /></button>
        <button onClick={() => setEditing(false)} className="p-1 text-white/40 hover:text-white"><X size={14} /></button>
      </div>
    );
  }

  return (
    <span onClick={() => { setDraft(value); setEditing(true); }}
      className={`cursor-pointer hover:text-brand-300 transition-colors ${className}`}>
      {value || <span className="text-white/30 italic">{placeholder}</span>}
    </span>
  );
}

// ── Video upload area ──────────────────────────────────────
function VideoUploader({ lessonId, courseId, sectionId, currentUrl, onUploaded }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress]  = useState(0);
  const inputRef                  = useRef(null);

  const handleFile = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('video/')) { toast.error('Please select a video file'); return; }
    if (file.size > 500 * 1024 * 1024) { toast.error('Video must be under 500MB'); return; }

    setUploading(true);
    setProgress(0);
    const formData = new FormData();
    formData.append('video', file);
    formData.append('title', file.name.replace(/\.[^.]+$/, ''));

    try {
      const res = await api.put(
        `/courses/${courseId}/lessons/${lessonId}`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (e) => {
            setProgress(Math.round((e.loaded * 100) / e.total));
          },
        }
      );
      toast.success('Video uploaded!');
      onUploaded(res.data.data?.contentUrl || currentUrl);
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className="mt-2">
      {currentUrl ? (
        <div className="flex items-center gap-2 p-2 bg-green-500/10 border border-green-500/20 rounded-lg">
          <Video size={14} className="text-green-400 flex-shrink-0" />
          <span className="text-green-400 text-xs truncate flex-1">Video uploaded</span>
          <button onClick={() => inputRef.current?.click()}
            className="text-white/40 hover:text-white text-xs">Replace</button>
        </div>
      ) : (
        <button onClick={() => inputRef.current?.click()} disabled={uploading}
          className="w-full border-2 border-dashed border-white/20 hover:border-brand-500/50 rounded-lg p-3 text-center transition-colors">
          {uploading ? (
            <div className="space-y-1">
              <div className="w-full bg-white/10 rounded-full h-1.5">
                <div className="bg-brand-500 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-white/50 text-xs">Uploading... {progress}%</p>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 text-white/40">
              <Upload size={14} /> <span className="text-xs">Upload video</span>
            </div>
          )}
        </button>
      )}
      <input ref={inputRef} type="file" accept="video/*" className="hidden"
        onChange={e => handleFile(e.target.files[0])} />
    </div>
  );
}

// ── Lesson row ─────────────────────────────────────────────
function LessonRow({ lesson, courseId, sectionId, onUpdate, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm('Delete this lesson?')) return;
    setDeleting(true);
    try {
      await api.delete(`/courses/${courseId}/lessons/${lesson.id}`);
      onDelete(lesson.id);
    } catch {} finally { setDeleting(false); }
  };

  const updateTitle = async (title) => {
    try {
      await api.put(`/courses/${courseId}/lessons/${lesson.id}`, { title });
      onUpdate({ ...lesson, title });
    } catch {}
  };

  const togglePreview = async () => {
    try {
      await api.put(`/courses/${courseId}/lessons/${lesson.id}`, { isPreview: !lesson.is_preview });
      onUpdate({ ...lesson, is_preview: !lesson.is_preview });
    } catch {}
  };

  return (
    <div className="bg-surface-100 rounded-xl border border-white/5">
      <div className="flex items-center gap-2 p-2.5">
        <GripVertical size={14} className="text-white/20 flex-shrink-0 cursor-grab" />
        <Video size={13} className="text-brand-400 flex-shrink-0" />
        <EditableText value={lesson.title} onSave={updateTitle}
          className="text-white/80 text-sm flex-1" />
        <div className="flex items-center gap-1 ml-auto flex-shrink-0">
          <button onClick={togglePreview} title={lesson.is_preview ? 'Remove free preview' : 'Set as free preview'}
            className={`text-xs px-1.5 py-0.5 rounded ${lesson.is_preview ? 'bg-green-500/20 text-green-400' : 'text-white/30 hover:text-white/60'}`}>
            {lesson.is_preview ? 'Free' : 'Free?'}
          </button>
          <button onClick={() => setExpanded(!expanded)}
            className="p-1 text-white/30 hover:text-white">
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
          <button onClick={handleDelete} disabled={deleting}
            className="p-1 text-white/30 hover:text-red-400">
            {deleting ? <Loader size={13} className="animate-spin" /> : <Trash2 size={13} />}
          </button>
        </div>
      </div>
      {expanded && (
        <div className="px-3 pb-3 border-t border-white/5 pt-2">
          <VideoUploader
            lessonId={lesson.id}
            courseId={courseId}
            sectionId={sectionId}
            currentUrl={lesson.content_url}
            onUploaded={(url) => onUpdate({ ...lesson, content_url: url })}
          />
        </div>
      )}
    </div>
  );
}

// ── Section card ───────────────────────────────────────────
function SectionCard({ section, courseId, onUpdate, onDelete, onLessonAdded }) {
  const [collapsed, setCollapsed]   = useState(false);
  const [addingLesson, setAddingLesson] = useState(false);
  const [newLessonTitle, setNewLessonTitle] = useState('');
  const [deleting, setDeleting]     = useState(false);

  const updateTitle = async (title) => {
    try {
      await api.put(`/courses/${courseId}/sections/${section.id}`, { title });
      onUpdate({ ...section, title });
    } catch {}
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete section "${section.title}" and all its lessons?`)) return;
    setDeleting(true);
    try {
      await api.delete(`/courses/${courseId}/sections/${section.id}`);
      onDelete(section.id);
    } catch {} finally { setDeleting(false); }
  };

  const addLesson = async () => {
    if (!newLessonTitle.trim()) { toast.error('Lesson title required'); return; }
    try {
      const res = await api.post(`/courses/${courseId}/sections/${section.id}/lessons`, {
        title: newLessonTitle.trim(),
        type: 'video',
      });
      onLessonAdded(section.id, res.data.data);
      setNewLessonTitle('');
      setAddingLesson(false);
    } catch {}
  };

  const updateLesson = (updated) => {
    onUpdate({
      ...section,
      lessons: section.lessons.map(l => l.id === updated.id ? updated : l),
    });
  };

  const deleteLesson = (lessonId) => {
    onUpdate({
      ...section,
      lessons: section.lessons.filter(l => l.id !== lessonId),
    });
  };

  return (
    <div className="card border-white/10 p-0 overflow-hidden">
      {/* Section header */}
      <div className="flex items-center gap-2 p-3 bg-surface-100">
        <GripVertical size={15} className="text-white/20 cursor-grab flex-shrink-0" />
        <button onClick={() => setCollapsed(!collapsed)} className="text-white/40 hover:text-white flex-shrink-0">
          {collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
        </button>
        <BookOpen size={14} className="text-brand-400 flex-shrink-0" />
        <EditableText value={section.title} onSave={updateTitle}
          className="text-white font-medium flex-1" />
        <span className="text-white/30 text-xs flex-shrink-0">
          {section.lessons?.length || 0} lesson{section.lessons?.length !== 1 ? 's' : ''}
        </span>
        <button onClick={handleDelete} disabled={deleting}
          className="p-1 text-white/30 hover:text-red-400 flex-shrink-0">
          {deleting ? <Loader size={14} className="animate-spin" /> : <Trash2 size={14} />}
        </button>
      </div>

      {/* Lessons */}
      {!collapsed && (
        <div className="p-3 space-y-2">
          {(section.lessons || []).map(lesson => (
            <LessonRow key={lesson.id} lesson={lesson} courseId={courseId}
              sectionId={section.id} onUpdate={updateLesson} onDelete={deleteLesson} />
          ))}

          {addingLesson ? (
            <div className="flex items-center gap-2">
              <input value={newLessonTitle} onChange={e => setNewLessonTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addLesson(); if (e.key === 'Escape') setAddingLesson(false); }}
                className="input py-2 text-sm flex-1" placeholder="Lesson title..."
                autoFocus />
              <button onClick={addLesson} className="btn-primary py-2 px-3 text-sm">Add</button>
              <button onClick={() => setAddingLesson(false)} className="btn-ghost py-2 px-2 text-sm">✕</button>
            </div>
          ) : (
            <button onClick={() => setAddingLesson(true)}
              className="flex items-center gap-1.5 text-white/40 hover:text-brand-400 text-sm transition-colors py-1">
              <Plus size={14} /> Add lesson
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Course Details Tab ─────────────────────────────────────
function CourseDetailsTab({ course, onSaved }) {
  const [form, setForm]   = useState({
    title: course.title || '',
    description: course.description || '',
    shortDesc: course.short_desc || '',
    level: course.level || 'beginner',
    type: course.type || 'self_paced',
    price: course.price || 0,
    language: course.language || 'en',
    requirements: course.requirements || '',
    objectives: course.objectives || '',
  });
  const [saving, setSaving]     = useState(false);
  const [thumbFile, setThumbFile] = useState(null);
  const [thumbPreview, setThumbPreview] = useState(course.thumbnail_url || null);
  const thumbRef = useRef(null);

  const handleThumb = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setThumbFile(file);
    setThumbPreview(URL.createObjectURL(file));
  };

  const save = async () => {
    setSaving(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => formData.append(k, v));
      if (thumbFile) formData.append('thumbnail', thumbFile);
      await api.put(`/courses/${course.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Course details saved');
      onSaved?.();
    } catch {} finally { setSaving(false); }
  };

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Thumbnail */}
      <div>
        <label className="text-white/60 text-sm mb-2 block">Course Thumbnail</label>
        <div onClick={() => thumbRef.current?.click()}
          className="w-full aspect-video bg-surface-100 rounded-xl border-2 border-dashed border-white/20 hover:border-brand-500/50 cursor-pointer overflow-hidden transition-colors flex items-center justify-center">
          {thumbPreview
            ? <img src={thumbPreview} alt="" className="w-full h-full object-cover" />
            : <div className="text-center text-white/30"><Upload size={24} className="mx-auto mb-2" /><p className="text-sm">Click to upload thumbnail</p></div>
          }
        </div>
        <input ref={thumbRef} type="file" accept="image/*" className="hidden" onChange={handleThumb} />
      </div>

      <div>
        <label className="text-white/60 text-sm mb-1.5 block">Course Title *</label>
        <input value={form.title} onChange={e => setForm({...form, title: e.target.value})}
          className="input" placeholder="e.g. Complete React Developer Course" />
      </div>

      <div>
        <label className="text-white/60 text-sm mb-1.5 block">Short Description</label>
        <input value={form.shortDesc} onChange={e => setForm({...form, shortDesc: e.target.value})}
          className="input" placeholder="One-line summary shown in course cards" />
      </div>

      <div>
        <label className="text-white/60 text-sm mb-1.5 block">Full Description</label>
        <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})}
          className="input resize-none" rows={5} placeholder="Detailed course description..." />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-white/60 text-sm mb-1.5 block">Level</label>
          <select value={form.level} onChange={e => setForm({...form, level: e.target.value})} className="input">
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>
        <div>
          <label className="text-white/60 text-sm mb-1.5 block">Type</label>
          <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="input">
            <option value="self_paced">Self-paced</option>
            <option value="live">Live</option>
            <option value="hybrid">Hybrid</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-white/60 text-sm mb-1.5 block">Price ($) — 0 = free</label>
          <input type="number" value={form.price} min={0} step={0.01}
            onChange={e => setForm({...form, price: parseFloat(e.target.value)})}
            className="input" />
        </div>
        <div>
          <label className="text-white/60 text-sm mb-1.5 block">Language</label>
          <select value={form.language} onChange={e => setForm({...form, language: e.target.value})} className="input">
            <option value="en">English</option>
            <option value="fr">French</option>
            <option value="yo">Yoruba</option>
            <option value="ig">Igbo</option>
            <option value="ha">Hausa</option>
            <option value="pcm">Pidgin</option>
          </select>
        </div>
      </div>

      <div>
        <label className="text-white/60 text-sm mb-1.5 block">Requirements / Prerequisites</label>
        <textarea value={form.requirements} onChange={e => setForm({...form, requirements: e.target.value})}
          className="input resize-none" rows={3} placeholder="What students need before taking this course..." />
      </div>

      <div>
        <label className="text-white/60 text-sm mb-1.5 block">What Students Will Learn</label>
        <textarea value={form.objectives} onChange={e => setForm({...form, objectives: e.target.value})}
          className="input resize-none" rows={3} placeholder="Learning outcomes and objectives..." />
      </div>

      <button onClick={save} disabled={saving}
        className="btn-primary flex items-center gap-2">
        {saving ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
        {saving ? 'Saving...' : 'Save Details'}
      </button>
    </div>
  );
}

// ── Curriculum Tab ─────────────────────────────────────────
function CurriculumTab({ course, sections, setSections }) {
  const [addingSection, setAddingSection] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');

  const addSection = async () => {
    if (!newSectionTitle.trim()) { toast.error('Section title required'); return; }
    try {
      const res = await api.post(`/courses/${course.id}/sections`, { title: newSectionTitle.trim() });
      setSections(prev => [...prev, { ...res.data.data, lessons: [] }]);
      setNewSectionTitle('');
      setAddingSection(false);
    } catch {}
  };

  const updateSection = (updated) => {
    setSections(prev => prev.map(s => s.id === updated.id ? updated : s));
  };

  const deleteSection = (sectionId) => {
    setSections(prev => prev.filter(s => s.id !== sectionId));
  };

  const addLesson = (sectionId, lesson) => {
    setSections(prev => prev.map(s =>
      s.id === sectionId ? { ...s, lessons: [...(s.lessons || []), lesson] } : s
    ));
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <p className="text-white/50 text-sm">
          {sections.reduce((sum, s) => sum + (s.lessons?.length || 0), 0)} lessons across {sections.length} sections
        </p>
      </div>

      {sections.map(section => (
        <SectionCard key={section.id} section={section} courseId={course.id}
          onUpdate={updateSection} onDelete={deleteSection} onLessonAdded={addLesson} />
      ))}

      {addingSection ? (
        <div className="flex items-center gap-2">
          <input value={newSectionTitle} onChange={e => setNewSectionTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addSection(); if (e.key === 'Escape') setAddingSection(false); }}
            className="input flex-1" placeholder="Section title..." autoFocus />
          <button onClick={addSection} className="btn-primary px-4">Add</button>
          <button onClick={() => setAddingSection(false)} className="btn-ghost px-3">✕</button>
        </div>
      ) : (
        <button onClick={() => setAddingSection(true)}
          className="btn-secondary w-full flex items-center justify-center gap-2">
          <Plus size={16} /> Add Section
        </button>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────
export default function CourseBuilderPage() {
  const { courseId } = useParams();
  const navigate     = useNavigate();
  const [course, setCourse]     = useState(null);
  const [sections, setSections] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState('details');
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    api.get(`/courses/${courseId}/builder`).then(r => {
      const { sections: secs, ...courseData } = r.data.data;
      setCourse(courseData);
      setSections(secs || []);
    }).catch(() => {
      toast.error('Could not load course');
      navigate('/instructor');
    }).finally(() => setLoading(false));
  }, [courseId]);

  const togglePublish = async () => {
    setPublishing(true);
    try {
      const res = await api.put(`/courses/${courseId}/publish`);
      setCourse(prev => ({ ...prev, is_published: res.data.data.is_published }));
      toast.success(res.data.data.is_published ? 'Course is now live!' : 'Course unpublished');
    } catch {} finally { setPublishing(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-96">
      <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!course) return null;

  const tabs = [
    { id: 'details',    label: 'Course Details' },
    { id: 'curriculum', label: 'Curriculum' },
  ];

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <button onClick={() => navigate('/instructor')}
            className="text-white/40 hover:text-white text-sm mb-2 flex items-center gap-1">
            ← Back to Portal
          </button>
          <h1 className="text-2xl font-bold text-white">{course.title}</h1>
          <p className="text-white/40 text-sm mt-1">
            {sections.reduce((s, sec) => s + (sec.lessons?.length || 0), 0)} lessons · {course.school_name}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a href={`/courses/${course.slug}`} target="_blank" rel="noreferrer"
            className="btn-ghost flex items-center gap-2 text-sm">
            <Eye size={15} /> Preview
          </a>
          <button onClick={togglePublish} disabled={publishing}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
              course.is_published
                ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30'
                : 'btn-primary'
            }`}>
            {publishing ? <Loader size={14} className="animate-spin" /> : course.is_published ? <Globe size={14} /> : <Lock size={14} />}
            {course.is_published ? 'Published' : 'Publish Course'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-50 rounded-xl p-1 w-fit">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id ? 'bg-brand-500 text-white' : 'text-white/50 hover:text-white'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'details' && (
        <CourseDetailsTab course={course} onSaved={() => {}} />
      )}
      {activeTab === 'curriculum' && (
        <CurriculumTab course={course} sections={sections} setSections={setSections} />
      )}
    </div>
  );
}
