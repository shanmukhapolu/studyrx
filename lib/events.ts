import { MessageSquareText, Pill, Smile, Heart, Apple, SpellCheck2, SquareActivity, Stethoscope, Library, Earth, Calculator } from "lucide-react";

export interface HosaEvent {
  id: string;
  name: string;
  description: string;
  icon: any;
  questionBankFile: string;
  published: boolean;
}

export const HOSA_EVENTS: HosaEvent[] = [
  {
    id: "medical-terminology",
    name: "Medical Terminology",
    description: "Assess knowledge of medical vocabulary, including prefixes, suffixes, root words, and their application across clinical settings",
    icon: MessageSquareText,
    questionBankFile: "/questions/medical-terminology.json",
    published: true,
  },
  {
    id: "medical-spelling",
    name: "Medical Spelling",
    description: "Assess knowledge of accurate spelling and recognition of complex medical terms derived from prefixes, suffixes, and root words",
    icon: SpellCheck2,
    questionBankFile: "/questions/medical-spelling.json",
    published: true,
  },
  {
    id: "respiratory-therapy",
    name: "Respiratory Therapy",
    description: "Assess knowledge of respiratory system anatomy, diseases, diagnostic methods, and therapeutic interventions in patient care.",
    icon: SquareActivity,
    questionBankFile: "/questions/respiratory-therapy.json",
    published: true,
  },
  {
    id: "world-health-and-disparities",
    name: "World Health & Disparities",
    description: "Assess knowledge of global health issues, epidemiology, social determinants of health, and healthcare disparities.",
    icon: Earth,
    questionBankFile: "/questions/world-health-and-disparities.json",
    published: false,
  },
  {
    id: "anatomy-and-physiology",
    name: "Anatomy & Physiology",
    description: "Assess knowledge of the structure and function of human body systems, including organization, homeostasis, and the interactions necessary for maintaining life.",
    icon: Stethoscope,
    questionBankFile: "/questions/anatomy-and-physiology.json",
    published: true,
  },
  {
    id: "health-informatics",
    name: "Health Informatics",
    description: "Assess knowledge of health information systems, data management, electronic health records, and the use of technology to improve patient care, safety, and healthcare outcomes",
    icon: Library,
    questionBankFile: "/questions/health-informatics.json",
    published: true,
  },
  {
    id: "medical-math",
    name: "Medical Math",
    description: "Assess knowledge of dosage calculations, unit conversions, IV flow rates, and other mathematical applications in healthcare.",
    icon: Calculator,
    questionBankFile: "/questions/medical-math.json",
    published: false,
  }/*,
  {
    id: "nutrition",
    name: "Nutrition",
    description: "Assess knowledge of nutrients, dietary principles, metabolism, and their role in health, disease prevention, and patient care",
    icon: Apple,
    questionBankFile: "/questions/nutrition.json"
  },
  {
    id: "pharmacology",
    name: "Pharmacology",
    description: "Assess knowledge of drug classifications, mechanisms of action, therapeutic uses, side effects, and safe medication practices",
    icon: Pill,
    questionBankFile: "/questions/pharmacology.json"
  },
  {
    id: "dental-terminology",
    name: "Dental Terminology",
    description: "Assess knowledge of dental anatomy, procedures, diseases, and terminology used in oral health care",
    icon: Smile,
    questionBankFile: "/questions/dental-terminology.json"
  },
  {
    id: "behavioral-health",
    name: "Behavioral Health",
    description: "Assess knowledge of mental health disorders, psychological concepts, and therapeutic approaches used in behavioral health care",
    icon: Heart,
    questionBankFile: "/questions/behavioral-health.json"
  }*/
];

export function getEventById(eventId: string): HosaEvent | undefined {
  return HOSA_EVENTS.find((event) => event.id === eventId);
}

export function getEventName(eventId: string): string {
  const event = getEventById(eventId);
  return event?.name || eventId;
}

export function isEventPublished(eventId: string): boolean {
  const event = getEventById(eventId);
  return Boolean(event?.published);
}
