import { useState, useEffect, useCallback } from 'react';
import { supabase } from './firebase';
import {
  fetchUser, logoutUser,
  subscribeToProjects, subscribeToUsers, subscribeToCurrentUser,
  subscribeToNotifications, subscribeToDMs,
} from './utils/storage';
import Navbar from './components/Navbar';
import MobileNav from './components/MobileNav';
import NotificationDropdown from './components/NotificationDropdown';
import ProjectPanel from './components/ProjectPanel';
import Home from './pages/Home';
import Projects from './pages/Projects';
import PostProject from './pages/PostProject';
import Friends from './pages/Friends';
import Messages from './pages/Messages';
import Profile from './pages/Profile';
import Feedback from './pages/Feedback';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ProjectPage from './components/ProjectPage';
import Footer from './components/Footer';
import './index.css';

export default function App() {
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('tb_darkmode') !== 'false');
  const [currentPage, setCurrentPage] = useState('home');
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [dms, setDms] = useState([]);
  const [unreadMsgs, setUnreadMsgs] = useState(0);

  const [panelProject, setPanelProject] = useState(null);
  const [fullProject, setFullProject] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);

  // ── Global subscriptions (always active) ──────────────────────────────────
  useEffect(() => {
    const unsubProjects = subscribeToProjects(setProjects);
    const unsubUsers = subscribeToUsers(setUsers);
    return () => { unsubProjects(); unsubUsers(); };
  }, []);

  // ── Supabase Auth state ───────────────────────────────────────────────────
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const userData = await fetchUser(session.user.id);
        if (userData) setCurrentUser(userData);
        else setCurrentUser(null);
      } else {
        setCurrentUser(null);
      }
      setAuthLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  // ── Per-user subscriptions (when logged in) ────────────────────────────────
  useEffect(() => {
    if (!currentUser?.id) {
      setNotifications([]);
      setDms([]);
      setUnreadMsgs(0);
      return;
    }
    const uid = currentUser.id;
    const unsubUser = subscribeToCurrentUser(uid, setCurrentUser);
    const unsubNotifs = subscribeToNotifications(uid, setNotifications);
    const unsubDMs = subscribeToDMs(uid, (dmList) => {
      setDms(dmList);
      const count = dmList.reduce((acc, convo) =>
        acc + (convo.messages || []).filter(m => !m.read && m.senderId !== uid).length, 0
      );
      setUnreadMsgs(count);
    });
    return () => { unsubUser(); unsubNotifs(); unsubDMs(); };
  }, [currentUser?.id]);

  // ── Keep panel/full-page views in sync with live project data ─────────────
  useEffect(() => {
    if (panelProject) {
      const updated = projects.find(p => p.id === panelProject.id);
      if (updated) setPanelProject(updated);
      else setPanelProject(null);
    }
    if (fullProject) {
      const updated = projects.find(p => p.id === fullProject.id);
      if (updated) setFullProject(updated);
      else { setFullProject(null); setCurrentPage('projects'); }
    }
  }, [projects]);

  useEffect(() => {
    localStorage.setItem('tb_darkmode', darkMode);
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const navigate = useCallback((page) => {
    const PROTECTED = ['friends', 'messages', 'post-project', 'profile'];
    if (PROTECTED.includes(page) && !currentUser) {
      setCurrentPage('login');
      return;
    }
    setCurrentPage(page);
    setPanelProject(null);
    setFullProject(null);
    setShowNotifications(false);
    window.scrollTo(0, 0);
  }, [currentUser]);

  const openPanel = useCallback((project) => {
    const fresh = projects.find(p => p.id === project.id) || project;
    setPanelProject(fresh);
    setShowNotifications(false);
  }, [projects]);

  const closePanel = useCallback(() => setPanelProject(null), []);

  const openFullPage = useCallback((project) => {
    const fresh = projects.find(p => p.id === project.id) || project;
    setFullProject(fresh);
    setCurrentPage('project-full');
    setPanelProject(null);
    window.scrollTo(0, 0);
  }, [projects]);

  const logout = useCallback(async () => {
    await logoutUser();
    setCurrentUser(null);
    setCurrentPage('home');
  }, []);

  // refreshData is a no-op — Supabase subscriptions keep everything live
  const refreshData = useCallback(() => {}, []);

  const sharedProps = {
    darkMode, setDarkMode,
    currentPage, navigate,
    currentUser, setCurrentUser,
    projects, users,
    notifications, dms, unreadMsgs,
    refreshData,
    openPanel, closePanel,
    openFullPage,
    logout,
  };

  if (authLoading) {
    return (
      <div className={`app ${darkMode ? 'dark' : 'light'}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🐢</div>
          <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--maize)', fontSize: '1rem' }}>Loading TerpBuilds...</div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`app ${darkMode ? 'dark' : 'light'}`}
      onClick={(e) => {
        if (showNotifications && !e.target.closest('.notif-dropdown') && !e.target.closest('.notif-btn')) {
          setShowNotifications(false);
        }
      }}
    >
      <Navbar
        {...sharedProps}
        showNotifications={showNotifications}
        setShowNotifications={setShowNotifications}
      />

      {showNotifications && (
        <NotificationDropdown
          {...sharedProps}
          onClose={() => setShowNotifications(false)}
        />
      )}

      {panelProject && (
        <ProjectPanel
          project={panelProject}
          onClose={closePanel}
          onViewFull={() => openFullPage(panelProject)}
          {...sharedProps}
        />
      )}

      <main className="main-content">
        {currentPage === 'home' && <Home {...sharedProps} />}
        {currentPage === 'projects' && <Projects {...sharedProps} />}
        {currentPage === 'post-project' && <PostProject {...sharedProps} />}
        {currentPage === 'friends' && <Friends {...sharedProps} />}
        {currentPage === 'messages' && <Messages {...sharedProps} />}
        {currentPage === 'profile' && <Profile {...sharedProps} />}
        {currentPage === 'feedback' && <Feedback {...sharedProps} />}
        {currentPage === 'login' && <Login {...sharedProps} />}
        {currentPage === 'signup' && <Signup {...sharedProps} />}
        {currentPage === 'project-full' && fullProject && (
          <ProjectPage
            project={fullProject}
            setProject={setFullProject}
            onBack={() => { setCurrentPage('projects'); setFullProject(null); }}
            {...sharedProps}
          />
        )}
      </main>

      {currentPage !== 'project-full' && <Footer navigate={navigate} />}
      <MobileNav {...sharedProps} />
    </div>
  );
}
