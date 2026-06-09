// ============================================================
// pages/courses/CoursesPage.jsx
// ============================================================
import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, Filter, Star, Users, BookOpen, Clock, SlidersHorizontal } from 'lucide-react';
import { useCourses } from '../../hooks';
import api from '../../utils/api';

const LEVELS = ['beginner', 'intermediate', 'advanced'];
const TYPES  = ['self_paced', 'live', 'hybrid'];
const SORTS  = [
  { value: 'popular', label: 'Most Popular' },
  { value: 'newest',  label: 'Newest' },
  { value: 'rating',  label: 'Top Rated' },
  { value: 'price_lo',label: 'Price: Low to High' },
  { value: 'price_hi',label: 'Price: High to Low' },
];

function CourseCard({ course }) {
  return (
    <Link to={`/courses/${course.slug}`} className="card-hover group flex flex-col">
      <div className="relative overflow-hidden rounded-xl mb-4">
        {course.thumbnail_url
          ? <img src={course.thumbnail_url} alt={course.title} className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-300" />
          : <div className="w-full h-44 bg-brand-500/10 flex items-center justify-center"><BookOpen size={40} className="text-brand-400/50" /></div>
        }
        {course.type === 'live' && (
          <span className="absolute top-3 left-3 badge bg-red-500/90 text-white text-xs">
            <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse mr-1" />LIVE
          </span>
        )}
        {course.is_free && <span className="absolute top-3 right-3 badge bg-green-500/90 text-white">Free</span>}
      </div>

      <div className="flex-1 flex flex-col">
        <span className="badge text-xs mb-2" style={{ backgroundColor: `${course.school_color}20`, color: course.school_color }}>
          {course.school_name}
        </span>
        <h3 className="font-semibold text-white mb-1 group-hover:text-brand-300 transition-colors line-clamp-2 flex-1">
          {course.title}
        </h3>
        <p className="text-white/40 text-xs mb-3 line-clamp-2">{course.short_desc}</p>

        <div className="flex items-center gap-1 text-xs text-white/40 mb-3">
          <img src={course.instructor_avatar || `https://api.dicebear.com/8.x/initials/svg?seed=${course.first_name}`}
            alt="" className="w-5 h-5 rounded-full" />
          <span>{course.first_name} {course.last_name}</span>
        </div>

        <div className="flex items-center gap-3 text-xs text-white/40 mb-3">
          <span className="flex items-center gap-1"><Star size={11} className="text-yellow-400 fill-yellow-400" /><span className="text-yellow-400">{course.avg_rating || '0.0'}</span></span>
          <span className="flex items-center gap-1"><Users size={11} />{(course.total_students || 0).toLocaleString()}</span>
          {course.duration_hours && <span className="flex items-center gap-1"><Clock size={11} />{course.duration_hours}h</span>}
        </div>

        <div className="flex items-center justify-between">
          <span className="font-bold text-white text-lg">
            {course.is_free ? <span className="text-green-400 text-base">Free</span> : `$${course.price}`}
          </span>
          <span className={`badge text-xs capitalize ${
            course.level === 'beginner' ? 'bg-green-500/20 text-green-400' :
            course.level === 'intermediate' ? 'bg-yellow-500/20 text-yellow-400' :
            'bg-red-500/20 text-red-400'}`}>
            {course.level}
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function CoursesPage() {
  const [params, setParams] = useSearchParams();
  const [schools, setSchools]  = useState([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { courses, fetchCourses } = useCourses();
  const [loading, setLoading] = useState(false);

  const filters = {
    search: params.get('search') || '',
    school: params.get('school') || '',
    level:  params.get('level') || '',
    type:   params.get('type') || '',
    sort:   params.get('sort') || 'popular',
    free:   params.get('free') || '',
    page:   params.get('page') || '1',
  };

  const setFilter = (key, val) => {
    const next = new URLSearchParams(params);
    if (val) next.set(key, val); else next.delete(key);
    next.set('page', '1');
    setParams(next);
  };

  useEffect(() => {
    setLoading(true);
    fetchCourses(filters).finally(() => setLoading(false));
  }, [params.toString()]);

  useEffect(() => {
    api.get('/schools').then(r => setSchools(r.data.data || [])).catch(() => {});
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 min-h-screen">
      <div className="mb-10">
        <h1 className="section-title mb-2">All Courses</h1>
        <p className="text-white/50">Explore our library of expert-led technology courses</p>
      </div>

      {/* Search + filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
          <input value={filters.search} onChange={e => setFilter('search', e.target.value)}
            className="input pl-10" placeholder="Search courses..." />
        </div>
        <select value={filters.sort} onChange={e => setFilter('sort', e.target.value)} className="input w-auto">
          {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <button onClick={() => setFiltersOpen(!filtersOpen)} className="btn-secondary flex items-center gap-2 whitespace-nowrap">
          <SlidersHorizontal size={16} /> Filters
        </button>
      </div>

      {/* Expanded filters */}
      {filtersOpen && (
        <div className="card mb-6 grid sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="text-white/50 text-xs mb-2 block">School</label>
            <select value={filters.school} onChange={e => setFilter('school', e.target.value)} className="input text-sm">
              <option value="">All Schools</option>
              {schools.map(s => <option key={s.slug} value={s.slug}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-white/50 text-xs mb-2 block">Level</label>
            <select value={filters.level} onChange={e => setFilter('level', e.target.value)} className="input text-sm">
              <option value="">All Levels</option>
              {LEVELS.map(l => <option key={l} value={l} className="capitalize">{l}</option>)}
            </select>
          </div>
          <div>
            <label className="text-white/50 text-xs mb-2 block">Type</label>
            <select value={filters.type} onChange={e => setFilter('type', e.target.value)} className="input text-sm">
              <option value="">All Types</option>
              {TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={filters.free === 'true'} onChange={e => setFilter('free', e.target.checked ? 'true' : '')}
                className="w-4 h-4 rounded accent-brand-500" />
              <span className="text-white/70 text-sm">Free only</span>
            </label>
          </div>
        </div>
      )}

      {/* Course grid */}
      {loading
        ? <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="w-full h-44 bg-white/5 rounded-xl mb-4" />
                <div className="h-3 bg-white/5 rounded w-1/3 mb-3" />
                <div className="h-5 bg-white/5 rounded mb-2" />
                <div className="h-4 bg-white/5 rounded w-3/4" />
              </div>
            ))}
          </div>
        : courses.length === 0
          ? <div className="text-center py-20"><BookOpen size={48} className="text-white/10 mx-auto mb-4" /><p className="text-white/40">No courses found. Try different filters.</p></div>
          : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {courses.map(course => <CourseCard key={course.id} course={course} />)}
            </div>
      }
    </div>
  );
}
