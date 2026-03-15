import { useState, useEffect, useCallback } from 'react';
import { supabase } from './firebase';
import { fetchUser, logoutUser, mapProject, mapUser } from './utils/storage';
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

// Group flat message rows into per-conversation summaries
const groupMessages = (msgs, uid) => {
  const map = {};
  for (const m of msgs) {
    const k = m.conversation_key;
    if (!map[k]) map[k] = {
      conversation_key: k,
      other_user_id: m.sender_id === uid ? m.receiver_id : m.sender_id,
      messages: [],
      unread_count: 0,
    };
    map[k].messages.push(m);
    if (!m.read && m.sender_id !== uid) map[k].unread_count++;
  }
  return Object.values(map);
};

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
  const [pendingFriendReqs, setPendingFriendReqs] = useState(0);

  const [panelProject, setPanelProject] = useState(null);
  const [fullProject, setFullProject] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);

  // ── Session restore ────────────────────────────────────────────────────────
  useEffect(() => {
    const uid = localStorage.getItem('tb_uid');
    if (uid) {
      fetchUser(uid).then(userData => {
        if (userData) setCurrentUser(userData);
        setAuthLoading(false);
      });
    } else {
      setAuthLoading(false);
    }
  }, []);

  // ── Global subscriptions: projects + users ─────────────────────────────────
  useEffect(() => {
    // Initial fetch
    supabase.from('projects').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setProjects(data.map(mapProject)); });
    supabase.from('users').select('*')
      .then(({ data }) => { if (data) setUsers(data.map(mapUser)); });

    // Projects: update state directly from payload — no extra fetch
    const projSub = supabase.channel('projects-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'projects' }, (payload) => {
        setProjects(prev => [mapProject(payload.new), ...prev]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'projects' }, (payload) => {
        setProjects(prev => prev.map(p => p.id === payload.new.id ? mapProject(payload.new) : p));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'projects' }, (payload) => {
        setProjects(prev => prev.filter(p => p.id !== payload.old.id));
      })
      .subscribe();

    // Users: update state directly from payload
    const usersSub = supabase.channel('users-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'users' }, (payload) => {
        setUsers(prev => [...prev, mapUser(payload.new)]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users' }, (payload) => {
        setUsers(prev => prev.map(u => u.id === payload.new.id ? mapUser(payload.new) : u));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'users' }, (payload) => {
        setUsers(prev => prev.filter(u => u.id !== payload.old.id));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(projSub);
      supabase.removeChannel(usersSub);
    };
  }, []);

  // ── Per-user subscriptions ─────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser?.id) {
      setNotifications([]);
      setDms([]);
      setUnreadMsgs(0);
      setPendingFriendReqs(0);
      return;
    }
    const uid = currentUser.id;

    const countPending = (rows) =>
      (rows || []).filter(f => f.friend_id === uid && f.status === 'pending').length;

    // Initial fetch for user-specific data
    supabase.from('notifications').select('items').eq('user_id', uid).single()
      .then(({ data }) => setNotifications(data?.items || []));
    supabase.from('messages').select('*')
      .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data) {
          const grouped = groupMessages(data, uid);
          setDms(grouped);
          setUnreadMsgs(grouped.reduce((acc, d) => acc + d.unread_count, 0));
        }
      });
    supabase.from('friendships').select('*')
      .or(`user_id.eq.${uid},friend_id.eq.${uid}`)
      .then(({ data }) => setPendingFriendReqs(countPending(data)));

    // Current user profile updates
    const profileSub = supabase.channel(`profile-${uid}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${uid}` }, (payload) => {
        setCurrentUser(mapUser(payload.new));
      })
      .subscribe();

    // Notifications: payload.new contains the full updated row with items array
    const notifSub = supabase.channel(`notifs-${uid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${uid}` }, (payload) => {
        setNotifications(payload.new?.items || []);
      })
      .subscribe();

    // DMs conversation list: re-fetch on any message change (grouping logic makes
    // incremental updates complex; the active chat uses its own per-convo subscription)
    const dmsSub = supabase.channel(`dms-${uid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, async () => {
        const { data } = await supabase.from('messages').select('*')
          .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`)
          .order('created_at', { ascending: true });
        if (data) {
          const grouped = groupMessages(data, uid);
          setDms(grouped);
          setUnreadMsgs(grouped.reduce((acc, d) => acc + d.unread_count, 0));
        }
      })
      .subscribe();

    // Friendships: update pending count from payload without re-fetching
    const friendshipsSub = supabase.channel(`friendships-app-${uid}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'friendships' }, (payload) => {
        if (payload.new.friend_id === uid && payload.new.status === 'pending') {
          setPendingFriendReqs(prev => prev + 1);
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'friendships' }, (payload) => {
        const f = payload.new;
        if (f.friend_id !== uid) return;
        // If a pending request was accepted/denied, decrement
        if (payload.old.status === 'pending' && f.status !== 'pending') {
          setPendingFriendReqs(prev => Math.max(0, prev - 1));
        }
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'friendships' }, (payload) => {
        if (payload.old.friend_id === uid && payload.old.status === 'pending') {
          setPendingFriendReqs(prev => Math.max(0, prev - 1));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(profileSub);
      supabase.removeChannel(notifSub);
      supabase.removeChannel(dmsSub);
      supabase.removeChannel(friendshipsSub);
    };
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
    if (PROTECTED.includes(page) && !currentUser) { setCurrentPage('login'); return; }
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

  const refreshData = useCallback(() => {}, []);

  const sharedProps = {
    darkMode, setDarkMode,
    currentPage, navigate,
    currentUser, setCurrentUser,
    projects, users,
    notifications, dms, unreadMsgs, pendingFriendReqs,
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
      <Navbar {...sharedProps} showNotifications={showNotifications} setShowNotifications={setShowNotifications} />

      {showNotifications && (
        <NotificationDropdown {...sharedProps} onClose={() => setShowNotifications(false)} />
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
