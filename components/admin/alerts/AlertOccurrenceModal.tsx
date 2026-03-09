'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { User, Calendar, Tag, Layers, ClipboardList, Plus } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { OccurrenceStatusBadge } from '@/components/occurrences/OccurrenceStatusBadge';
import { OccurrenceFeedbackTimeline } from '@/components/occurrences/OccurrenceFeedbackTimeline';
import { OCCURRENCE_STATUS_OPTIONS, FEEDBACK_ACTION_OPTIONS } from '@/lib/constants/feedback';
import { formatDateTime } from '@/lib/utils';
import type { AlertNotification, OccurrenceStatus, FeedbackActionType } from '@/types';

interface AlertOccurrenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  notification: AlertNotification;
  onStatusChanged: (notificationId: string, newStatus: OccurrenceStatus) => void;
}

export function AlertOccurrenceModal({
  isOpen,
  onClose,
  notification,
  onStatusChanged,
}: AlertOccurrenceModalProps) {
  const occurrence = notification.occurrence;

  const [currentStatus, setCurrentStatus] = useState<OccurrenceStatus>(
    occurrence?.status ?? 'pending'
  );
  const [savingStatus, setSavingStatus] = useState(false);
  const [timelineKey, setTimelineKey] = useState(0);

  // Form de nova devolutiva
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [actionType, setActionType] = useState<FeedbackActionType>('student_talk');
  const [description, setDescription] = useState('');
  const [markResolved, setMarkResolved] = useState(false);
  const [savingFeedback, setSavingFeedback] = useState(false);

  if (!occurrence) return null;

  const occurrenceType = occurrence.occurrence_type;
  const subcategory = occurrenceType?.subcategory;

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'grave': return <Badge variant="destructive">Grave</Badge>;
      case 'media': return <Badge variant="warning">Média</Badge>;
      default: return <Badge variant="mild">Leve</Badge>;
    }
  };

  const handleStatusChange = async (newStatus: OccurrenceStatus) => {
    if (newStatus === currentStatus) return;
    setSavingStatus(true);
    try {
      const response = await fetch(`/api/occurrences/${occurrence.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao atualizar status');
      }

      setCurrentStatus(newStatus);
      onStatusChanged(notification.id, newStatus);
      toast.success('Status atualizado');
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar status');
    } finally {
      setSavingStatus(false);
    }
  };

  const handleAddFeedback = async () => {
    setSavingFeedback(true);
    try {
      const response = await fetch(`/api/occurrences/${occurrence.id}/feedbacks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action_type: actionType,
          description: description.trim() || undefined,
          mark_resolved: markResolved,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao registrar devolutiva');
      }

      const data = await response.json();

      if (data.new_status && data.new_status !== currentStatus) {
        setCurrentStatus(data.new_status);
        onStatusChanged(notification.id, data.new_status);
      }

      // Resetar form e recarregar timeline
      setActionType('student_talk');
      setDescription('');
      setMarkResolved(false);
      setShowFeedbackForm(false);
      setTimelineKey(k => k + 1);
      toast.success('Devolutiva registrada');
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Erro ao registrar devolutiva');
    } finally {
      setSavingFeedback(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Tratar Ocorrência"
      className="max-w-2xl"
    >
      <div className="space-y-6">
        {/* Alerta que originou */}
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm">
          <p className="font-medium text-orange-800">{notification.rule_name}</p>
          <p className="text-orange-700 mt-0.5">{notification.message}</p>
        </div>

        {/* Detalhes da ocorrência */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
            Ocorrência
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="font-medium">{occurrence.student?.full_name ?? '—'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>{formatDateTime(occurrence.occurrence_date)}</span>
            </div>
            {occurrenceType && (
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{occurrenceType.category}</span>
                {getSeverityBadge(occurrenceType.severity)}
              </div>
            )}
            {subcategory && (
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-muted-foreground shrink-0" />
                <span
                  className="px-2 py-0.5 rounded-full text-xs font-medium"
                  style={
                    subcategory.color
                      ? { backgroundColor: subcategory.color + '22', color: subcategory.color }
                      : {}
                  }
                >
                  {subcategory.name}
                </span>
              </div>
            )}
          </div>
          {occurrence.description && (
            <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg p-3">
              {occurrence.description}
            </p>
          )}
        </div>

        {/* Status */}
        <div className="space-y-2">
          <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
            Status
          </h3>
          <div className="flex items-center gap-3 flex-wrap">
            <OccurrenceStatusBadge status={currentStatus} />
            {savingStatus && <Spinner size="sm" />}
          </div>
          <div className="flex gap-2 flex-wrap">
            {OCCURRENCE_STATUS_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => handleStatusChange(opt.value)}
                disabled={savingStatus || opt.value === currentStatus}
                className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  opt.value === currentStatus
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background border-border hover:bg-muted'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Devolutivas */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
              Devolutivas
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFeedbackForm(v => !v)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Adicionar
            </Button>
          </div>

          {showFeedbackForm && (
            <div className="border rounded-lg p-4 space-y-3 bg-muted/20">
              <div className="space-y-1">
                <label className="text-sm font-medium">Tipo de ação</label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                  value={actionType}
                  onChange={e => setActionType(e.target.value as FeedbackActionType)}
                >
                  {FEEDBACK_ACTION_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Descrição (opcional)</label>
                <textarea
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none"
                  rows={3}
                  placeholder="Descreva a ação tomada..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="mark-resolved"
                  checked={markResolved}
                  onChange={e => setMarkResolved(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="mark-resolved" className="text-sm">
                  Marcar ocorrência como resolvida
                </label>
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFeedbackForm(false)}
                  disabled={savingFeedback}
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={handleAddFeedback}
                  disabled={savingFeedback}
                >
                  {savingFeedback ? <Spinner size="sm" /> : <ClipboardList className="h-4 w-4 mr-1" />}
                  Salvar devolutiva
                </Button>
              </div>
            </div>
          )}

          <OccurrenceFeedbackTimeline key={timelineKey} occurrenceId={occurrence.id} />
        </div>
      </div>
    </Modal>
  );
}
