import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, Users, Award, BookOpen, Zap, Code, Brain, Shield, Cloud, Palette, TrendingUp, Star, ChevronRight, Video, Globe } from 'lucide-react';
import api from '../utils/api';

const SCHOOLS = [
  { name: 'Software Engineering', slug: 'software-engineering', icon: Code,   color: '#6366f1', courses: 24, desc: 'HTML, CSS, JavaScript, React, Node.js, Python' },
  { name: 'Artificial Intelligence', slug: 'artificial-intelligence', icon: Brain, color: '#8b5cf6', courses: 18, desc: 'ML, Deep Learning, Generative AI, Prompt Engineering' },
  { name: 'Data Science', slug: 'data-science', icon: TrendingUp, color: '#06b6d4', courses: 14, desc: 'SQL, Power BI, Tableau, Python Analytics' },
  { name: 'Cybersecurity', slug: 'cybersecurity', icon: Shield, color: '#ef4444', courses: 12, desc: 'Ethical Hacking, Network Security, SOC Operations' },
  { name: 'Cloud Computing', slug: 'cloud-computing', icon: Cloud, color: '#f59e0b', courses: 16, desc: 'AWS, Azure, Google Cloud, DevOps, Kubernetes' },
  { name: 'Product Design', slug: 'product-design', icon: Palette, color: '#ec4899', courses: 10, desc: 'UI/UX Design, Figma, Design Systems' },
];

const STATS = [
  { value: '50,000+', label: 'Students Enrolled' },
  { value: '200+',    label: 'Expert Courses' },
  { value: '98%',     label: 'Completion Rate' },
  { value: '500+',    label: 'Live Classes Monthly' },
];

const FEATURES = [
  { icon: Video,    title: 'Live Virtual Classrooms', desc: 'HD video classes with interactive whiteboards, breakout rooms, and real-time collaboration tools.' },
  { icon: Brain,    title: 'AI-Powered Tutor',        desc: '24/7 AI assistant that explains concepts, generates quizzes, and creates personalized study plans.' },
  { icon: Code,     title: 'Browser-Based Code Lab',  desc: 'Write and run code instantly — HTML, CSS, JS, React, Python, Java, and more, right in your browser.' },
  { icon: Globe,    title: 'Multiplatform Streaming', desc: 'Instructors broadcast live to YouTube, Facebook, Instagram, TikTok, and LinkedIn simultaneously.' },
  { icon: Award,    title: 'Verified Certificates',   desc: 'QR-verified certificates with employer verification portal and direct LinkedIn sharing.' },
  { icon: Users,    title: 'Expert Mentorship',       desc: 'Book 1-on-1 sessions with industry professionals for career guidance and project reviews.' },
];

function AnimatedCounter({ target }) {
  const [count, setCount] = useState(0);
  const num = parseInt(target.replace(/\D/g, ''));
  const suffix = target.replace(/[\d,]/g, '');

  useEffect(() => {
    let start = 0;
    const step = num / 60;
    const timer = setInterval(() => {
      start += step;
      if (start >= num) { setCount(num); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 25);
    return () => clearInterval(timer);
  }, [num]);

  return <>{count.toLocaleString()}{suffix}</>;
}

export default function HomePage() {
  const [featuredCourses, setFeaturedCourses] = useState([]);
  const [upcomingClasses, setUpcomingClasses] = useState([]);

  useEffect(() => {
    api.get('/courses?sort=popular&limit=4&published=true').then(r => setFeaturedCourses(r.data.data || [])).catch(() => {});
    api.get('/live?status=scheduled&limit=3').then(r => setUpcomingClasses(r.data.data || [])).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen">
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center overflow-hidden bg-grid-pattern">
        {/* Orbs */}
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-brand-500/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-accent/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="badge bg-brand-500/20 text-brand-300 border border-brand-500/30 mb-6 inline-flex">
              <Zap size={12} className="mr-1" /> Live Learning Platform
            </span>

            <h1 className="text-5xl md:text-7xl font-black text-white leading-tight mb-6">
              Master Technology Skills{' '}
              <span className="gradient-text">Through Live Learning</span>
            </h1>

            <p className="text-xl md:text-2xl text-white/60 max-w-3xl mx-auto mb-10">
              Learn Web Development, AI, Cybersecurity, Data Science, Cloud Computing and more from industry professionals through live classes, projects, and expert mentorship.
            </p>

            <div className="flex flex-wrap gap-4 justify-center mb-16">
              <Link to="/courses" className="btn-primary text-lg px-8 py-4 flex items-center gap-2">
                Start Learning <ChevronRight size={20} />
              </Link>
              <Link to="/live" className="btn-secondary text-lg px-8 py-4 flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full live-indicator" />
                Join Live Class
              </Link>
              <Link to="/register?role=instructor" className="btn-ghost text-lg px-8 py-4">
                Become an Instructor
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
              {STATS.map((stat) => (
                <div key={stat.label} className="card text-center">
                  <div className="text-3xl font-black gradient-text">
                    <AnimatedCounter target={stat.value} />
                  </div>
                  <div className="text-white/50 text-sm mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Schools ──────────────────────────────────────── */}
      <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
          <h2 className="section-title text-center mb-4">Technology Schools</h2>
          <p className="section-sub text-center mx-auto mb-14">Choose your learning path from our specialized schools, each designed with industry-relevant curriculum.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {SCHOOLS.map((school, i) => (
            <motion.div key={school.slug} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
              <Link to={`/schools/${school.slug}`} className="card-hover group block">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl" style={{ backgroundColor: `${school.color}20` }}>
                    <school.icon size={28} style={{ color: school.color }} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-white text-lg group-hover:text-brand-300 transition-colors">{school.name}</h3>
                    <p className="text-white/50 text-sm mt-1 mb-3">{school.desc}</p>
                    <span className="badge bg-white/5 text-white/60 border border-white/10">
                      <BookOpen size={10} /> {school.courses} courses
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────── */}
      <section className="py-24 bg-surface-50/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="section-title text-center mb-4">Everything You Need to Succeed</h2>
          <p className="section-sub text-center mx-auto mb-14">One platform for learning, practising, connecting with experts, and launching your tech career.</p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <motion.div key={f.title} className="card group" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                <div className="p-3 bg-brand-500/10 rounded-xl w-fit mb-4 group-hover:bg-brand-500/20 transition-colors">
                  <f.icon size={24} className="text-brand-400" />
                </div>
                <h3 className="font-bold text-white text-lg mb-2">{f.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Upcoming Live Classes ─────────────────────────── */}
      {upcomingClasses.length > 0 && (
        <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="section-title">Upcoming Live Classes</h2>
              <p className="text-white/50 mt-2">Join expert-led sessions happening soon</p>
            </div>
            <Link to="/live" className="btn-ghost flex items-center gap-1">View all <ChevronRight size={16} /></Link>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {upcomingClasses.map(session => (
              <div key={session.id} className="card-hover">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full live-indicator" />
                  <span className="text-red-400 text-xs font-semibold uppercase tracking-wider">Scheduled</span>
                </div>
                <h3 className="font-bold text-white mb-2">{session.title}</h3>
                <p className="text-white/50 text-sm mb-4">{new Date(session.scheduled_at).toLocaleString()}</p>
                <div className="flex items-center gap-2">
                  {session.avatar_url && <img src={session.avatar_url} alt="" className="w-7 h-7 rounded-full" />}
                  <span className="text-white/70 text-sm">{session.first_name} {session.last_name}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Featured Courses ──────────────────────────────── */}
      {featuredCourses.length > 0 && (
        <section className="py-24 bg-surface-50/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-10">
              <h2 className="section-title">Featured Courses</h2>
              <Link to="/courses" className="btn-ghost flex items-center gap-1">All courses <ChevronRight size={16} /></Link>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredCourses.map(course => (
                <Link key={course.id} to={`/courses/${course.slug}`} className="card-hover group">
                  {course.thumbnail_url && (
                    <img src={course.thumbnail_url} alt={course.title} className="w-full h-40 object-cover rounded-xl mb-4" />
                  )}
                  <span className="badge mb-2" style={{ backgroundColor: `${course.school_color}20`, color: course.school_color }}>
                    {course.school_name}
                  </span>
                  <h3 className="font-semibold text-white mb-2 group-hover:text-brand-300 transition-colors line-clamp-2">{course.title}</h3>
                  <div className="flex items-center gap-2 text-white/40 text-xs">
                    <Star size={12} className="text-yellow-400 fill-yellow-400" />
                    <span className="text-yellow-400">{course.avg_rating}</span>
                    <span>({course.total_reviews})</span>
                    <span>·</span>
                    <Users size={12} /><span>{course.total_students?.toLocaleString()}</span>
                  </div>
                  <div className="mt-3 font-bold text-white">
                    {course.is_free ? <span className="text-green-400">Free</span> : `$${course.price}`}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA ──────────────────────────────────────────── */}
      <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="card max-w-3xl mx-auto relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-500/10 to-accent/10" />
          <div className="relative">
            <h2 className="text-4xl font-black text-white mb-4">Ready to Start Your Tech Journey?</h2>
            <p className="text-white/60 mb-8 text-lg">Join 50,000+ learners building real skills for real careers.</p>
            <div className="flex gap-4 justify-center">
              <Link to="/register" className="btn-primary text-lg px-10 py-4">Get Started Free</Link>
              <Link to="/courses" className="btn-secondary text-lg px-10 py-4">Browse Courses</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
