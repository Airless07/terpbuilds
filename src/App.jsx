import { useState, useEffect, useCallback } from 'react';
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
import { initializeSampleData } from './utils/sampleData';
import { getProjects, getUsers, getCurrentUser } from './utils/storage';
import './index.css';

export default function App() {
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('tb_darkmode') !== 'false');
  const [currentPage, setCurrentPage] = useState('home');
  const [currentUser, setCurrentUser] = useState(null);
  const [panelProject, setPanelProject] = useState(null);
  const [fullProject, setFullProject] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    initializeSampleData();
    setProjects(getProjects());
    setUsers(getUsers());
    const u = getCurrentUser();
    if (u) setCurrentUser(u);
  }, []);

  useEffect(() => {
    localStorage.setItem('tb_darkmode', darkMode);
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const refreshData = useCallback(() => {
    setProjects(getProjects());
    setUsers(getUsers());
    const u = getCurrentUser();
    if (u) setCurrentUser(JSON.parse(localStorage.getItem('currentUser') || 'null'));
  }, []);

  const navigate = useCallback((page) => {
    const PROTECTED = ['friends', 'messages', 'post-project', 'profile'];
    const u = getCurrentUser();
    if (PROTECTED.includes(page) && !u) {
      setCurrentPage('login');
      return;
    }
    setCurrentPage(page);
    setPanelProject(null);
    setFullProject(null);
    setShowNotifications(false);
    window.scrollTo(0, 0);
  }, []);

  const openPanel = useCallback((project) => {
    const fresh = getProjects().find(p => p.id === project.id) || project;
    setPanelProject(fresh);
    setShowNotifications(false);
  }, []);

  const closePanel = useCallback(() => setPanelProject(null), []);

  const openFullPage = useCallback((project) => {
    const fresh = getProjects().find(p => p.id === project.id) || project;
    setFullProject(fresh);
    setCurrentPage('project-full');
    setPanelProject(null);
    window.scrollTo(0, 0);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('currentUser');
    setCurrentUser(null);
    setCurrentPage('home');
  }, []);

  const sharedProps = {
    darkMode, setDarkMode,
    currentPage, navigate,
    currentUser, setCurrentUser,
    projects, setProjects,
    users, setUsers,
    refreshData,
    openPanel, closePanel,
    openFullPage,
    logout,
  };

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
