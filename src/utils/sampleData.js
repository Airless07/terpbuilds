import { saveProjects, saveUsers } from './storage';

export const initializeSampleData = () => {
  // Initialize empty global collections on first ever load — never overwrite existing data
  if (!localStorage.getItem('tb_projects')) saveProjects([]);
  if (!localStorage.getItem('tb_users')) saveUsers([]);
};
