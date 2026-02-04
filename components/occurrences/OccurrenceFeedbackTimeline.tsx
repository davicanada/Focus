'use client';

import { useState, useEffect } from 'react';
import {
  MessageCircle,
  Phone,
  AlertTriangle,
  FileText,
  ArrowRight,
  Building,
  Heart,
  UserX,
  Users,
  Eye,
  CheckCircle,
  MoreHorizontal,
} from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { FEEDBACK_ACTION_TYPES } from '@/lib/constants/feedback';
import { formatDateTime } from '@/lib/utils';
import type { FeedbackActionType } from '@/types';

interface FeedbackWithPerformer {
  id: string;
  action_type: FeedbackActionType;
  action_label: string;
  description: string | null;
  performed_at: string;
  performer: {
    id: string;
    full_name: string;
  } | null;
}

interface OccurrenceFeedbackTimelineProps {
  occurrenceId: string;
}

const ICON_MAP: Record<FeedbackActionType, React.ComponentType<{ className?: string }>> = {
  student_talk: MessageCircle,
  guardian_contact: Phone,
  verbal_warning: AlertTriangle,
  written_warning: FileText,
  coordination_referral: ArrowRight,
  direction_referral: Building,
  psychologist_referral: Heart,
  suspension: UserX,
  mediation: Users,
  observation: Eye,
  resolved: CheckCircle,
  other: MoreHorizontal,
};

export function OccurrenceFeedbackTimeline({ occurrenceId }: OccurrenceFeedbackTimelineProps) {
  const [feedbacks, setFeedbacks] = useState<FeedbackWithPerformer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadFeedbacks = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/occurrences/${occurrenceId}/feedbacks`);
        if (!response.ok) {
          throw new Error('Erro ao carregar devolutivas');
        }

        const data = await response.json();
        setFeedbacks(data.feedbacks || []);
      } catch (err) {
        console.error('Erro ao carregar feedbacks:', err);
        setError('Não foi possível carregar as devolutivas');
      } finally {
        setIsLoading(false);
      }
    };

    if (occurrenceId) {
      loadFeedbacks();
    }
  }, [occurrenceId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-500">
        {error}
      </div>
    );
  }

  if (feedbacks.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhuma devolutiva registrada ainda
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
        Devolutivas
      </h3>
      <div className="space-y-4">
        {feedbacks.map((feedback, index) => {
          const Icon = ICON_MAP[feedback.action_type] || MoreHorizontal;
          const isLast = index === feedbacks.length - 1;

          return (
            <div key={feedback.id} className="relative flex gap-4">
              {/* Linha conectora */}
              {!isLast && (
                <div className="absolute left-4 top-10 bottom-0 w-0.5 bg-gray-200" />
              )}

              {/* Ícone */}
              <div className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon className="h-4 w-4" />
              </div>

              {/* Conteúdo */}
              <div className="flex-1 pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">
                    {feedback.action_label || FEEDBACK_ACTION_TYPES[feedback.action_type]?.label}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-1">
                  {feedback.performer?.full_name || 'Usuário'} • {formatDateTime(feedback.performed_at)}
                </p>
                {feedback.description && (
                  <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 mt-2">
                    {feedback.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
