import { resolveMediaUrl } from "@/libs/media";

function parseJson(value, fallback) {
  if (!value || typeof value !== "string") return fallback;
  try {
    const out = JSON.parse(value);
    return out ?? fallback;
  } catch {
    return fallback;
  }
}

function cleanUrl(u) {
  const s = String(u || "").trim();
  if (!s) return "";
  return s;
}

export default function MasterclassStructuredSections({ mc, hideDownloads = false }) {
  const highlights = parseJson(mc?.highlights, []);
  const downloads = hideDownloads ? [] : parseJson(mc?.downloads, []);
  const softwares = parseJson(mc?.softwares, []);
  const links = parseJson(mc?.links, []);

  const hasAny =
    (Array.isArray(highlights) && highlights.length) ||
    (Array.isArray(downloads) && downloads.length) ||
    (Array.isArray(softwares) && softwares.length) ||
    (Array.isArray(links) && links.length);

  if (!hasAny) return null;

  return (
    <div className="mt-6 space-y-6">
      {Array.isArray(highlights) && highlights.length > 0 && (
        <section className="bg-[#162a31] border border-slate-800 rounded-2xl p-5">
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-base">
              checklist
            </span>
            Ce que vous apprendrez
          </h3>
          <ul className="space-y-2">
            {highlights.slice(0, 24).map((t, i) => (
              <li key={`${i}-${t}`} className="flex gap-2 text-slate-200 text-sm">
                <span className="material-symbols-outlined text-primary text-lg">
                  check_circle
                </span>
                <span>{String(t)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {Array.isArray(downloads) && downloads.length > 0 && (
        <section className="bg-[#162a31] border border-slate-800 rounded-2xl p-5">
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-base">
              download
            </span>
            Téléchargements
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {downloads.slice(0, 12).map((d, i) => {
              const title = String(d?.title || "Ressource");
              const url = cleanUrl(d?.url);
              if (!url) return null;
              return (
                <a
                  key={`${i}-${title}`}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-[#0f1e23] border border-slate-700/50 rounded-xl px-4 py-3 hover:border-primary/40 hover:bg-slate-800/30 transition-colors flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-slate-100 font-bold text-sm line-clamp-1">
                      {title}
                    </p>
                    <p className="text-slate-500 text-xs line-clamp-1">{url}</p>
                  </div>
                  <span className="material-symbols-outlined text-primary shrink-0">
                    arrow_outward
                  </span>
                </a>
              );
            })}
          </div>
        </section>
      )}

      {Array.isArray(softwares) && softwares.length > 0 && (
        <section className="bg-[#162a31] border border-slate-800 rounded-2xl p-5">
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-base">
              extension
            </span>
            Logiciels utilisés
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {softwares.slice(0, 18).map((s, i) => {
              const name = String(s?.name || "Logiciel");
              const url = cleanUrl(s?.url);
              const logo = resolveMediaUrl(s?.logoUrl);
              return (
                <a
                  key={`${i}-${name}`}
                  href={url || "#"}
                  target={url ? "_blank" : undefined}
                  rel={url ? "noreferrer" : undefined}
                  className={`bg-[#0f1e23] border border-slate-700/50 rounded-2xl p-4 flex items-center gap-3 transition-colors ${
                    url
                      ? "hover:border-primary/40 hover:bg-slate-800/30"
                      : ""
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700/60 overflow-hidden flex items-center justify-center shrink-0">
                    {logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={logo} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="material-symbols-outlined text-slate-500">
                        memory
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-slate-100 font-bold text-sm line-clamp-1">
                      {name}
                    </p>
                    {url ? (
                      <p className="text-slate-500 text-xs line-clamp-1">{url}</p>
                    ) : (
                      <p className="text-slate-600 text-xs">Lien manquant</p>
                    )}
                  </div>
                </a>
              );
            })}
          </div>
        </section>
      )}

      {Array.isArray(links) && links.length > 0 && (
        <section className="bg-[#162a31] border border-slate-800 rounded-2xl p-5">
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-base">
              link
            </span>
            Liens utiles
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {links.slice(0, 12).map((d, i) => {
              const title = String(d?.title || "Lien");
              const url = cleanUrl(d?.url);
              if (!url) return null;
              return (
                <a
                  key={`${i}-${title}`}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-[#0f1e23] border border-slate-700/50 rounded-xl px-4 py-3 hover:border-primary/40 hover:bg-slate-800/30 transition-colors flex items-center justify-between gap-3"
                >
                  <p className="text-slate-100 font-bold text-sm line-clamp-1">
                    {title}
                  </p>
                  <span className="material-symbols-outlined text-primary shrink-0">
                    arrow_outward
                  </span>
                </a>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

