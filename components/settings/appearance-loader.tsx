"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// Carregamento Dinâmico (Client-Side Only)
const AppearanceForm = dynamic(
  () => import("@/components/settings/appearance-form"),
  {
    ssr: false,
    loading: () => (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-300" />
      </div>
    ),
  }
);

// Interface que aceita NULL (vindo do Prisma)
interface AppearanceLoaderProps {
  initialColor?: string | null;
  userName?: string | null;
  userEmail?: string | null;
  userAvatar?: string | null; // Adicionar
  userBio?: string | null;    // Adicionar
}

export function AppearanceLoader({ initialColor, userName, userEmail, userAvatar, userBio }: AppearanceLoaderProps) {
  return (
    <AppearanceForm 
      initialColor={initialColor || undefined}
      userName={userName || undefined}
      userEmail={userEmail || undefined}
      userAvatar={userAvatar || undefined} // Repassar
      userBio={userBio || undefined}       // Repassar
    />
  );
}