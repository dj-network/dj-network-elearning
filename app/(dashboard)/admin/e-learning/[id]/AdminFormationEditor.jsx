"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createCourse,
  createLesson,
  updateLesson,
  reorderLessons,
  reorderCourses,
  deleteLesson,
  deleteCourse,
  updateCourse,
  deleteElearning,
} from "@/actions/elearning";

export default function AdminFormationEditor({ elearningId, courses }) {
  const router = useRouter();
  const [localCourses, setLocalCourses] = useState(courses || []);
  const [addCourseOpen, setAddCourseOpen] = useState(false);
  const [addLessonFor, setAddLessonFor] = useState(null);
  const [editLesson, setEditLesson] = useState(null);
  const [editCourse, setEditCourse] = useState(null);
  const [saving, setSaving] = useState(false);
  const [drag, setDrag] = useState(null); // {courseId, lessonId}
  const [dragOver, setDragOver] = useState(null); // lessonId
  const [dragCourseId, setDragCourseId] = useState(null);
  const [dragOverCourseId, setDragOverCourseId] = useState(null);

  const courseById = useMemo(() => {
    const m = new Map();
    for (const c of localCourses || []) m.set(c.id, c);
    return m;
  }, [localCourses]);

  function extractYoutubeId(url) {
    if (!url) return null;
    const match = url.match(
      /(?:youtu\.be\/|(?:www\.)?(?:m\.)?youtube\.com\/(?:watch\?v=|embed\/|live\/|shorts\/|v\/))([a-zA-Z0-9_-]{11})/,
    );
    return match ? match[1] : null;
  }

  function parseChaptersText(text) {
    const raw = String(text || "").trim();
    if (!raw) return [];
    const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

    const out = [];
    for (const line of lines) {
      // Accept: "mm:ss Title" or "hh:mm:ss Title" with separators space or " - "
      const m = line.match(/^(\d{1,2}:)?\d{1,2}:\d{2}\s+(.+)$/);
      if (!m) continue;
      const timePart = line.split(/\s+/)[0];
      const title = line.slice(timePart.length).trim().replace(/^[-–—]\s*/, "");
      const parts = timePart.split(":").map((p) => parseInt(p, 10));
      if (parts.some((n) => Number.isNaN(n))) continue;
      let seconds = 0;
      if (parts.length === 3) seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
      if (parts.length === 2) seconds = parts[0] * 60 + parts[1];
      if (!title) continue;
      out.push({ title, start: seconds });
    }

    // Sort and dedupe by start time
    out.sort((a, b) => a.start - b.start);
    const deduped = [];
    const seen = new Set();
    for (const c of out) {
      if (seen.has(c.start)) continue;
      seen.add(c.start);
      deduped.push(c);
    }
    return deduped;
  }

  function formatChaptersForTextarea(chaptersJson) {
    if (!chaptersJson) return "";
    try {
      const list = JSON.parse(chaptersJson);
      if (!Array.isArray(list)) return "";
      const fmt = (s) => {
        const n = Math.max(0, Math.floor(Number(s) || 0));
        const hh = Math.floor(n / 3600);
        const mm = Math.floor((n % 3600) / 60);
        const ss = n % 60;
        if (hh > 0)
          return `${hh}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
        return `${mm}:${String(ss).padStart(2, "0")}`;
      };
      return list
        .filter((c) => c && typeof c === "object")
        .map((c) => `${fmt(c.start)} ${String(c.title || "").trim()}`.trim())
        .filter(Boolean)
        .join("\n");
    } catch {
      return "";
    }
  }

  async function handleAddCourse(e) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.target);
    const res = await createCourse({
      elearningId,
      title: fd.get("title"),
      description: fd.get("description"),
      isRestricted: fd.get("isRestricted") === "on",
    });
    if (res.error) alert(res.error);
    setSaving(false);
    setAddCourseOpen(false);
    router.refresh();
  }

  async function handleEditCourse(e) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.target);
    const res = await updateCourse(editCourse.id, {
      title: fd.get("title"),
      description: fd.get("description"),
      isRestricted: fd.get("isRestricted") === "on",
    });
    if (res.error) alert(res.error);
    setSaving(false);
    setEditCourse(null);
    router.refresh();
  }

  async function handleAddLesson(e) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.target);
    const chaptersArr = parseChaptersText(fd.get("chapters"));

    const videoUrl = String(fd.get("videoUrl") || "").trim();
    const duration = String(fd.get("duration") || "").trim();

    const res = await createLesson({
      courseId: addLessonFor,
      title: fd.get("title"),
      description: fd.get("description"),
      videoUrl,
      chapters: chaptersArr.length ? JSON.stringify(chaptersArr) : null,
      duration,
    });
    if (res.error) alert(res.error);
    if (res.warning) alert(res.warning);
    setSaving(false);
    setAddLessonFor(null);
    router.refresh();
  }

  async function handleEditLesson(e) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.target);
    const chaptersArr = parseChaptersText(fd.get("chapters"));

    const videoUrl = String(fd.get("videoUrl") || "").trim();
    const duration = String(fd.get("duration") || "").trim();

    const res = await updateLesson(editLesson.id, {
      title: fd.get("title"),
      description: fd.get("description"),
      videoUrl,
      chapters: chaptersArr.length ? JSON.stringify(chaptersArr) : null,
      duration,
    });
    if (res.error) alert(res.error);
    if (res.warning) alert(res.warning);
    setSaving(false);
    setEditLesson(null);
    router.refresh();
  }

  async function handleDropLesson(courseId, targetLessonId) {
    if (!drag?.lessonId || !drag?.courseId) return;
    if (drag.courseId !== courseId) return;
    if (drag.lessonId === targetLessonId) return;

    const course = courseById.get(courseId);
    if (!course) return;

    const lessonsList = Array.isArray(course.lessons) ? [...course.lessons] : [];
    const fromIdx = lessonsList.findIndex((l) => l.id === drag.lessonId);
    const toIdx = lessonsList.findIndex((l) => l.id === targetLessonId);
    if (fromIdx === -1 || toIdx === -1) return;

    const [moved] = lessonsList.splice(fromIdx, 1);
    lessonsList.splice(toIdx, 0, moved);

    setLocalCourses((prev) =>
      (prev || []).map((c) =>
        c.id === courseId ? { ...c, lessons: lessonsList } : c,
      ),
    );

    setSaving(true);
    const res = await reorderLessons(courseId, lessonsList.map((l) => l.id));
    setSaving(false);
    setDrag(null);
    setDragOver(null);

    if (res?.error) {
      alert(res.error);
      router.refresh();
      return;
    }

    router.refresh();
  }

  async function handleDropCourse(targetCourseId) {
    if (!dragCourseId) return;
    if (dragCourseId === targetCourseId) return;

    const list = Array.isArray(localCourses) ? [...localCourses] : [];
    const fromIdx = list.findIndex((c) => c.id === dragCourseId);
    const toIdx = list.findIndex((c) => c.id === targetCourseId);
    if (fromIdx === -1 || toIdx === -1) return;

    const [moved] = list.splice(fromIdx, 1);
    list.splice(toIdx, 0, moved);

    setLocalCourses(list);

    setSaving(true);
    const res = await reorderCourses(elearningId, list.map((c) => c.id));
    setSaving(false);
    setDragCourseId(null);
    setDragOverCourseId(null);

    if (res?.error) {
      alert(res.error);
      router.refresh();
      return;
    }

    router.refresh();
  }

  async function handleDeleteLesson(id) {
    if (!confirm("Supprimer cette leçon ?")) return;
    const res = await deleteLesson(id);
    if (res.error) alert(res.error);
    router.refresh();
  }

  async function handleDeleteCourse(id) {
    if (!confirm("Supprimer ce module et toutes ses leçons ?")) return;
    const res = await deleteCourse(id);
    if (res.error) alert(res.error);
    router.refresh();
  }

  async function handleDeleteElearning() {
    if (
      !confirm(
        "Êtes-vous sûr de vouloir supprimer cette formation ? Cela supprimera également tous les modules et leçons associés.",
      )
    )
      return;
    setSaving(true);
    const res = await deleteElearning(elearningId);
    if (res.error) {
      alert(res.error);
      setSaving(false);
    } else {
      router.push("/admin/e-learning");
      router.refresh();
    }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">
            view_list
          </span>
          Programme de la formation
        </h2>
        <div className="flex gap-3">
          <button
            onClick={handleDeleteElearning}
            disabled={saving}
            className="text-sm font-bold bg-red-500/10 text-red-500 px-4 py-2 rounded-xl hover:bg-red-500/20 transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">delete</span>
            Supprimer la formation
          </button>
          <button
            onClick={() => setAddCourseOpen(true)}
            className="text-sm font-bold bg-primary text-[#0f1e23] px-4 py-2 rounded-xl hover:shadow-[0_0_20px_rgba(6,188,249,0.3)] transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Nouveau module
          </button>
        </div>
      </div>

      {courses.length === 0 && (
        <div className="text-center py-16 bg-[#162a31] rounded-2xl border border-slate-800">
          <span className="material-symbols-outlined text-5xl text-slate-600 mb-3 block">
            folder_open
          </span>
          <p className="text-slate-400 mb-4">
            Aucun module. Commencez par créer le premier module de cette
            formation.
          </p>
          <button
            onClick={() => setAddCourseOpen(true)}
            className="text-sm font-bold bg-primary text-[#0f1e23] px-5 py-2.5 rounded-xl hover:shadow-[0_0_20px_rgba(6,188,249,0.3)] transition-all"
          >
            Créer un module
          </button>
        </div>
      )}

      <div className="space-y-6">
        {localCourses.map((course, courseIdx) => (
          <div
            key={course.id}
            className="bg-[#162a31] rounded-2xl border border-slate-800 overflow-hidden"
          >
            {/* Module Header */}
            <div
              onDragOver={(e) => {
                if (!dragCourseId) return;
                e.preventDefault();
                setDragOverCourseId(course.id);
              }}
              onDragLeave={() => {
                if (dragOverCourseId === course.id) setDragOverCourseId(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                handleDropCourse(course.id);
              }}
              className={`flex items-center gap-4 p-5 border-b border-slate-800 ${
                dragOverCourseId === course.id
                  ? "bg-primary/10"
                  : ""
              }`}
            >
              <span
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", course.id);
                  setDragCourseId(course.id);
                }}
                onDragEnd={() => {
                  setDragCourseId(null);
                  setDragOverCourseId(null);
                }}
                title="Glisser pour réordonner les modules"
                className="text-slate-600 hover:text-slate-300 cursor-grab active:cursor-grabbing shrink-0"
              >
                <span className="material-symbols-outlined text-lg">
                  drag_indicator
                </span>
              </span>
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-lg shrink-0">
                {courseIdx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-bold text-base">
                  {course.title}
                </h3>
                {course.isRestricted && (
                  <span className="bg-amber-500/10 text-amber-500 text-[10px] px-2 py-0.5 rounded-md font-bold ml-2 uppercase tracking-tighter">
                    Restreint
                  </span>
                )}
                {course.description && (
                  <p className="text-slate-500 text-xs line-clamp-1">
                    {course.description}
                  </p>
                )}
              </div>
              <span className="text-slate-500 text-xs font-bold">
                {course.lessons.length} leçon(s)
              </span>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setEditCourse(course)}
                  className="text-xs font-medium bg-slate-800 text-slate-300 px-2.5 py-1.5 rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-1"
                  title="Modifier le module"
                >
                  <span className="material-symbols-outlined text-sm">
                    edit
                  </span>
                </button>
                <button
                  onClick={() => handleDeleteCourse(course.id)}
                  className="text-xs font-medium bg-red-500/10 text-red-400 px-2.5 py-1.5 rounded-lg hover:bg-red-500/20 transition-colors"
                  title="Supprimer le module"
                >
                  <span className="material-symbols-outlined text-sm">
                    delete
                  </span>
                </button>
              </div>
            </div>

            {/* Lessons */}
            <div className="p-3">
              {course.lessons.map((lesson, lessonIdx) => {
                const ytId = extractYoutubeId(lesson.videoUrl);
                return (
                  <div
                    key={lesson.id}
                    onDragOver={(e) => {
                      if (!drag) return;
                      e.preventDefault();
                      setDragOver(lesson.id);
                    }}
                    onDragLeave={() => {
                      if (dragOver === lesson.id) setDragOver(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleDropLesson(course.id, lesson.id);
                    }}
                    className={`flex items-center gap-4 py-3 px-4 rounded-xl transition-colors group ${
                      dragOver === lesson.id
                        ? "bg-primary/10 border border-primary/20"
                        : "hover:bg-[#0f1e23]/70"
                    }`}
                  >
                    <span
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("text/plain", lesson.id);
                        setDrag({ courseId: course.id, lessonId: lesson.id });
                      }}
                      onDragEnd={() => {
                        setDrag(null);
                        setDragOver(null);
                      }}
                      title="Glisser pour réordonner"
                      className="text-slate-600 hover:text-slate-300 cursor-grab active:cursor-grabbing shrink-0"
                    >
                      <span className="material-symbols-outlined text-lg">
                        drag_indicator
                      </span>
                    </span>
                    <span className="text-slate-600 text-xs font-mono w-6 text-center shrink-0">
                      {lessonIdx + 1}
                    </span>

                    {/* Video Thumbnail */}
                    {ytId ? (
                      <img
                        src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`}
                        alt=""
                        className="w-24 h-14 rounded-lg object-cover bg-slate-800 shrink-0"
                      />
                    ) : (
                      <div className="w-24 h-14 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-slate-600 text-xl">
                          videocam_off
                        </span>
                      </div>
                    )}

                    {/* Lesson Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-bold line-clamp-1">
                        {lesson.title}
                      </p>
                      {lesson.description && (
                        <p className="text-slate-500 text-xs line-clamp-1 mt-0.5">
                          {lesson.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-1">
                        {lesson.videoUrl ? (
                          <span className="text-green-400 text-[10px] font-bold flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-xs">
                              check_circle
                            </span>
                            Vidéo ajoutée
                          </span>
                        ) : (
                          <span className="text-amber-400 text-[10px] font-bold flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-xs">
                              warning
                            </span>
                            Pas de vidéo
                          </span>
                        )}
                        {lesson.duration && (
                          <span className="text-slate-500 text-[10px]">
                            {lesson.duration}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setEditLesson(lesson)}
                        className="text-xs font-medium bg-slate-800 text-slate-300 px-2.5 py-1.5 rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-sm">
                          edit
                        </span>
                        Éditer
                      </button>
                      <button
                        onClick={() => handleDeleteLesson(lesson.id)}
                        className="text-xs font-medium bg-red-500/10 text-red-400 px-2.5 py-1.5 rounded-lg hover:bg-red-500/20 transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm">
                          delete
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Add Lesson Button */}
              <button
                onClick={() => setAddLessonFor(course.id)}
                className="w-full mt-2 py-3 border-2 border-dashed border-slate-700/50 rounded-xl text-slate-500 hover:text-primary hover:border-primary/30 transition-colors text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                Ajouter une leçon
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ---- MODALS ---- */}

      {/* Add Course Modal */}
      {addCourseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f1e23]/80 backdrop-blur-sm p-4">
          <div className="bg-[#162a31] border border-slate-700/50 rounded-2xl p-8 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">
                create_new_folder
              </span>
              Nouveau module
            </h3>
            <form onSubmit={handleAddCourse} className="space-y-4">
              <InputField
                name="title"
                label="Titre du module"
                required
                placeholder="Ex: Les bases du mixage"
              />
              <TextareaField
                name="description"
                label="Description"
                placeholder="Décrivez le contenu de ce module..."
              />
              <div className="flex items-center gap-3 bg-[#0f1e23] p-4 rounded-xl border border-slate-700/50">
                <input
                  type="checkbox"
                  name="isRestricted"
                  id="isRestricted"
                  className="w-5 h-5 rounded-lg border-slate-700 bg-slate-800 text-primary focus:ring-primary/20"
                />
                <label htmlFor="isRestricted" className="text-sm font-bold text-white cursor-pointer">
                  Module restreint (avancé)
                </label>
              </div>
              <ModalActions
                onCancel={() => setAddCourseOpen(false)}
                saving={saving}
                label="Créer"
              />
            </form>
          </div>
        </div>
      )}

      {/* Edit Course Modal */}
      {editCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f1e23]/80 backdrop-blur-sm p-4">
          <div className="bg-[#162a31] border border-slate-700/50 rounded-2xl p-8 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">
                edit
              </span>
              Modifier le module
            </h3>
            <form onSubmit={handleEditCourse} className="space-y-4">
              <InputField
                name="title"
                label="Titre"
                required
                defaultValue={editCourse.title}
              />
              <TextareaField
                name="description"
                label="Description"
                defaultValue={editCourse.description ?? ""}
              />
              <div className="flex items-center gap-3 bg-[#0f1e23] p-4 rounded-xl border border-slate-700/50">
                <input
                  type="checkbox"
                  name="isRestricted"
                  id="isRestrictedEdit"
                  defaultChecked={!!editCourse.isRestricted}
                  className="w-5 h-5 rounded-lg border-slate-700 bg-slate-800 text-primary focus:ring-primary/20"
                />
                <label htmlFor="isRestrictedEdit" className="text-sm font-bold text-white cursor-pointer">
                  Module restreint (avancé)
                </label>
              </div>
              <ModalActions
                onCancel={() => setEditCourse(null)}
                saving={saving}
                label="Enregistrer"
              />
            </form>
          </div>
        </div>
      )}

      {/* Add Lesson Modal */}
      {addLessonFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f1e23]/80 backdrop-blur-sm p-4">
          <div className="bg-[#162a31] border border-slate-700/50 rounded-2xl p-8 w-full max-w-lg shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">
                ondemand_video
              </span>
              Nouvelle leçon
            </h3>
            <form onSubmit={handleAddLesson} className="space-y-4">
              <InputField
                name="title"
                label="Titre de la leçon"
                required
                placeholder="Ex: Introduction au mixage"
              />
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  URL YouTube{" "}
                  <span className="text-slate-600 font-normal normal-case">
                    (la vidéo sera visible dans le LMS)
                  </span>
                </label>
                <input
                  name="videoUrl"
                  className="w-full bg-[#0f1e23] border border-slate-700/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-primary transition-colors font-mono text-sm"
                  placeholder="https://www.youtube.com/watch?v=..."
                />
              </div>
              <InputField name="duration" label="Durée" placeholder="Ex: 18:30" />
              <TextareaField
                name="description"
                label="Description de la leçon"
                placeholder="Décrivez le contenu de cette leçon..."
              />
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Chapitres{" "}
                  <span className="text-slate-600 font-normal normal-case">
                    (1 ligne = horodatage + titre, ex: 00:00 Intro)
                  </span>
                </label>
                <textarea
                  name="chapters"
                  rows="5"
                  className="w-full bg-[#0f1e23] border border-slate-700/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-primary transition-colors resize-none font-mono text-xs"
                  placeholder={"00:00 Introduction\n02:10 Les accords\n10:45 Conclusion"}
                />
              </div>
              <ModalActions
                onCancel={() => setAddLessonFor(null)}
                saving={saving}
                label="Créer"
              />
            </form>
          </div>
        </div>
      )}

      {/* Edit Lesson Modal */}
      {editLesson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f1e23]/80 backdrop-blur-sm p-4">
          <div className="bg-[#162a31] border border-slate-700/50 rounded-2xl p-8 w-full max-w-lg shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">
                edit
              </span>
              Modifier la leçon
            </h3>
            <form onSubmit={handleEditLesson} className="space-y-4">
              <InputField
                name="title"
                label="Titre"
                required
                defaultValue={editLesson.title}
              />
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  URL YouTube
                </label>
                <input
                  name="videoUrl"
                  defaultValue={editLesson.videoUrl ?? ""}
                  className="w-full bg-[#0f1e23] border border-slate-700/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-primary transition-colors font-mono text-sm"
                />
                {editLesson.videoUrl &&
                  extractYoutubeId(editLesson.videoUrl) && (
                    <div className="mt-2 rounded-lg overflow-hidden bg-slate-900 aspect-video max-w-xs">
                      <img
                        src={`https://img.youtube.com/vi/${extractYoutubeId(editLesson.videoUrl)}/mqdefault.jpg`}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
              </div>
              <InputField
                name="duration"
                label="Durée"
                defaultValue={editLesson.duration ?? ""}
              />
              <TextareaField
                name="description"
                label="Description"
                defaultValue={editLesson.description ?? ""}
              />
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Chapitres{" "}
                  <span className="text-slate-600 font-normal normal-case">
                    (1 ligne = horodatage + titre)
                  </span>
                </label>
                <textarea
                  name="chapters"
                  rows="6"
                  defaultValue={formatChaptersForTextarea(editLesson.chapters)}
                  className="w-full bg-[#0f1e23] border border-slate-700/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-primary transition-colors resize-none font-mono text-xs"
                  placeholder={"00:00 Introduction\n02:10 Les accords\n10:45 Conclusion"}
                />
              </div>
              <ModalActions
                onCancel={() => setEditLesson(null)}
                saving={saving}
                label="Enregistrer"
              />
            </form>
          </div>
        </div>
      )}
    </>
  );
}

// Reusable form field components
function InputField({
  name,
  label,
  required,
  defaultValue,
  placeholder,
  type = "text",
}) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
        {label}
      </label>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full bg-[#0f1e23] border border-slate-700/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-primary transition-colors"
      />
    </div>
  );
}

function TextareaField({ name, label, defaultValue, placeholder }) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
        {label}
      </label>
      <textarea
        name={name}
        rows="3"
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full bg-[#0f1e23] border border-slate-700/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-primary transition-colors resize-none"
      />
    </div>
  );
}

function ModalActions({ onCancel, saving, label }) {
  return (
    <div className="flex gap-3 justify-end pt-2">
      <button
        type="button"
        onClick={onCancel}
        className="px-5 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 transition-colors"
      >
        Annuler
      </button>
      <button
        type="submit"
        disabled={saving}
        className="px-6 py-2.5 rounded-xl font-bold bg-primary text-[#0f1e23] disabled:opacity-50 hover:shadow-[0_0_20px_rgba(6,188,249,0.3)] transition-all"
      >
        {saving ? "Chargement..." : label}
      </button>
    </div>
  );
}
