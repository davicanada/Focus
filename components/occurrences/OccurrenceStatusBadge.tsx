'use client';

import { Badge } from '@/components/ui/badge';
import { OCCURRENCE_STATUS } from '@/lib/constants/feedback';
import type { OccurrenceStatus } from '@/types';

interface OccurrenceStatusBadgeProps {
  status: OccurrenceStatus;
  className?: string;
}

export function OccurrenceStatusBadge({ status, className }: OccurrenceStatusBadgeProps) {
  const statusInfo = OCCURRENCE_STATUS[status] || OCCURRENCE_STATUS.pending;

  return (
    <Badge className={`${statusInfo.bgClass} ${statusInfo.textClass} ${className || ''}`}>
      {statusInfo.label}
    </Badge>
  );
}
