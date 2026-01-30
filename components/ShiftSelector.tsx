'use client';

import { useState, useEffect } from 'react';
import { Clock, Sun, Sunset, Moon, CalendarDays } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

const SHIFT_CONFIG: Record<string, { label: string; icon: typeof Sun; color: string }> = {
  matutino: { label: 'Matutino', icon: Sun, color: 'text-amber-500' },
  vespertino: { label: 'Vespertino', icon: Sunset, color: 'text-orange-500' },
  noturno: { label: 'Noturno', icon: Moon, color: 'text-indigo-500' },
  integral: { label: 'Integral', icon: CalendarDays, color: 'text-emerald-500' },
};

interface ShiftSelectorProps {
  institutionId: string;
  institutionName?: string;
  onShiftSelected: (shift: string) => void;
}

export function ShiftSelector({ institutionId, institutionName, onShiftSelected }: ShiftSelectorProps) {
  const [availableShifts, setAvailableShifts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadShifts = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('classes')
        .select('shift')
        .eq('institution_id', institutionId)
        .eq('is_active', true)
        .is('deleted_at', null);

      if (data) {
        const unique = Array.from(new Set(data.map((c: { shift: string | null }) => c.shift?.toLowerCase()).filter(Boolean))) as string[];
        // Ordenar: matutino, vespertino, noturno, integral
        const order = ['matutino', 'vespertino', 'noturno', 'integral'];
        unique.sort((a, b) => order.indexOf(a) - order.indexOf(b));

        if (unique.length <= 1) {
          // Apenas 1 turno, selecionar automaticamente
          onShiftSelected(unique[0] || 'all');
          return;
        }

        setAvailableShifts(unique);
      }
      setLoading(false);
    };

    loadShifts();
  }, [institutionId, onShiftSelected]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <Clock className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Selecione o Turno</h1>
          {institutionName && (
            <p className="text-muted-foreground text-sm">{institutionName}</p>
          )}
          <p className="text-muted-foreground">
            Em qual turno deseja registrar ocorrencias?
          </p>
        </div>

        <div className="grid gap-3">
          {availableShifts.map((shift) => {
            const config = SHIFT_CONFIG[shift];
            if (!config) return null;
            const Icon = config.icon;

            return (
              <Card
                key={shift}
                className="cursor-pointer hover:border-primary hover:shadow-md transition-all"
                onClick={() => onShiftSelected(shift)}
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <div className={cn('rounded-full bg-muted p-3', config.color)}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-semibold text-lg">{config.label}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
