"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AdminProductUploadForm from "./AdminProductUploadForm";

export default function AdminProductHeaderActions({ categories }) {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const router = useRouter();

  const handleSuccess = () => {
    setIsUploadModalOpen(false);
    router.refresh(); // Refresh the list of products
  };

  return (
    <>
      <button
        onClick={() => setIsUploadModalOpen(true)}
        className="bg-primary text-[#0f1e23] px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
      >
        <span className="material-symbols-outlined">add</span>
        Nouveau Produit
      </button>

      {/* Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f1e23]/80 backdrop-blur-sm p-4">
          <div className="bg-[#162a31] border border-slate-700/50 rounded-3xl p-8 w-full max-w-2xl shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">
                  upload_file
                </span>
                Ajouter un produit (Marketplace)
              </h2>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="text-slate-500 hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined text-3xl">
                  close
                </span>
              </button>
            </div>

            <AdminProductUploadForm
              categories={categories}
              onSuccess={handleSuccess}
            />
          </div>
        </div>
      )}
    </>
  );
}
