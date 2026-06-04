import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, X } from 'lucide-react';

interface Props {
  onClose: () => void;
}

export default function ChangePasswordModal({ onClose }: Props) {
  const { changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Preencha todos os campos');
      return;
    }
    if (newPassword.length < 4) {
      setError('Nova senha deve ter no mínimo 4 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Nova senha e confirmação não conferem');
      return;
    }

    setLoading(true);
    const err = await changePassword(currentPassword, newPassword);
    setLoading(false);

    if (err) {
      setError(err);
    } else {
      setSuccess(true);
      setTimeout(() => onClose(), 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="glass-panel max-w-sm w-full rounded-2xl p-6 border border-white/10 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-serif text-lg font-bold text-primary flex items-center gap-2">
            <Lock size={18} className="text-secondary" />
            Alterar Senha
          </h3>
          <button onClick={onClose} className="text-on-surface-variant hover:text-white p-1 rounded-md cursor-pointer">
            <X size={16} />
          </button>
        </div>

        {success ? (
          <div className="bg-secondary/10 border border-secondary/20 rounded-xl px-4 py-3">
            <p className="text-xs text-secondary font-medium">Senha alterada com sucesso!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-tertiary-fixed-dim mb-1.5">
                Senha Atual
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full bg-surface-container-high border border-white/5 rounded-xl px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-secondary/40 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-tertiary-fixed-dim mb-1.5">
                Nova Senha
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-surface-container-high border border-white/5 rounded-xl px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-secondary/40 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-tertiary-fixed-dim mb-1.5">
                Confirmar Nova Senha
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-surface-container-high border border-white/5 rounded-xl px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-secondary/40 transition-colors"
              />
            </div>

            {error && (
              <div className="bg-error-container/20 border border-error/20 rounded-xl px-4 py-3">
                <p className="text-xs text-on-error-container font-medium">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-secondary text-on-secondary font-semibold text-sm rounded-xl py-2.5 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-40 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-on-secondary border-t-transparent rounded-full animate-spin" />
                  Alterando...
                </>
              ) : (
                'Salvar Nova Senha'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
