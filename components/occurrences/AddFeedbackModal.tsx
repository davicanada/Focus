'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Modal, ModalFooter } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Spinner } from '@/components/ui/spinner';
import { FEEDBACK_ACTION_OPTIONS } from '@/lib/constants/feedback';
import { formatDateTime } from '@/lib/utils';
import type { FeedbackActionType, OccurrenceStatus } from '@/types';

interface FeedbackActionTypeFromDB {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  is_active: boolean;
  sort_order: number;
}

interface OccurrenceData {
  id: string;
  occurrence_date: string;
  status: OccurrenceStatus;
  student?: {
    full_name: string;
  };
  class_at_occurrence?: {
    name: string;
  };
  occurrence_type?: {
    category: string;
  };
  registered_by_user?: {
    full_name: string;
  };
}

interface AddFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  occurrence: OccurrenceData | null;
  onSuccess: () => void;
}

export function AddFeedbackModal({ isOpen, onClose, occurrence, onSuccess }: AddFeedbackModalProps) {
  const [actionType, setActionType] = useState<string>('');
  const [description, setDescription] = useState('');
  const [markResolved, setMarkResolved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionTypes, setActionTypes] = useState<FeedbackActionTypeFromDB[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(false);

  // Carregar tipos de ação do banco de dados
  useEffect(() => {
    const loadActionTypes = async () => {
      if (!isOpen) return;

      setLoadingTypes(true);
      try {
        const response = await fetch('/api/feedback-action-types');
        if (response.ok) {
          const data = await response.json();
          setActionTypes(data.data || []);
        }
      } catch (error) {
        console.error('Erro ao carregar tipos de ação:', error);
      } finally {
        setLoadingTypes(false);
      }
    };

    loadActionTypes();
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!occurrence || !actionType) {
      toast.error('Selecione o tipo de ação');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/occurrences/${occurrence.id}/feedbacks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action_type: actionType,
          description: description || null,
          mark_resolved: markResolved
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao registrar devolutiva');
      }

      toast.success('Devolutiva registrada com sucesso!');
      handleClose();
      onSuccess();
    } catch (error) {
      console.error('Erro ao registrar devolutiva:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao registrar devolutiva');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setActionType('');
    setDescription('');
    setMarkResolved(false);
    onClose();
  };

  if (!occurrence) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Registrar Devolutiva"
      className="max-w-lg"
    >
      <div className="space-y-4">
        {/* Informações da ocorrência */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-medium">{occurrence.occurrence_type?.category || 'Ocorrência'}</p>
              <p className="text-sm text-muted-foreground">
                {occurrence.student?.full_name}
                {occurrence.class_at_occurrence?.name && ` (${occurrence.class_at_occurrence.name})`}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              {formatDateTime(occurrence.occurrence_date)}
            </p>
          </div>
          {occurrence.registered_by_user?.full_name && (
            <p className="text-xs text-muted-foreground">
              Registrada por: {occurrence.registered_by_user.full_name}
            </p>
          )}
        </div>

        {/* Formulário */}
        <div className="space-y-2">
          <Label htmlFor="action_type">Tipo de Ação *</Label>
          {loadingTypes ? (
            <div className="flex items-center gap-2 py-2">
              <Spinner size="sm" />
              <span className="text-sm text-muted-foreground">Carregando tipos...</span>
            </div>
          ) : (
            <Select
              id="action_type"
              value={actionType}
              onChange={(e) => setActionType(e.target.value)}
            >
              <option value="">Selecione...</option>
              {/* Usar tipos do banco se disponíveis, senão usar constantes */}
              {actionTypes.length > 0
                ? actionTypes.filter(t => t.is_active).map((type) => (
                    <option key={type.id} value={type.name}>
                      {type.name}
                    </option>
                  ))
                : FEEDBACK_ACTION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.label}>
                      {option.label}
                    </option>
                  ))
              }
            </Select>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Descrição</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descreva o que foi feito..."
            rows={3}
          />
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="mark_resolved"
            checked={markResolved}
            onCheckedChange={(checked) => setMarkResolved(checked === true)}
          />
          <Label htmlFor="mark_resolved" className="text-sm font-normal cursor-pointer">
            Marcar ocorrência como &quot;Resolvida&quot;
          </Label>
        </div>

        <ModalFooter>
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !actionType}>
            {saving ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Salvando...
              </>
            ) : (
              'Salvar Devolutiva'
            )}
          </Button>
        </ModalFooter>
      </div>
    </Modal>
  );
}
