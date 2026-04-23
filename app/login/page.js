"use client";

import { useActionState, Suspense } from "react";
import { loginUser } from "@/actions/auth";
import Image from "next/image";

function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginUser, null);

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm flex items-center gap-3">
          <span className="material-symbols-outlined">error</span>
          {state.error}
        </div>
      )}

      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-slate-300 mb-2"
        >
          Adresse email
        </label>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-xl">
            mail
          </span>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="prenom@exemple.com"
            className="w-full bg-[#0f1e23] border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-slate-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-slate-600"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label
            htmlFor="password"
            className="block text-sm font-medium text-slate-300"
          >
            Mot de passe
          </label>
        </div>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-xl">
            lock
          </span>
          <input
            id="password"
            name="password"
            type="password"
            required
            placeholder="••••••••"
            className="w-full bg-[#0f1e23] border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-slate-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-slate-600"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-primary hover:bg-primary/90 text-[#0f1e23] font-bold py-3 px-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isPending ? (
          <span className="loading loading-spinner loading-sm"></span>
        ) : (
          <>
            Se connecter
            <span className="material-symbols-outlined text-sm font-bold">
              login
            </span>
          </>
        )}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-bg-dark flex items-center justify-center p-6 bg-grid-pattern relative">
      <div className="absolute top-0 right-0 w-full h-[500px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="max-w-md w-full relative z-10">
        <div className="text-center mb-8 flex flex-col items-center">
          <Image
            src="/logo.png"
            alt="DJ Network Hub"
            width={180}
            height={54}
            className="w-auto h-12 mb-6"
            priority
          />
          <h1 className="text-3xl font-black text-white">Espace élèves</h1>
          <p className="mt-2 text-slate-400">
            Connectez-vous pour accéder à vos formations LMS.
          </p>
        </div>

        <div className="bg-[#162a31]/80 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 shadow-2xl relative">
          <Suspense fallback={<div>Chargement...</div>}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
