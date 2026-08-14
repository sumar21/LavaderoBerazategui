export interface SessionUser {
  name: string;
  usuarioApp: string;
  email?: string;
  perfil?: string;
}

const FALLBACK: SessionUser = { name: 'USR', usuarioApp: 'USR' };

/**
 * The signed-in user, as stored at login (services/auth.ts).
 *
 * Read from sessionStorage — App.tsx deliberately clears the localStorage
 * copies as legacy cleanup. Several call sites used to read localStorage and
 * therefore stamped every SharePoint record with the "USR" fallback instead of
 * the real user.
 */
export const getSessionUser = (): SessionUser => {
  const raw = sessionStorage.getItem('user_data');
  if (!raw) return FALLBACK;
  try {
    const data = JSON.parse(raw);
    const name = data.name || data.username || data.email || FALLBACK.name;
    return {
      name,
      usuarioApp: data.usuarioApp || name,
      email: data.email,
      perfil: data.perfil,
    };
  } catch (e) {
    console.error('Error parsing user data', e);
    return FALLBACK;
  }
};
