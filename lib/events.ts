import { MessageSquareText, Pill, Smile, Heart, Apple } from "lucide-react";

export interface HosaEvent {
  id: string;
  name: string;
  description: string;
  icon: any;
  questionBankFile: string;
  questionCountLabel: string;
}

export const HOSA_EVENTS: HosaEvent[] = [
  {
    id: "medical-terminology",
    name: "Medical Terminology",
    description: "Test your knowledge of medical terms, prefixes, suffixes, and root words",
    icon: MessageSquareText,
    questionBankFile: "/questions/medical-terminology.json",
    questionCountLabel: "200+ questions"
  },
  {
    id: "nutrition",
    name: "Nutrition",
    description: "Explore dietary principles, nutrients, and health-related nutrition concepts",
    icon: Apple,
    questionBankFile: "/questions/nutrition.json",
    questionCountLabel: "120+ questions"
  },
  {
    id: "pharmacology",
    name: "Pharmacology",
    description: "Study medications, drug interactions, and pharmaceutical principles",
    icon: Pill,
    questionBankFile: "/questions/pharmacology.json",
    questionCountLabel: "180+ questions"
  },
  {
    id: "dental-terminology",
    name: "Dental Terminology",
    description: "Master dental-specific terms, procedures, and oral health vocabulary",
    icon: Smile,
    questionBankFile: "/questions/dental-terminology.json",
    questionCountLabel: "90+ questions"
  },
  {
    id: "behavioral-health",
    name: "Behavioral Health",
    description: "Learn about mental health conditions, treatments, and psychological concepts",
    icon: Heart,
    questionBankFile: "/questions/behavioral-health.json",
    questionCountLabel: "110+ questions"
  }
];

export function getEventById(eventId: string): HosaEvent | undefined {
  return HOSA_EVENTS.find(event => event.id === eventId);
}

export function getEventName(eventId: string): string {
  const event = getEventById(eventId);
  return event?.name || eventId;
}
