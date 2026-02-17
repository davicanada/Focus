'use client';

import { Modal } from '@/components/ui/modal';
import { OccurrenceStatusBadge } from './OccurrenceStatusBadge';
import { OccurrenceFeedbackTimeline } from './OccurrenceFeedbackTimeline';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/lib/utils';
import type { OccurrenceStatus } from '@/types';

interface OccurrenceData {
  id: string;
  occurrence_date: string;
  description?: string;
  status: OccurrenceStatus;
  student?: {
    full_name: string;
  };
  class_at_occurrence?: {
    name: string;
  };
  occurrence_type?: {
    category: string;
    severity: string;
    subcategory?: {
      name: string;
      color?: string;
    };
  };
}

interface OccurrenceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  occurrence: OccurrenceData | null;
}

export function OccurrenceDetailModal({ isOpen, onClose, occurrence }: OccurrenceDetailModalProps) {
  if (!occurrence) return null;

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'grave':
        return <Badge variant="destructive">Grave</Badge>;
      case 'media':
        return <Badge variant="warning">Média</Badge>;
      default:
        return <Badge variant="mild">Leve</Badge>;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Detalhes da Ocorrência"
      className="max-w-2xl"
    >
      <div className="space-y-6">
        {/* Informações da Ocorrência */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg">
                {occurrence.student?.full_name || 'Aluno não encontrado'}
              </h3>
              {occurrence.class_at_occurrence?.name && (
                <p className="text-sm text-muted-foreground">
                  {occurrence.class_at_occurrence.name}
                </p>
              )}
            </div>
            <OccurrenceStatusBadge status={occurrence.status || 'pending'} />
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Tipo</p>
              <p className="font-medium">{occurrence.occurrence_type?.category || '-'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Severidade</p>
              <div className="mt-1">
                {getSeverityBadge(occurrence.occurrence_type?.severity || 'leve')}
              </div>
            </div>
            {occurrence.occurrence_type?.subcategory && (
              <div>
                <p className="text-muted-foreground">Subcategoria</p>
                <div className="mt-1">
                  <span
                    className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-white"
                    style={{ backgroundColor: occurrence.occurrence_type.subcategory.color || '#6B7280' }}
                  >
                    {occurrence.occurrence_type.subcategory.name}
                  </span>
                </div>
              </div>
            )}
            <div className={occurrence.occurrence_type?.subcategory ? '' : 'col-span-2'}>
              <p className="text-muted-foreground">Data da Ocorrência</p>
              <p className="font-medium">{formatDateTime(occurrence.occurrence_date)}</p>
            </div>
          </div>

          {occurrence.description && (
            <div>
              <p className="text-muted-foreground text-sm mb-1">Descrição</p>
              <p className="text-sm bg-gray-50 rounded-lg p-3">
                {occurrence.description}
              </p>
            </div>
          )}
        </div>

        {/* Divider */}
        <hr className="border-gray-200" />

        {/* Timeline de Devolutivas */}
        <OccurrenceFeedbackTimeline occurrenceId={occurrence.id} />
      </div>
    </Modal>
  );
}
