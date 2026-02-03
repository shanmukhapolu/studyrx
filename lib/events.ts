import { MessageSquareText, Pill, Smile, Heart, Apple } from "lucide-react";

export interface HosaEvent {
  id: string;
  name: string;
  description: string;
  icon: any;
  questionBankFile: string;
}

export const HOSA_EVENTS: HosaEvent[] = [
  {
    id: "medical-terminology",
    name: "Medical Terminology",
    description: "Test your knowledge of medical terms, prefixes, suffixes, and root words",
    icon: MessageSquareText,
    questionBankFile: "/questions/medical-terminology.json"
  },
  {
    id: "nutrition",
    name: "Nutrition",
    description: "Explore dietary principles, nutrients, and health-related nutrition concepts",
    icon: Apple,
    questionBankFile: "/questions/nutrition.json"
  },
  {
    id: "pharmacology",
    name: "Pharmacology",
    description: "Study medications, drug interactions, and pharmaceutical principles",
    icon: Pill,
    questionBankFile: "/questions/pharmacology.json"
  },
  {
    id: "dental-terminology",
    name: "Dental Terminology",
    description: "Master dental-specific terms, procedures, and oral health vocabulary",
    icon: Smile,
    questionBankFile: "/questions/dental-terminology.json"
  },
  {
    id: "behavioral-health",
    name: "Behavioral Health",
    description: "Learn about mental health conditions, treatments, and psychological concepts",
    icon: Heart,
    questionBankFile: "/questions/behavioral-health.json"
  }
];

export function getEventById(eventId: string): HosaEvent | undefined {
  return HOSA_EVENTS.find(event => event.id === eventId);
}

export function getEventName(eventId: string): string {
  const event = getEventById(eventId);
  return event?.name || eventId;
}
