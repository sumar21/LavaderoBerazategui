
export interface LoginResponse {
  token: string;
  user?: {
    id: string;
    email: string;
    name: string;
    dni: string;
    legajo: string;
    usuarioApp: string;
    perfil: string;
  };
}

export const authService = {
  async login(usuarioApp: string, password: string): Promise<LoginResponse> {
    try {
      // Intentar con /api/login
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ usuarioApp, password }),
      });

      if (!response.ok) {
        // HTTP/2 carries no reason phrase, so `statusText` is always empty in
        // production. And when the serverless function itself crashes, the body
        // is the platform's HTML error page, not our JSON — so `.json()` throws
        // and the old fallback rendered a bare "Error 500:" with no cause.
        // Read the body once as text, then try to parse it.
        const body = await response.text().catch(() => '');
        let parsed: any = null;
        try { parsed = JSON.parse(body); } catch { /* not our API: HTML or empty */ }
        console.error('API Error Response:', response.status, parsed ?? body);
        // A 5xx is never the user's password. Saying so stops them retyping it.
        throw new Error(
          parsed?.message || parsed?.error || (response.status >= 500
            ? `El servicio no está disponible (${response.status}). Reintentá en unos minutos.`
            : `No se pudo iniciar sesión (${response.status}).`)
        );
      }

      const data = await response.json();
      console.log('Login response data:', data);
      
      if (data.token) {
        sessionStorage.setItem('auth_token', data.token);
        sessionStorage.setItem('login_timestamp', Date.now().toString());
        if (data.user) {
          console.log('Saving user data:', data.user);
          sessionStorage.setItem('user_data', JSON.stringify(data.user));
        } else {
          console.warn('User data missing in login response');
        }
      }
      
      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  async recoverPassword(email: string): Promise<boolean> {
    const response = await fetch('/api/auth/send-credentials', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            correo: email
        })
    });

    if (!response.ok) {
        // Same reason as in login(): statusText is empty over HTTP/2.
        throw new Error(`No se pudo enviar el correo de recuperación (${response.status}).`);
    }

    return true;
  }
};
