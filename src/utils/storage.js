import { supabase } from '../firebase';

// ── Sync utilities ───────────────────────────────────────────────────────────
export const dmKey = (a, b) => [a, b].sort().join('::');
export const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 5);

export const timeAgo = (isoString) => {
  if (!isoString) return '';
  const diff = Math.floor((Date.now() - new Date(isoString)) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return `${Math.floor(diff / 604800)}w ago`;
};

// ── Column mapping (DB snake_case ↔ app camelCase) ────────────────────────
// Valid users table columns: id, display_name, email, password, skills,
// github_url, linkedin_url, site_url, trust_score, created_at
const VALID_USER_COLUMNS = new Set([
  'display_name', 'email', 'password', 'skills',
  'github_url', 'linkedin_url', 'site_url', 'trust_score',
]);

const mapUser = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    displayName: row.display_name,
    email: row.email,
    skills: row.skills || [],
    github: row.github_url || '',
    linkedin: row.linkedin_url || '',
    website: row.site_url || '',
    trustScore: row.trust_score || 0,
    // fields not stored in DB — kept in memory only
    ratings: [],
    friends: [],
    friendRequests: { sent: [], received: [] },
    following: [],
    followers: [],
    savedProjects: [],
    createdAt: row.created_at,
  };
};

const mapUserUpdate = (data) => {
  const colMap = {
    displayName: 'display_name',
    github: 'github_url',
    linkedin: 'linkedin_url',
    website: 'site_url',
    trustScore: 'trust_score',
  };
  const result = {};
  for (const [key, value] of Object.entries(data)) {
    if (key === 'id') continue;
    const dbKey = colMap[key] || key;
    // only send columns that actually exist in the users table
    if (VALID_USER_COLUMNS.has(dbKey)) {
      result[dbKey] = value;
    }
  }
  return result;
};

// ── Auth (direct table operations — no Supabase Auth) ────────────────────
export const signUpUser = async (email, password, profileData) => {
  const uid = generateId();
  const row = {
    id: uid,
    display_name: profileData.displayName,
    email,
    password,
    skills: profileData.skills || [],
    github_url: profileData.github || '',
    linkedin_url: profileData.linkedin || '',
    site_url: profileData.website || '',
    trust_score: 0,
  };

  const insertPromise = supabase.from('users').insert(row).select().single();
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Request timed out. Please check your connection and try again.')), 10000)
  );

  const { data, error } = await Promise.race([insertPromise, timeoutPromise]);
  if (error) {
    console.error('signUpUser error:', error);
    throw error;
  }
  localStorage.setItem('tb_uid', uid);
  return mapUser(data);
};

export const loginUser = async (email, password) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .eq('password', password)
    .single();
  if (error || !data) {
    console.error('loginUser error:', error);
    throw new Error('Invalid login credentials');
  }
  localStorage.setItem('tb_uid', data.id);
  return mapUser(data);
};

export const logoutUser = async () => {
  localStorage.removeItem('tb_uid');
};

// ── Projects ─────────────────────────────────────────────────────────────────
export const addProject = async (data) => {
  const { id, ...clean } = data;
  const { data: proj, error } = await supabase.from('projects').insert(clean).select().single();
  if (error) {
    console.error('addProject error:', error);
    throw error;
  }
  return proj.id;
};

export const updateProject = async (projectId, data) => {
  const { id, ...clean } = data;
  const { error } = await supabase.from('projects').update(clean).eq('id', projectId);
  if (error) console.error('updateProject error:', error);
};

export const deleteProject = async (projectId) => {
  await supabase.from('projects').delete().eq('id', projectId);
};

// ── Users ────────────────────────────────────────────────────────────────────
export const updateUser = async (userId, data) => {
  const mapped = mapUserUpdate(data);
  const { error } = await supabase.from('users').update(mapped).eq('id', userId);
  if (error) console.error('updateUser error:', error);
};

export const fetchUser = async (userId) => {
  const { data, error } = await supabase.from('users').select('*').eq('id', userId).single();
  if (error) console.error('fetchUser error:', error);
  return mapUser(data);
};

// ── Notifications ─────────────────────────────────────────────────────────────
export const addNotification = async (userId, notif) => {
  const item = { ...notif, id: generateId(), read: false, timestamp: new Date().toISOString() };
  const { data: existing } = await supabase.from('notifications').select('items').eq('user_id', userId).single();
  const items = [...(existing?.items || []), item];
  await supabase.from('notifications').upsert({ user_id: userId, items }, { onConflict: 'user_id' });
};

export const markNotifRead = async (userId, notifId, allItems) => {
  const updated = allItems.map(n => n.id === notifId ? { ...n, read: true } : n);
  await supabase.from('notifications').upsert({ user_id: userId, items: updated }, { onConflict: 'user_id' });
};

export const markAllNotifsRead = async (userId, allItems) => {
  const updated = allItems.map(n => ({ ...n, read: true }));
  await supabase.from('notifications').upsert({ user_id: userId, items: updated }, { onConflict: 'user_id' });
};

// ── DMs ───────────────────────────────────────────────────────────────────────
export const sendDM = async (convoKey, participants, message) => {
  const { data: existing } = await supabase.from('messages').select('messages').eq('id', convoKey).single();
  const msgs = [...(existing?.messages || []), message];
  await supabase.from('messages').upsert({
    id: convoKey,
    participants,
    messages: msgs,
    updatedAt: new Date().toISOString(),
  }, { onConflict: 'id' });
};

export const markDMsRead = async (convoKey, currentUserId, messages) => {
  const updated = messages.map(m =>
    m.senderId !== currentUserId ? { ...m, read: true } : m
  );
  await supabase.from('messages').update({ messages: updated }).eq('id', convoKey);
};

// ── Real-time subscriptions ───────────────────────────────────────────────────
export const subscribeToProjects = (callback) => {
  const fetch = () => supabase.from('projects').select('*').then(({ data }) => { if (data) callback(data); });
  fetch();
  const channel = supabase.channel('projects-all')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, fetch)
    .subscribe();
  return () => supabase.removeChannel(channel);
};

export const subscribeToUsers = (callback) => {
  const fetch = () => supabase.from('users').select('*').then(({ data }) => {
    if (data) callback(data.map(mapUser));
  });
  fetch();
  const channel = supabase.channel('users-all')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, fetch)
    .subscribe();
  return () => supabase.removeChannel(channel);
};

export const subscribeToCurrentUser = (userId, callback) => {
  const fetch = () => supabase.from('users').select('*').eq('id', userId).single().then(({ data }) => {
    if (data) callback(mapUser(data));
  });
  fetch();
  const channel = supabase.channel(`user-${userId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'users', filter: `id=eq.${userId}` }, fetch)
    .subscribe();
  return () => supabase.removeChannel(channel);
};

export const subscribeToNotifications = (userId, callback) => {
  const fetch = () => supabase.from('notifications').select('items').eq('user_id', userId).single().then(({ data }) => {
    callback(data?.items || []);
  });
  fetch();
  const channel = supabase.channel(`notifs-${userId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, fetch)
    .subscribe();
  return () => supabase.removeChannel(channel);
};

export const subscribeToDMs = (userId, callback) => {
  const fetch = async () => {
    const { data } = await supabase.from('messages').select('*').contains('participants', [userId]);
    callback(data || []);
  };
  fetch();
  const channel = supabase.channel(`dms-${userId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, fetch)
    .subscribe();
  return () => supabase.removeChannel(channel);
};
