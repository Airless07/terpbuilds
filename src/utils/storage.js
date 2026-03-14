// ─── Storage Utilities ────────────────────────────────────────────────────────
// All app data persisted in localStorage

export const getProjects = () => JSON.parse(localStorage.getItem('tb_projects') || '[]');
export const saveProjects = (p) => localStorage.setItem('tb_projects', JSON.stringify(p));

export const getUsers = () => JSON.parse(localStorage.getItem('tb_users') || '[]');
export const saveUsers = (u) => localStorage.setItem('tb_users', JSON.stringify(u));

export const getCurrentUser = () => {
  const s = localStorage.getItem('currentUser');
  return s ? JSON.parse(s) : null;
};
export const saveCurrentUser = (u) => {
  localStorage.setItem('currentUser', JSON.stringify(u));
};

export const getDMs = () => JSON.parse(localStorage.getItem('tb_dms') || '{}');
export const saveDMs = (d) => localStorage.setItem('tb_dms', JSON.stringify(d));

export const dmKey = (a, b) => [a, b].sort().join('::');

export const getNotifications = (userId) => {
  const all = JSON.parse(localStorage.getItem('tb_notifications') || '{}');
  return all[userId] || [];
};
export const saveNotifications = (userId, notifs) => {
  const all = JSON.parse(localStorage.getItem('tb_notifications') || '{}');
  all[userId] = notifs;
  localStorage.setItem('tb_notifications', JSON.stringify(all));
};
export const addNotification = (userId, notif) => {
  const notifs = getNotifications(userId);
  notifs.unshift({ ...notif, id: Date.now() + Math.random(), read: false, timestamp: new Date().toISOString() });
  saveNotifications(userId, notifs);
};

export const updateUserInStorage = (updatedUser) => {
  const users = getUsers();
  const idx = users.findIndex(u => u.id === updatedUser.id);
  if (idx !== -1) users[idx] = updatedUser;
  else users.push(updatedUser);
  saveUsers(users);
  const curr = getCurrentUser();
  if (curr && curr.id === updatedUser.id) saveCurrentUser(updatedUser);
  return updatedUser;
};

export const updateProjectInStorage = (updatedProject) => {
  const projects = getProjects();
  const idx = projects.findIndex(p => p.id === updatedProject.id);
  if (idx !== -1) projects[idx] = updatedProject;
  else projects.push(updatedProject);
  saveProjects(projects);
  return updatedProject;
};

export const getProjectById = (id) => {
  return getProjects().find(p => p.id === id) || null;
};

export const getUserById = (id) => {
  return getUsers().find(u => u.id === id) || null;
};

export const timeAgo = (isoString) => {
  const now = new Date();
  const then = new Date(isoString);
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return `${Math.floor(diff / 604800)}w ago`;
};

export const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 5);

// Password encoding — NOTE: In production use bcrypt or Argon2. Base64 is NOT secure hashing.
export const encodePassword = (pw) => btoa(pw);
export const checkPassword = (pw, encoded) => btoa(pw) === encoded;
