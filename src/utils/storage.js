import { supabase } from '../firebase';

// ── Sync utilities ───────────────────────────────────────────────────────────
export const dmKey = (a, b) => [a, b].sort().join('_');
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

// ── Users: column mapping ─────────────────────────────────────────────────────
// Valid users table columns: id, display_name, email, password, skills,
// github_url, linkedin_url, site_url, trust_score, created_at
const VALID_USER_COLUMNS = new Set([
  'display_name', 'email', 'password', 'skills',
  'github_url', 'linkedin_url', 'site_url', 'trust_score',
]);

export const mapUser = (row) => {
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
    // not in DB — kept in memory only
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
    if (VALID_USER_COLUMNS.has(dbKey)) result[dbKey] = value;
  }
  return result;
};

// ── Projects: column mapping ──────────────────────────────────────────────────
// Valid projects table columns: id, title, description, tags, status,
// team_size, spots_remaining, timeline, contact, owner_id, owner_name,
// bookmark_count, application_count, created_at
const VALID_PROJECT_COLUMNS = new Set([
  'title', 'description', 'tags', 'status', 'team_size', 'spots_remaining',
  'timeline', 'contact', 'owner_id', 'owner_name', 'bookmark_count', 'application_count',
]);

export const mapProject = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title || '',
    description: row.description || '',
    tags: row.tags || [],
    status: row.status || 'Recruiting',
    teamSize: row.team_size || 3,
    spotsRemaining: row.spots_remaining ?? 0,
    timeline: row.timeline || '',
    contact: row.contact || '',
    ownerId: row.owner_id,
    ownerName: row.owner_name || '',
    bookmarks: row.bookmark_count || 0,
    applicationCount: row.application_count || 0,
    createdAt: row.created_at,
    // fields not in DB — in-memory defaults so UI doesn't crash
    skills: [],
    applicants: [],
    membersAccepted: [row.owner_id].filter(Boolean),
    comments: [],
    announcements: [],
    updates: [],
    roomMessages: [],
    availability: { dateRange: null, slots: {} },
    fileLinks: [],
  };
};

const mapProjectUpdate = (data) => {
  const colMap = {
    title: 'title',
    description: 'description',
    tags: 'tags',
    status: 'status',
    teamSize: 'team_size',
    spotsRemaining: 'spots_remaining',
    timeline: 'timeline',
    contact: 'contact',
    ownerId: 'owner_id',
    ownerName: 'owner_name',
    bookmarks: 'bookmark_count',
    bookmarkCount: 'bookmark_count',
    applicationCount: 'application_count',
  };
  const result = {};
  for (const [key, value] of Object.entries(data)) {
    if (key === 'id' || key === 'createdAt' || key === 'created_at') continue;
    const dbKey = colMap[key] || key;
    if (VALID_PROJECT_COLUMNS.has(dbKey)) result[dbKey] = value;
  }
  return result;
};

// ── Auth (direct table operations — no Supabase Auth) ────────────────────────
export const signUpUser = async (email, password, profileData) => {
  const row = {
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
  if (error) { console.error('signUpUser error:', error); throw error; }
  localStorage.setItem('tb_uid', data.id);
  return mapUser(data);
};

export const loginUser = async (email, password) => {
  const { data, error } = await supabase
    .from('users').select('*').eq('email', email).eq('password', password).single();
  if (error || !data) { console.error('loginUser error:', error); throw new Error('Invalid login credentials'); }
  localStorage.setItem('tb_uid', data.id);
  return mapUser(data);
};

export const logoutUser = async () => { localStorage.removeItem('tb_uid'); };

// ── Projects ──────────────────────────────────────────────────────────────────
export const addProject = async (data) => {
  const teamSize = parseInt(data.teamSize || data.team_size) || 3;
  const row = {
    title: data.title,
    description: data.description,
    tags: data.tags || [],
    status: data.status || 'Recruiting',
    team_size: teamSize,
    spots_remaining: teamSize - 1,
    timeline: data.timeline || '',
    contact: data.contact || '',
    owner_id: data.ownerId || data.owner_id,
    owner_name: data.ownerName || data.owner_name,
    bookmark_count: 0,
    application_count: 0,
  };
  const { data: proj, error } = await supabase.from('projects').insert(row).select().single();
  if (error) { console.error('addProject error:', error); throw error; }
  return proj.id;
};

export const updateProject = async (projectId, data) => {
  const mapped = mapProjectUpdate(data);
  if (Object.keys(mapped).length === 0) return;
  const { error } = await supabase.from('projects').update(mapped).eq('id', projectId);
  if (error) console.error('updateProject error:', error);
};

export const deleteProject = async (projectId) => {
  await supabase.from('projects').delete().eq('id', projectId);
};

// ── Users ─────────────────────────────────────────────────────────────────────
export const updateUser = async (userId, data) => {
  const mapped = mapUserUpdate(data);
  if (Object.keys(mapped).length === 0) return;
  const { error } = await supabase.from('users').update(mapped).eq('id', userId);
  if (error) console.error('updateUser error:', error);
};

export const fetchUser = async (userId) => {
  const { data, error } = await supabase.from('users').select('*').eq('id', userId).single();
  if (error) console.error('fetchUser error:', error);
  return mapUser(data);
};

// ── Notifications ──────────────────────────────────────────────────────────────
export const addNotification = async (userId, notif) => {
  if (!userId) { console.error('addNotification: missing userId'); return; }
  const item = { ...notif, id: generateId(), read: false, timestamp: new Date().toISOString() };
  const { data: existing, error: fetchErr } = await supabase.from('notifications')
    .select('items').eq('user_id', userId).single();
  if (fetchErr && fetchErr.code !== 'PGRST116') console.error('addNotification fetch error:', fetchErr);
  const items = [...(existing?.items || []), item];
  const { error: upsertErr } = await supabase.from('notifications')
    .upsert({ user_id: userId, items }, { onConflict: 'user_id' });
  if (upsertErr) console.error('addNotification upsert error:', upsertErr);
};

export const markNotifRead = async (userId, notifId, allItems) => {
  const updated = allItems.map(n => n.id === notifId ? { ...n, read: true } : n);
  await supabase.from('notifications').upsert({ user_id: userId, items: updated }, { onConflict: 'user_id' });
};

export const markAllNotifsRead = async (userId, allItems) => {
  const updated = allItems.map(n => ({ ...n, read: true }));
  await supabase.from('notifications').upsert({ user_id: userId, items: updated }, { onConflict: 'user_id' });
};

// ── Messages (one row per message) ───────────────────────────────────────────
// Table columns: id (auto uuid), conversation_key, sender_id, receiver_id, content, read, created_at

export const sendDM = async (conversationKey, senderId, receiverId, content) => {
  const { error } = await supabase.from('messages').insert({
    conversation_key: conversationKey,
    sender_id: senderId,
    receiver_id: receiverId,
    content,
    read: false,
  });
  if (error) console.error('sendDM error:', error);
};

export const markDMsRead = async (conversationKey, currentUserId) => {
  await supabase.from('messages')
    .update({ read: true })
    .eq('conversation_key', conversationKey)
    .eq('receiver_id', currentUserId)
    .eq('read', false);
};

// Subscribes to all messages where the user is sender or receiver.
// Groups into per-conversation summaries.
export const subscribeToDMs = (userId, callback) => {
  const fetch = async () => {
    const { data } = await supabase.from('messages').select('*')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: true });

    if (!data) { callback([]); return; }

    const convos = {};
    for (const msg of data) {
      const key = msg.conversation_key;
      if (!convos[key]) {
        convos[key] = {
          conversation_key: key,
          other_user_id: msg.sender_id === userId ? msg.receiver_id : msg.sender_id,
          messages: [],
          unread_count: 0,
        };
      }
      convos[key].messages.push(msg);
      if (!msg.read && msg.sender_id !== userId) convos[key].unread_count++;
    }
    callback(Object.values(convos));
  };

  fetch();
  const channel = supabase.channel(`dms-${userId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, fetch)
    .subscribe();
  return () => supabase.removeChannel(channel);
};

// Per-conversation realtime subscription (used inside Messages.jsx for the active chat)
export const subscribeToConversation = (conversationKey, callback) => {
  const fetch = async () => {
    const { data } = await supabase.from('messages').select('*')
      .eq('conversation_key', conversationKey)
      .order('created_at', { ascending: true });
    callback(data || []);
  };

  fetch();
  const channel = supabase.channel(`convo-${conversationKey}`)
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'messages',
      filter: `conversation_key=eq.${conversationKey}`,
    }, fetch)
    .subscribe();
  return () => supabase.removeChannel(channel);
};

// ── Applications ──────────────────────────────────────────────────────────────
// Table columns: id (uuid auto), project_id, applicant_id, applicant_name, message, status, created_at

export const applyToProject = async (projectId, applicantId, applicantName, message) => {
  const { data: existing } = await supabase.from('applications')
    .select('id').eq('project_id', projectId).eq('applicant_id', applicantId).maybeSingle();
  if (existing) { console.log('applyToProject: already applied'); return; }

  const { error } = await supabase.from('applications').insert({
    project_id: projectId,
    applicant_id: applicantId,
    applicant_name: applicantName,
    message: message || '',
    status: 'pending',
  });
  if (error) { console.error('applyToProject error:', error); throw error; }

  const { data: proj } = await supabase.from('projects').select('application_count').eq('id', projectId).single();
  if (proj) await supabase.from('projects').update({ application_count: (proj.application_count || 0) + 1 }).eq('id', projectId);
};

export const checkApplication = async (projectId, applicantId) => {
  const { data } = await supabase.from('applications')
    .select('id, status').eq('project_id', projectId).eq('applicant_id', applicantId).maybeSingle();
  return data;
};

// Fetch all pending applications for projects owned by ownerId via join
export const fetchApplicationsForOwner = async (ownerId) => {
  const { data, error } = await supabase.from('applications')
    .select('*, projects(title, owner_id)')
    .eq('status', 'pending');
  if (error) { console.error('fetchApplicationsForOwner error:', error); return []; }
  return (data || []).filter(a => a.projects?.owner_id === ownerId);
};

export const updateApplication = async (applicationId, status) => {
  const { error } = await supabase.from('applications').update({ status }).eq('id', applicationId);
  if (error) console.error('updateApplication error:', error);
};

// ── Messages: edit and soft-delete ────────────────────────────────────────────
export const editMessage = async (messageId, content) => {
  const { error } = await supabase.from('messages')
    .update({ content, edited: true })
    .eq('id', messageId);
  if (error) console.error('editMessage error:', error);
};

export const deleteMessage = async (messageId) => {
  const { error } = await supabase.from('messages')
    .update({ content: '[deleted]', deleted: true })
    .eq('id', messageId);
  if (error) console.error('deleteMessage error:', error);
};

// ── Friendships ────────────────────────────────────────────────────────────────
export const sendFriendRequest = async (senderId, receiverId) => {
  // Prevent duplicates
  const { data: existing } = await supabase.from('friendships').select('id')
    .or(`and(user_id.eq.${senderId},friend_id.eq.${receiverId}),and(user_id.eq.${receiverId},friend_id.eq.${senderId})`)
    .maybeSingle();
  if (existing) return;

  const { error } = await supabase.from('friendships').insert({ user_id: senderId, friend_id: receiverId, status: 'pending' });
  if (error) { console.error('sendFriendRequest error:', error); throw error; }
};

export const acceptFriendRequest = async (senderId, receiverId) => {
  const { error } = await supabase.from('friendships')
    .update({ status: 'accepted' }).eq('user_id', senderId).eq('friend_id', receiverId);
  if (error) console.error('acceptFriendRequest error:', error);
};

export const declineFriendRequest = async (senderId, receiverId) => {
  const { error } = await supabase.from('friendships')
    .delete().eq('user_id', senderId).eq('friend_id', receiverId);
  if (error) console.error('declineFriendRequest error:', error);
};

export const removeFriendship = async (userA, userB) => {
  await supabase.from('friendships').delete()
    .or(`and(user_id.eq.${userA},friend_id.eq.${userB}),and(user_id.eq.${userB},friend_id.eq.${userA})`);
};

// Realtime subscription on friendships for a user (both directions)
export const subscribeToFriendships = (userId, callback) => {
  const fetch = async () => {
    const { data } = await supabase.from('friendships').select('*')
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`);
    callback(data || []);
  };

  fetch();
  const channel = supabase.channel(`friendships-${userId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, fetch)
    .subscribe();
  return () => supabase.removeChannel(channel);
};

// ── Real-time subscriptions ────────────────────────────────────────────────────
export const subscribeToProjects = (callback) => {
  const fetch = () => supabase.from('projects').select('*')
    .order('created_at', { ascending: false })
    .then(({ data }) => { if (data) callback(data.map(mapProject)); });

  fetch();
  const channel = supabase.channel('projects-all')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, fetch)
    .subscribe();
  return () => supabase.removeChannel(channel);
};

export const subscribeToUsers = (callback) => {
  const fetch = () => supabase.from('users').select('*')
    .then(({ data }) => { if (data) callback(data.map(mapUser)); });

  fetch();
  const channel = supabase.channel('users-all')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, fetch)
    .subscribe();
  return () => supabase.removeChannel(channel);
};

export const subscribeToCurrentUser = (userId, callback) => {
  const fetch = () => supabase.from('users').select('*').eq('id', userId).single()
    .then(({ data }) => { if (data) callback(mapUser(data)); });

  fetch();
  const channel = supabase.channel(`user-${userId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'users', filter: `id=eq.${userId}` }, fetch)
    .subscribe();
  return () => supabase.removeChannel(channel);
};

export const subscribeToNotifications = (userId, callback) => {
  const fetch = () => supabase.from('notifications').select('items').eq('user_id', userId).single()
    .then(({ data }) => { callback(data?.items || []); });

  fetch();
  const channel = supabase.channel(`notifs-${userId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, fetch)
    .subscribe();
  return () => supabase.removeChannel(channel);
};
