"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { resolveMediaUrl } from "@/libs/media";
import { getPresignedUrlForProfile } from "@/actions/r2";
import { updateUserProfile } from "@/actions/user";

function displayNameFromUser(u) {
  const fn = (u?.firstName || "").trim();
  const ln = (u?.lastName || "").trim();
  const full = `${fn} ${ln}`.trim();
  return full || (u?.name || "").trim() || "Compte";
}

function getAccountBadge(user) {
  if (user?.role === "admin") {
    return {
      label: "Admin",
      classes:
        "bg-secondary/10 text-secondary border border-secondary/20",
    };
  }
  if (user?.role === "formateur") {
    return {
      label: "Formateur",
      classes:
        "bg-amber-500/10 text-amber-300 border border-amber-500/20",
    };
  }
  return {
    label: "Élève",
    classes: "bg-primary/10 text-primary border border-primary/20",
  };
}

export default function SettingsClient({
  user,
}) {
  const router = useRouter();
  const fileRef = useRef(null);
  const photoMenuRef = useRef(null);
  const [isPending, startTransition] = useTransition();

  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [image, setImage] = useState(user?.image || "");
  const [imageFile, setImageFile] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [localPreview, setLocalPreview] = useState("");
  const [photoMenuOpen, setPhotoMenuOpen] = useState(false);
  useEffect(() => {
    if (!imageFile) {
      setLocalPreview("");
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setLocalPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const previewUrl = useMemo(() => {
    if (localPreview) return localPreview;
    return resolveMediaUrl(image);
  }, [image, localPreview]);

  const title = displayNameFromUser({ ...user, firstName, lastName, name: user?.name });
  const isStaff = user?.role === "admin" || user?.role === "formateur";
  const accountBadge = getAccountBadge(user);

  useEffect(() => {
    function onDocClick(event) {
      const root = photoMenuRef.current;
      if (!root) return;
      if (!root.contains(event.target)) setPhotoMenuOpen(false);
    }

    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("touchstart", onDocClick, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("touchstart", onDocClick);
    };
  }, []);

  async function uploadProfileImageIfNeeded() {
    if (!imageFile) return { imageUrl: image || null };

    const presign = await getPresignedUrlForProfile(imageFile.name, imageFile.type);
    if (!presign?.success) throw new Error(presign?.error || "Upload indisponible.");

    const uploadRes = await fetch(presign.signedUrl, {
      method: "PUT",
      headers: { "Content-Type": imageFile.type },
      body: imageFile,
    });
    if (!uploadRes.ok) throw new Error("Erreur lors de l'upload de la photo.");

    return { imageUrl: presign.fileUrl };
  }

  function onSelectFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type?.startsWith("image/")) {
      setError("Veuillez sélectionner une image.");
      return;
    }
    setError("");
    setSuccess("");
    setImageFile(f);
  }

  function clearPhoto() {
    setImage("");
    setImageFile(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function onSave() {
    setError("");
    setSuccess("");

    startTransition(async () => {
      try {
        const { imageUrl } = await uploadProfileImageIfNeeded();
        const res = await updateUserProfile({
          firstName,
          lastName,
          image: imageUrl,
        });
        if (!res?.success) throw new Error(res?.error || "Sauvegarde impossible.");

        setImage(imageUrl || "");
        setImageFile(null);
        if (fileRef.current) fileRef.current.value = "";

        setSuccess("Profil mis à jour.");
        router.refresh();
      } catch (e) {
        setError(e?.message || "Une erreur est survenue.");
      }
    });
  }

  return (
    <div className="bg-[#101f25] border border-slate-700/40 rounded-3xl p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <div ref={photoMenuRef} className="shrink-0 relative">
          <div className="w-20 h-20 rounded-full bg-slate-800 border border-slate-700/60 overflow-hidden flex items-center justify-center">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt="Photo de profil" src={previewUrl} className="w-full h-full object-cover" />
            ) : (
              <span className="material-symbols-outlined text-slate-400 text-3xl">
                person
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setPhotoMenuOpen((v) => !v)}
            className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-primary text-[#071b22] shadow-lg border-4 border-[#101f25] flex items-center justify-center hover:bg-primary/90 transition-colors"
            title={previewUrl ? "Modifier la photo" : "Ajouter une photo"}
            disabled={isPending}
          >
            <span className="material-symbols-outlined text-[18px]">edit</span>
          </button>

          {photoMenuOpen ? (
            <div className="absolute left-[calc(100%+12px)] top-1/2 z-20 min-w-52 -translate-y-1/2 rounded-2xl border border-slate-700/60 bg-[#162a31]/95 backdrop-blur-xl shadow-2xl overflow-hidden">
              <button
                type="button"
                onClick={() => {
                  setPhotoMenuOpen(false);
                  fileRef.current?.click();
                }}
                className="w-full px-4 py-3 text-left text-sm font-bold text-slate-100 hover:bg-slate-800/50 transition-colors flex items-center gap-2"
                disabled={isPending}
              >
                <span className="material-symbols-outlined text-base text-primary">upload</span>
                {previewUrl ? "Modifier la photo" : "Ajouter une photo"}
              </button>
              {(previewUrl || imageFile) ? (
                <button
                  type="button"
                  onClick={() => {
                    clearPhoto();
                    setPhotoMenuOpen(false);
                  }}
                  className="w-full px-4 py-3 text-left text-sm font-bold text-red-200 hover:bg-red-500/10 transition-colors flex items-center gap-2 border-t border-slate-800/70"
                  disabled={isPending}
                >
                  <span className="material-symbols-outlined text-base text-red-400">delete</span>
                  Supprimer la photo
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex-1 w-full">
          <div className="text-center sm:text-left">
            <h2 className="text-xl font-extrabold text-slate-100">{title}</h2>
            <div className="mt-1 flex flex-col sm:flex-row sm:items-center gap-2">
              <p className="text-slate-400 text-sm">{user?.email}</p>
              <span
                className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-widest ${accountBadge.classes}`}
              >
                {accountBadge.label}
              </span>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-xs font-bold tracking-widest text-slate-400 uppercase">
                Prénom
              </span>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="mt-2 w-full bg-[#162a31] border border-slate-700/50 rounded-2xl px-4 py-3 text-slate-200 outline-none focus:ring-1 focus:ring-primary/40"
                placeholder="Prénom"
                autoComplete="given-name"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold tracking-widest text-slate-400 uppercase">
                Nom
              </span>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="mt-2 w-full bg-[#162a31] border border-slate-700/50 rounded-2xl px-4 py-3 text-slate-200 outline-none focus:ring-1 focus:ring-primary/40"
                placeholder="Nom"
                autoComplete="family-name"
              />
            </label>
          </div>

          <div className="mt-6">
            <p className="text-slate-500 text-sm text-center sm:text-left">
              Cliquez sur le crayon pour ajouter, modifier ou supprimer votre photo de profil.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onSelectFile}
            />
          </div>

          {(error || success) && (
            <div className="mt-6">
              {error ? (
                <div className="bg-red-500/10 border border-red-500/30 text-red-200 rounded-2xl px-4 py-3 text-sm">
                  {error}
                </div>
              ) : null}
              {success ? (
                <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 rounded-2xl px-4 py-3 text-sm">
                  {success}
                </div>
              ) : null}
            </div>
          )}

          <div className="mt-6 flex items-center justify-center sm:justify-end">
            <button
              type="button"
              onClick={onSave}
              disabled={isPending}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-primary hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed text-[#071b22] font-extrabold transition-colors"
            >
              Enregistrer
            </button>
          </div>
        </div>
      </div>

      <div className="mt-10 border-t border-slate-700/40 pt-6">
        <h3 className="text-sm font-extrabold text-slate-200">Accès LMS</h3>
        <div className="mt-4 bg-[#162a31] border border-slate-700/40 rounded-2xl p-5">
          <p className="text-xs uppercase tracking-widest font-bold text-slate-400">
            {isStaff ? "Niveau d'accès" : "Statut du compte"}
          </p>
          <h4 className="text-2xl font-extrabold text-white mt-1">
            {isStaff ? accountBadge.label : "Élève"}
          </h4>
          <p className="text-slate-400 text-sm mt-1">
            {isStaff
              ? "Accès administrateur aux contenus et aux pages de gestion."
              : "Votre accès aux formations est géré par l'équipe DJ Network."}
          </p>
        </div>
      </div>
    </div>
  );
}
