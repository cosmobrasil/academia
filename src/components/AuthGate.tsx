import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Brain, LogIn, Eye, EyeOff, User } from 'lucide-react';

export default function AuthGate() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const USERS = ['Paulo', 'Emilio', 'Giulia', 'Isabela'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Selecione um usuário e digite a senha');
      return;
    }
    setError(null);
    setLoading(true);
    const err = await login(username, password);
    setLoading(false);
    if (err) {
      setError(err);
    }
  };

  return (
    <div className="min-h-screen bg-background text-on-surface font-sans flex flex-col antialiased">
      {/* Background decorative gradient */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="mentor-orb absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px]" />
        <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-surface to-transparent" />
      </div>

      <div className="relative z-10 flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Branding */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-container border border-secondary/10 mb-4">
              <Brain size={32} className="text-secondary" />
            </div>
            <h1 className="font-serif text-2xl font-bold text-primary tracking-tight">
              CosmoBrasil Learning Lab
            </h1>
            <p className="text-sm text-on-surface-variant mt-2 opacity-70">
              Acesse sua jornada de aprendizado
            </p>
          </div>

          {/* Login Card */}
          <div className="glass-panel rounded-2xl p-8 border border-white/5">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* User Selector */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-tertiary-fixed-dim mb-2">
                  Selecione seu usuário
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                  <select
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-surface-container-high border border-white/5 rounded-xl px-10 py-3 text-sm text-on-surface appearance-none cursor-pointer focus:outline-none focus:border-secondary/40 transition-colors"
                  >
                    <option value="">— Escolher —</option>
                    {USERS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-tertiary-fixed-dim mb-2">
                  Senha
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Digite sua senha"
                    className="w-full bg-surface-container-high border border-white/5 rounded-xl px-4 py-3 pr-10 text-sm text-on-surface placeholder-on-surface-variant/40 focus:outline-none focus:border-secondary/40 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-secondary transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="bg-error-container/20 border border-error/20 rounded-xl px-4 py-3">
                  <p className="text-xs text-on-error-container font-medium">
                    {error}
                  </p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || !username || !password}
                className="w-full flex items-center justify-center gap-2 bg-secondary text-on-secondary font-semibold text-sm rounded-xl py-3 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:active:scale-100 cursor-pointer"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-on-secondary border-t-transparent rounded-full animate-spin" />
                    Autenticando...
                  </>
                ) : (
                  <>
                    <LogIn size={16} />
                    Entrar
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-on-surface-variant mt-6 opacity-50">
            CosmoBrasil — Economia Circular &amp; Inteligência Territorial
          </p>
        </div>
      </div>
    </div>
  );
}
