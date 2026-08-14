
import React, { useState, useEffect } from 'react';
import { User, Lock, ArrowRight, LayoutDashboard, AlertCircle, Timer } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Logo } from '../components/ui/Logo';
import { Modal } from '../components/ui/Modal';
import { authService } from '../services/auth';
import { notify } from '../components/ui/Notice';

interface LoginProps {
  onLogin: () => void;
  sessionExpired?: boolean;
}

export const Login: React.FC<LoginProps> = ({ onLogin, sessionExpired }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [usuarioApp, setUsuarioApp] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Rate Limiting State
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [remainingTime, setRemainingTime] = useState<number>(0);

  // Forgot Password State
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [isRecovering, setIsRecovering] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  // Session Expired State
  const [isSessionExpiredModalOpen, setIsSessionExpiredModalOpen] = useState(!!sessionExpired);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (lockoutUntil) {
      interval = setInterval(() => {
        const now = Date.now();
        if (now >= lockoutUntil) {
          setLockoutUntil(null);
          setFailedAttempts(0);
          setRemainingTime(0);
          setError('');
        } else {
          setRemainingTime(Math.ceil((lockoutUntil - now) / 1000));
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [lockoutUntil]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutUntil && Date.now() < lockoutUntil) return;

    setIsLoading(true);
    setError('');

    try {
      await authService.login(usuarioApp, password);
      setFailedAttempts(0);
      setLockoutUntil(null);
      onLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);
      if (newAttempts >= 5) {
        const until = Date.now() + 60 * 1000;
        setLockoutUntil(until);
        setRemainingTime(60);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecoverPassword = async () => {
    if (!forgotEmail) return;
    setIsRecovering(true);
    try {
        await authService.recoverPassword(forgotEmail);
        setIsForgotModalOpen(false);
        setIsSuccessModalOpen(true);
        setForgotEmail('');
    } catch (error) {
        console.error("Error recovering password:", error);
        notify.error("Hubo un error al procesar la solicitud.");
    } finally {
        setIsRecovering(false);
    }
  };

  return (
    <div className="w-full min-h-screen lg:grid lg:grid-cols-2 font-sans bg-white">
      
      {/* LEFT SIDE: Visual & Branding */}
      <div className="hidden lg:flex flex-col justify-between relative bg-[#0B0F19] text-white p-12 overflow-hidden min-h-screen">
        {/* Abstract Background Pattern */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
             <div className="absolute top-0 -left-1/4 w-full h-full bg-gradient-to-br from-blue-600/30 to-transparent rounded-full blur-3xl" />
             <div className="absolute bottom-0 -right-1/4 w-full h-full bg-gradient-to-tl from-indigo-600/30 to-transparent rounded-full blur-3xl" />
             <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>
        </div>

        <div className="relative z-10">
           <Logo variant="light" size="lg" showText={true} />
        </div>

        <div className="relative z-10 max-w-md my-auto">
            <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center mb-6 border border-white/10 shadow-xl">
                <LayoutDashboard className="w-6 h-6 text-blue-400" />
            </div>
            <h2 className="text-4xl font-bold tracking-tight leading-tight mb-6">
              Control total de tu planta industrial.
            </h2>
            <p className="text-slate-400 text-lg leading-relaxed">
              Gestión eficiente de stock, logística y procesos de lavado en una única plataforma unificada.
            </p>
        </div>

        <div className="relative z-10 flex items-center gap-2 text-xs text-slate-500 font-mono mt-8">
            <span>Lavadero Berazategui Manager</span>
            <span className="w-1 h-1 rounded-full bg-slate-600" />
            <span>v20251223_1.0.10</span>
        </div>
      </div>

      {/* RIGHT SIDE: Form */}
      <div className="flex items-center justify-center p-8 bg-white text-slate-900 relative min-h-screen">
        {/* Mobile background decoration */}
        <div className="lg:hidden absolute inset-0 bg-slate-50 -z-10" />

        <div className="mx-auto w-full max-w-[400px] space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
          
          <div className="flex flex-col space-y-2 text-center lg:text-left">
            {/* Mobile Logo */}
            <div className="lg:hidden mx-auto mb-6 transform scale-110">
                <Logo variant="dark" size="md" />
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Bienvenido</h1>
            <p className="text-slate-500 text-sm">
              Ingrese sus credenciales para acceder al sistema.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2 text-red-600 text-sm animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            
            {lockoutUntil && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-center gap-2 text-amber-700 text-sm animate-in fade-in slide-in-from-top-2">
                <Timer className="w-4 h-4 shrink-0 animate-pulse" />
                <span>Demasiados intentos. Intenta de nuevo en {remainingTime} segundos.</span>
              </div>
            )}

            <div className="space-y-4">
                <div className="space-y-1 relative group">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Usuario</label>
                    <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                        <Input 
                            type="text"
                            value={usuarioApp}
                            onChange={(e) => setUsuarioApp(e.target.value)}
                            placeholder="nombre.apellido" 
                            className="pl-10" 
                            required
                            disabled={!!lockoutUntil || isLoading}
                        />
                    </div>
                </div>
                
                <div className="space-y-1 relative group">
                    <div className="flex items-center justify-between ml-1">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Contraseña</label>
                        <button 
                            type="button"
                            onClick={() => setIsForgotModalOpen(true)}
                            className="text-xs font-medium text-blue-600 hover:text-blue-500 hover:underline"
                            disabled={!!lockoutUntil || isLoading}
                        >
                            ¿Olvidaste tu contraseña?
                        </button>
                    </div>
                    <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                        <Input 
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••" 
                            className="pl-10"
                            required
                            disabled={!!lockoutUntil || isLoading}
                        />
                    </div>
                </div>
            </div>

            <Button 
              type="submit" 
              className={`w-full h-11 text-white font-medium text-base shadow-lg transition-all group rounded-xl mt-4 ${!!lockoutUntil ? 'bg-slate-400 cursor-not-allowed shadow-none' : 'bg-slate-900 hover:bg-slate-800 shadow-slate-900/10 hover:shadow-slate-900/20'}`}
              isLoading={isLoading}
              disabled={!!lockoutUntil || isLoading}
            >
              {!isLoading && (
                  <span className="flex items-center gap-2">
                      {lockoutUntil ? `Esperar ${remainingTime}s` : 'Iniciar Sesión'} 
                      {!lockoutUntil && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                  </span>
              )}
              {isLoading && 'Autenticando...'}
            </Button>
          </form>
        </div>
      </div>

      <Modal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
        title="Recuperar Contraseña"
        description="Ingresa tu correo electrónico para recibir tus credenciales."
        maxWidth="sm"
        footer={
            <>
                <Button variant="outline" onClick={() => setIsForgotModalOpen(false)}>
                    Cancelar
                </Button>
                <Button 
                    variant="primary" 
                    onClick={handleRecoverPassword}
                    isLoading={isRecovering}
                    disabled={!forgotEmail}
                >
                    Enviar
                </Button>
            </>
        }
      >
        <div className="py-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Email</label>
            <Input 
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="ejemplo@lavaderoberazategui.com.ar"
                className="w-full"
            />
        </div>
      </Modal>
      <Modal
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
        title="Solicitud Enviada"
        description="Si el correo es correcto, recibirás un mail con tus credenciales."
        maxWidth="sm"
        footer={
            <Button variant="primary" onClick={() => setIsSuccessModalOpen(false)} className="w-full">
                Entendido
            </Button>
        }
      >
        <div className="flex flex-col items-center justify-center py-4 text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <ArrowRight className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-sm text-slate-600">
                Por favor, revisa tu bandeja de entrada y la carpeta de spam.
            </p>
        </div>
      </Modal>

      <Modal
        isOpen={isSessionExpiredModalOpen}
        onClose={() => setIsSessionExpiredModalOpen(false)}
        title="Sesión Expirada"
        description="Tu sesión ha expirado por seguridad."
        maxWidth="sm"
        footer={
            <Button variant="primary" onClick={() => setIsSessionExpiredModalOpen(false)} className="w-full">
                Entendido
            </Button>
        }
      >
        <div className="flex flex-col items-center justify-center py-4 text-center">
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-6 h-6 text-amber-600" />
            </div>
            <p className="text-sm text-slate-600">
                Por favor, inicia sesión nuevamente para continuar operando.
            </p>
        </div>
      </Modal>
    </div>
  );
};
