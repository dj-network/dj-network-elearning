
export default function AssistancePage() {
  return (
    <>
      <div className="p-8 max-w-4xl mx-auto w-full">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="material-symbols-outlined text-primary text-3xl">
              support_agent
            </span>
            <h1 className="text-3xl font-black text-white">Assistance</h1>
          </div>
          <p className="text-slate-400 max-w-2xl">
            Besoin d&apos;aide ? Notre équipe est là pour vous accompagner.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <div className="bg-[#162a31] border border-slate-800 rounded-xl p-6 hover:border-primary/50 transition-all">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4">
              <span className="material-symbols-outlined text-2xl">chat</span>
            </div>
            <h3 className="text-lg font-bold text-white mb-2">
              Chat en direct
            </h3>
            <p className="text-slate-400 text-sm mb-4">
              Discutez avec notre équipe en temps réel. Disponible du lundi au
              vendredi, 9h-18h.
            </p>
            <button className="bg-primary text-[#0f1e23] px-5 py-2.5 rounded-lg font-bold text-sm transition-all hover:shadow-[0_0_15px_rgba(6,188,249,0.3)]">
              Démarrer le chat
            </button>
          </div>

          <div className="bg-[#162a31] border border-slate-800 rounded-xl p-6 hover:border-primary/50 transition-all">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4">
              <span className="material-symbols-outlined text-2xl">mail</span>
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Email</h3>
            <p className="text-slate-400 text-sm mb-4">
              Envoyez-nous un email et nous vous répondrons sous 24h ouvrées.
            </p>
            <button className="bg-slate-800 text-white px-5 py-2.5 rounded-lg font-bold text-sm transition-all hover:bg-slate-700">
              support@djnetwork.com
            </button>
          </div>

          <div className="bg-[#162a31] border border-slate-800 rounded-xl p-6 hover:border-primary/50 transition-all">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4">
              <span className="material-symbols-outlined text-2xl">help</span>
            </div>
            <h3 className="text-lg font-bold text-white mb-2">FAQ</h3>
            <p className="text-slate-400 text-sm mb-4">
              Consultez les réponses aux questions les plus fréquentes.
            </p>
            <button className="bg-slate-800 text-white px-5 py-2.5 rounded-lg font-bold text-sm transition-all hover:bg-slate-700">
              Voir la FAQ
            </button>
          </div>

          <div className="bg-[#162a31] border border-slate-800 rounded-xl p-6 hover:border-primary/50 transition-all">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4">
              <span className="material-symbols-outlined text-2xl">
                videocam
              </span>
            </div>
            <h3 className="text-lg font-bold text-white mb-2">
              Coaching privé
            </h3>
            <p className="text-slate-400 text-sm mb-4">
              Réservez une session de coaching individuel avec un expert DJ
              Network.
            </p>
            <button className="bg-slate-800 text-white px-5 py-2.5 rounded-lg font-bold text-sm transition-all hover:bg-slate-700">
              Réserver une session
            </button>
          </div>
        </div>

        {/* Contact Form */}
        <div className="bg-[#162a31] border border-slate-800 rounded-xl p-8">
          <h3 className="text-xl font-bold text-white mb-6">
            Formulaire de contact
          </h3>
          <form className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Nom
                </label>
                <input
                  type="text"
                  className="w-full bg-slate-800/60 border border-slate-700 rounded-lg py-2.5 px-4 text-sm text-white placeholder:text-slate-500 focus:ring-1 focus:ring-primary/50 focus:border-primary/50 outline-none transition-all"
                  placeholder="Votre nom"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  className="w-full bg-slate-800/60 border border-slate-700 rounded-lg py-2.5 px-4 text-sm text-white placeholder:text-slate-500 focus:ring-1 focus:ring-primary/50 focus:border-primary/50 outline-none transition-all"
                  placeholder="votre@email.com"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Sujet
              </label>
              <select className="w-full bg-slate-800/60 border border-slate-700 rounded-lg py-2.5 px-4 text-sm text-white focus:ring-1 focus:ring-primary/50 focus:border-primary/50 outline-none transition-all">
                <option>Problème technique</option>
                <option>Demande de remboursement</option>
                <option>Suggestion</option>
                <option>Autre</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Message
              </label>
              <textarea
                rows={5}
                className="w-full bg-slate-800/60 border border-slate-700 rounded-lg py-2.5 px-4 text-sm text-white placeholder:text-slate-500 focus:ring-1 focus:ring-primary/50 focus:border-primary/50 outline-none transition-all resize-none"
                placeholder="Décrivez votre demande..."
              />
            </div>
            <button
              type="submit"
              className="bg-primary text-[#0f1e23] px-8 py-3 rounded-lg font-bold transition-all hover:shadow-[0_0_15px_rgba(6,188,249,0.3)]"
            >
              Envoyer
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
