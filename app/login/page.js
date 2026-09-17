"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

function UserIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

function EyeIcon({ open }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a20.3 20.3 0 0 1 5.06-5.94M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 7 11 7a20.3 20.3 0 0 1-3.22 4.24M14.12 14.12a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { signIn, signUp } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isSignUp) {
        await signUp(email, password, name.trim());
      } else {
        await signIn(email, password);
      }
      router.push("/");
    } catch (err) {
      setError(err.message || "Algo deu errado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md text-center">
        <h1 className="tracked text-4xl font-serif text-bone mb-2">ROUTINE</h1>
        <p className="text-mute mb-6">Organize sua rotina do dia a dia.</p>
        <div className="w-12 h-px bg-ember mx-auto mb-8" />

        <form onSubmit={handleSubmit} className="text-left space-y-5" autoComplete="off">
          {isSignUp && (
            <div>
              <label className="text-sm text-bone/80 mb-2 block">Nome</label>
              <div className="flex items-center gap-3 border border-line rounded-lg px-4 py-3 bg-panel focus-within:border-ember/50">
                <span className="text-mute"><UserIcon /></span>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Como quer ser chamado?"
                  autoComplete="off"
                  name="routine-name"
                  className="bg-transparent outline-none w-full text-bone placeholder:text-mute/60"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-sm text-bone/80 mb-2 block">E-mail</label>
            <div className="flex items-center gap-3 border border-line rounded-lg px-4 py-3 bg-panel focus-within:border-ember/50">
              <span className="text-mute"><MailIcon /></span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@exemplo.com"
                autoComplete="off"
                name="routine-email"
                className="bg-transparent outline-none w-full text-bone placeholder:text-mute/60"
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-bone/80 mb-2 block">Senha</label>
            <div className="flex items-center gap-3 border border-line rounded-lg px-4 py-3 bg-panel focus-within:border-ember/50">
              <span className="text-mute"><LockIcon /></span>
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
                name="routine-password"
                className="bg-transparent outline-none w-full text-bone placeholder:text-mute/60"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="text-mute hover:text-bone"
              >
                <EyeIcon open={showPassword} />
              </button>
            </div>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="tracked w-full border border-ember/60 rounded-lg py-3 text-ember hover:bg-ember/10 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? "Entrando..." : isSignUp ? "Criar conta" : "Entrar"} <span>→</span>
          </button>
        </form>

        <div className="flex items-center gap-3 mt-6">
          <div className="flex-1 h-px bg-line" />
          <button
            onClick={() => setIsSignUp((v) => !v)}
            className="text-sm text-mute"
          >
            {isSignUp ? "Já tem conta? " : "Não tem conta? "}
            <span className="text-ember underline">
              {isSignUp ? "Entrar" : "Criar uma agora"}
            </span>
          </button>
          <div className="flex-1 h-px bg-line" />
        </div>
      </div>
    </div>
  );
}