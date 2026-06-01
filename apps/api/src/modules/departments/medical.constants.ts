export type MedicalIncidentCategory =
  | 'DIZZINESS'
  | 'FAINTING'
  | 'INJURY'
  | 'ASTHMA_CRISIS'
  | 'ALLERGIC_REACTION'
  | 'CHEST_PAIN'
  | 'SEIZURE'
  | 'HYPERTENSION'
  | 'NAUSEA'
  | 'OTHER';

export const MEDICAL_INCIDENT_CATEGORY_LABELS: Record<MedicalIncidentCategory, string> = {
  DIZZINESS: 'Dizziness',
  FAINTING: 'Fainting',
  INJURY: 'Injury',
  ASTHMA_CRISIS: 'Asthma crisis',
  ALLERGIC_REACTION: 'Allergic reaction',
  CHEST_PAIN: 'Chest pain',
  SEIZURE: 'Seizure',
  HYPERTENSION: 'Hypertension',
  NAUSEA: 'Nausea / vomiting',
  OTHER: 'Other',
};

/** Categories that trigger pastor/admin alert and default prayer-team routing */
export const SERIOUS_MEDICAL_CATEGORIES: MedicalIncidentCategory[] = [
  'FAINTING',
  'INJURY',
  'ASTHMA_CRISIS',
  'ALLERGIC_REACTION',
  'CHEST_PAIN',
  'SEIZURE',
];

export function isSeriousIncident(
  category: MedicalIncidentCategory,
  severity: string,
): boolean {
  if (severity === 'HIGH' || severity === 'CRITICAL') return true;
  return SERIOUS_MEDICAL_CATEGORIES.includes(category);
}
