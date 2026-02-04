// Constantes para o sistema de devolutivas de ocorrências

import { FeedbackActionType, OccurrenceStatus } from '@/types';

export const FEEDBACK_ACTION_TYPES: Record<FeedbackActionType, { label: string; icon: string }> = {
  student_talk: { label: 'Conversa com aluno', icon: 'MessageCircle' },
  guardian_contact: { label: 'Contato com responsável', icon: 'Phone' },
  verbal_warning: { label: 'Advertência verbal', icon: 'AlertTriangle' },
  written_warning: { label: 'Advertência escrita', icon: 'FileText' },
  coordination_referral: { label: 'Encaminhamento à coordenação', icon: 'ArrowRight' },
  direction_referral: { label: 'Encaminhamento à direção', icon: 'Building' },
  psychologist_referral: { label: 'Encaminhamento ao psicólogo', icon: 'Heart' },
  suspension: { label: 'Suspensão', icon: 'UserX' },
  mediation: { label: 'Mediação de conflito', icon: 'Users' },
  observation: { label: 'Observação/Acompanhamento', icon: 'Eye' },
  resolved: { label: 'Caso resolvido', icon: 'CheckCircle' },
  other: { label: 'Outra ação', icon: 'MoreHorizontal' },
};

export const OCCURRENCE_STATUS: Record<OccurrenceStatus, { label: string; color: string; bgClass: string; textClass: string }> = {
  pending: {
    label: 'Pendente',
    color: 'yellow',
    bgClass: 'bg-yellow-100',
    textClass: 'text-yellow-800'
  },
  in_progress: {
    label: 'Em andamento',
    color: 'blue',
    bgClass: 'bg-blue-100',
    textClass: 'text-blue-800'
  },
  resolved: {
    label: 'Resolvida',
    color: 'green',
    bgClass: 'bg-green-100',
    textClass: 'text-green-800'
  },
};

// Lista ordenada para select/dropdown
export const FEEDBACK_ACTION_OPTIONS = Object.entries(FEEDBACK_ACTION_TYPES).map(([value, { label }]) => ({
  value: value as FeedbackActionType,
  label,
}));

export const OCCURRENCE_STATUS_OPTIONS = Object.entries(OCCURRENCE_STATUS).map(([value, { label }]) => ({
  value: value as OccurrenceStatus,
  label,
}));
