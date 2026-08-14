import React, { useState, useEffect } from 'react';
import { User, Lock, ArrowRight, AlertCircle, Timer, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Logo } from '../components/ui/Logo';
import { Modal } from '../components/ui/Modal';
import { cn } from '../components/ui/UIComponents';
import { authService } from '../services/auth';
import { notify } from '../components/ui/Notice';

const APP_VERSION = 'v20251223_1.0.10';
const LOCKOUT_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 60;

/** "4:32" over a minute, "32s" under it (DESIGN.md §12.2). */
const formatLockTime = (seconds: number) =>
  seconds >= 60 ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}` : `${seconds}s`;

const FIELD_LABEL = 'text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1';
const FIELD_INPUT = 'h-12 bg-secondary/30 border-border pl-10 focus:border-primary focus:bg-background transition-all';

interface LoginProps {
  onLogin: () => void;
  sessionExpired?: boolean;
}

export const Login: React.FC<LoginProps> = ({ onLogin, sessionExpired }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [usuarioApp, setUsuarioApp] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [remainingTime, setRemainingTime] = useState<number>(0);

  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [isRecovering, setIsRecovering] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [isSessionExpiredModalOpen, setIsSessionExpiredModalOpen] = useState(!!sessionExpired);

  const locked = !!lockoutUntil;
  const disabled = locked || isLoading;

  useEffect(() => {
    if (!lockoutUntil) return;
    const interval = setInterval(() => {
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
      if (newAttempts >= LOCKOUT_ATTEMPTS) {
        setLockoutUntil(Date.now() + LOCKOUT_SECONDS * 1000);
        setRemainingTime(LOCKOUT_SECONDS);
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
    } catch (err) {
      console.error('Error recovering password:', err);
      notify.error('Hubo un error al procesar la solicitud.');
    } finally {
      setIsRecovering(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background animate-in fade-in duration-500">

      {/* Branding panel — desktop only (DESIGN.md §12.1) */}
      <div className="hidden md:flex flex-col justify-between w-1/2 lg:w-3/5 relative overflow-hidden text-white">
        <div
          className="absolute inset-0 z-0 bg-cover bg-center transition-transform duration-1000 hover:scale-105"
          style={{ backgroundImage: 'url(/ImagenLogin.jpeg)' }}
        />
        <div className="absolute inset-0 z-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
        <div className="absolute inset-0 z-0 bg-gradient-to-t from-black/90 via-transparent to-black/30" />

        <div className="relative z-10 flex h-full flex-col justify-between p-12">
          <Logo variant="light" size="lg" />
          <div>
            {/* Hero on the photo panel — the one place the kit's scale tops out
                at 2xl, so it steps up rather than inventing a new weight. */}
            <h1 className="mb-6 text-3xl font-bold leading-tight tracking-tight drop-shadow-lg lg:text-4xl">
              Control total de tu planta industrial.
            </h1>
            <p className="max-w-md border-l-2 border-white/30 pl-4 text-lg text-white/85">
              Gestión de stock, compras, inyecciones y logística en una única plataforma.
            </p>
          </div>
          <p className="text-xs font-medium uppercase tracking-wide text-white/60">
            © {new Date().getFullYear()} Lavadero Berazategui
          </p>
        </div>
      </div>

      {/* Form panel */}
      <div className="relative flex flex-1 flex-col bg-card">
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="w-full max-w-sm animate-in fade-in slide-in-from-bottom-8 duration-700">

            <div className="md:hidden mb-8 flex justify-center">
              <Logo variant="dark" size="md" />
            </div>

            <h2 className="text-2xl font-bold tracking-tight text-primary">Bienvenido</h2>
            <p className="mb-6 text-sm text-muted-foreground">Ingresá tus credenciales para acceder al sistema.</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div role="alert" className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 animate-in fade-in slide-in-from-top-2">
                  <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{error}</span>
                </div>
              )}

              {locked && (
                <div role="alert" className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 animate-in fade-in slide-in-from-top-2">
                  <Timer className="h-4 w-4 shrink-0 animate-pulse" aria-hidden="true" />
                  <span>Demasiados intentos. Reintentá en {formatLockTime(remainingTime)}.</span>
                </div>
              )}

              <div className="space-y-1">
                <label htmlFor="login-user" className={FIELD_LABEL}>Usuario</label>
                <div className="relative group">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" aria-hidden="true" />
                  <Input
                    id="login-user"
                    type="text"
                    autoComplete="username"
                    value={usuarioApp}
                    onChange={(e) => setUsuarioApp(e.target.value)}
                    placeholder="nombre.apellido"
                    className={FIELD_INPUT}
                    required
                    disabled={disabled}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label htmlFor="login-password" className={FIELD_LABEL}>Contraseña</label>
                  <button
                    type="button"
                    onClick={() => setIsForgotModalOpen(true)}
                    className="text-xs font-medium text-brand hover:underline disabled:opacity-50"
                    disabled={disabled}
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                <div className="relative group">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" aria-hidden="true" />
                  <Input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={cn(FIELD_INPUT, 'pr-11')}
                    required
                    disabled={disabled}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-2 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="group mt-4 h-12 w-full text-base font-semibold shadow-lg shadow-primary/20 transition-all hover:scale-[1.01] md:h-12"
                isLoading={isLoading}
                disabled={disabled}
              >
                {isLoading ? 'Autenticando…' : locked ? (
                  <span className="flex items-center gap-2">
                    <Lock className="h-4 w-4" aria-hidden="true" />
                    Bloqueado · {formatLockTime(remainingTime)}
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Iniciar sesión
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                  </span>
                )}
              </Button>
            </form>

            <p className="mt-6 text-center text-xs font-medium tracking-wide text-muted-foreground/70">{APP_VERSION}</p>
          </div>
        </div>
      </div>

      <Modal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
        title="Recuperar contraseña"
        description="Ingresá tu correo electrónico para recibir tus credenciales."
        maxWidth="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsForgotModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleRecoverPassword} isLoading={isRecovering} disabled={!forgotEmail}>Enviar</Button>
          </>
        }
      >
        <div className="py-2">
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            value={forgotEmail}
            onChange={(e) => setForgotEmail(e.target.value)}
            placeholder="ejemplo@lavaderoberazategui.com.ar"
          />
        </div>
      </Modal>

      <Modal
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
        title="Solicitud enviada"
        description="Si el correo es correcto, vas a recibir un mail con tus credenciales."
        maxWidth="sm"
        footer={<Button onClick={() => setIsSuccessModalOpen(false)}>Entendido</Button>}
      >
        <div className="flex flex-col items-center justify-center py-4 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="h-6 w-6 text-emerald-600" aria-hidden="true" />
          </div>
          <p className="text-sm text-muted-foreground">Revisá tu bandeja de entrada y la carpeta de spam.</p>
        </div>
      </Modal>

      <Modal
        isOpen={isSessionExpiredModalOpen}
        onClose={() => setIsSessionExpiredModalOpen(false)}
        title="Sesión expirada"
        description="Tu sesión expiró por seguridad."
        maxWidth="sm"
        footer={<Button onClick={() => setIsSessionExpiredModalOpen(false)}>Entendido</Button>}
      >
        <div className="flex flex-col items-center justify-center py-4 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
            <AlertCircle className="h-6 w-6 text-amber-600" aria-hidden="true" />
          </div>
          <p className="text-sm text-muted-foreground">Iniciá sesión nuevamente para continuar operando.</p>
        </div>
      </Modal>
    </div>
  );
};
