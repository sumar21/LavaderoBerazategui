import { useEffect, useState } from 'react';

export interface UserProfile {
  name: string;
  role: string;
  initials: string;
}

const FALLBACK: UserProfile = { name: 'Usuario', role: 'Usuario', initials: 'US' };

/** "Facundo Rombola" → "FR", "frombola" → "FR". */
const initialsOf = (name: string) => {
  const parts = name.trim().split(/[\s._-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase() || FALLBACK.initials;
};

/**
 * Reads the signed-in user for the sidebar.
 *
 * The session lives in sessionStorage — App.tsx actively clears the localStorage
 * copies as legacy cleanup, so reading from there always fell back to "Usuario".
 */
export const useUserProfile = (): UserProfile => {
  const [profile, setProfile] = useState<UserProfile>(FALLBACK);

  useEffect(() => {
    const raw = sessionStorage.getItem('user_data');
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      const name = data.name || data.usuarioApp || data.email || FALLBACK.name;
      setProfile({
        name,
        role: data.perfil || data.role || FALLBACK.role,
        initials: initialsOf(name),
      });
    } catch (e) {
      console.error('Error parsing user data', e);
    }
  }, []);

  return profile;
};
