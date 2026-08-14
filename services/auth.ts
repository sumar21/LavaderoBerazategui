
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
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error Response:', errorData);
        const errorMessage = errorData.message || errorData.error || `Error ${response.status}: ${response.statusText}`;
        throw new Error(errorMessage);
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
        throw new Error(`Error recovering password: ${response.statusText}`);
    }

    return true;
  }
};
