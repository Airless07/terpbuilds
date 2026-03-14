import { getProjects, saveProjects, getUsers, saveUsers } from './storage';

export const initializeSampleData = () => {
  // Initialize empty collections if they don't exist yet — no sample data
  if (!localStorage.getItem('tb_projects')) saveProjects([]);
  if (!localStorage.getItem('tb_users')) saveUsers([]);

  // Clear old sample data from previous versions
  if (localStorage.getItem('tb_initialized')) {
    localStorage.removeItem('tb_initialized');
    saveProjects([]);
    saveUsers([]);
    localStorage.removeItem('currentUser');
  }
};
