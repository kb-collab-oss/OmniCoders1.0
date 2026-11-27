// Mêmes valeurs que la contrainte CHECK de utilisateur.role dans database/init.sql
export const ROLES = {
  ELEVE: 'eleve',
  PARENT: 'parent',
  ENSEIGNANT: 'enseignant',
  ADMINISTRATION: 'administration',
  SUPER_ADMIN: 'super_admin',
};

export const ROLE_LABELS = {
  eleve: 'Élève',
  parent: 'Parent',
  enseignant: 'Enseignant',
  administration: 'Administration',
  super_admin: 'Super-administrateur',
};
