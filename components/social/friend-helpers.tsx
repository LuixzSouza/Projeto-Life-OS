"use client";

import { parseISO, differenceInYears, differenceInDays, setYear, addYears, isPast, isValid } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Heart, Star, Users as UsersIcon } from "lucide-react";

// --- HELPERS FUNCIONAIS E SEGUROS ---
export const getProximityBadge = (level?: string) => {
  switch (level) {
    case "FAMILY": return <Badge variant="secondary" className="bg-purple-500/10 text-purple-600 border-none gap-1"><Heart className="w-3 h-3 fill-purple-600" /> Família</Badge>;
    case "CLOSE": return <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border-none gap-1"><Star className="w-3 h-3 fill-amber-600" /> Próximo</Badge>;
    case "WORK": return <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 border-none gap-1"><Briefcase className="w-3 h-3" /> Trabalho</Badge>;
    default: return <Badge variant="secondary" className="bg-muted text-muted-foreground border-none gap-1"><UsersIcon className="w-3 h-3" /> Conhecido</Badge>;
  }
};

export const safelyParseDate = (dateString: string | null | undefined) => {
  if (!dateString) return null;
  const date = parseISO(dateString);
  return isValid(date) ? date : null;
};

export const calculateAge = (dateString: string | null | undefined) => {
  const date = safelyParseDate(dateString);
  if (!date) return null;
  return differenceInYears(new Date(), date);
};

export const getBirthdayInfo = (dateString: string | null | undefined) => {
  const birthDate = safelyParseDate(dateString);
  if (!birthDate) return { text: null, days: 999, isSoon: false };

  const today = new Date();
  let nextBirthday = setYear(birthDate, today.getFullYear());

  if (isPast(nextBirthday) && differenceInDays(today, nextBirthday) > 0) {
    nextBirthday = addYears(nextBirthday, 1);
  }

  const diff = differenceInDays(nextBirthday, today);
  if (diff === 0) return { text: "É Hoje! 🎉", days: 0, isSoon: true };
  if (diff === 1) return { text: "Amanhã! 🎂", days: 1, isSoon: true };

  return { text: `Em ${diff} dias`, days: diff, isSoon: diff <= 30 };
};

export const openWhatsApp = (phone?: string | null) => {
  if (!phone) return;
  let numbers = phone.replace(/\D/g, '');
  if (numbers.length === 10 || numbers.length === 11) numbers = `55${numbers}`;
  window.open(`https://wa.me/${numbers}`, '_blank');
};
