"use client";

import { useState } from "react";
import ModalMasterclassCreate from "@/components/ModalMasterclassCreate";

export default function AdminElearningHeaderActions() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="bg-primary text-[#0f1e23] px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
      >
        <span className="material-symbols-outlined">add</span>
        Nouvelle Formation
      </button>

      <ModalMasterclassCreate
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        initialType="elearning"
      />
    </>
  );
}
