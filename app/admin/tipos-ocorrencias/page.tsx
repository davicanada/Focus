'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, RefreshCcw } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Modal, ModalFooter } from '@/components/ui/modal';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';
import { createClient } from '@/lib/supabase/client';
import { getFromStorage, removeFromStorage } from '@/lib/utils';
import { OCCURRENCE_SEVERITIES, type User, type Institution, type OccurrenceType } from '@/types';

export default function TiposOcorrenciasPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentInstitution, setCurrentInstitution] = useState<Institution | null>(null);

  // Data
  const [occurrenceTypes, setOccurrenceTypes] = useState<OccurrenceType[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(false);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingType, setEditingType] = useState<OccurrenceType | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    category: '',
    severity: 'leve' as OccurrenceType['severity'],
    description: '',
  });

  useEffect(() => {
    const checkAuth = async () => {
      const role = getFromStorage('currentRole', null);
      const user = getFromStorage<User | null>('currentUser', null);
      const institution = getFromStorage<Institution | null>('currentInstitution', null);

      if (role !== 'admin' || !user || !institution) {
        router.push('/');
        return;
      }

      setCurrentUser(user);
      setCurrentInstitution(institution);
      await loadOccurrenceTypes(institution.id);
      setIsLoading(false);
    };

    checkAuth();
  }, [router]);

  const loadOccurrenceTypes = async (institutionId: string) => {
    setLoadingTypes(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('occurrence_types')
        .select('*')
        .eq('institution_id', institutionId)
        .eq('is_active', true)
        .order('category');

      if (error) throw error;
      setOccurrenceTypes(data || []);
    } catch (error) {
      console.error('Error loading occurrence types:', error);
      toast.error('Erro ao carregar tipos de ocorrência');
    } finally {
      setLoadingTypes(false);
    }
  };

  const handleOpenModal = (type?: OccurrenceType) => {
    if (type) {
      setEditingType(type);
      setFormData({
        category: type.category,
        severity: type.severity,
        description: type.description || '',
      });
    } else {
      setEditingType(null);
      setFormData({
        category: '',
        severity: 'leve',
        description: '',
      });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.category.trim()) {
      toast.error('Nome do tipo é obrigatório');
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();

      const typeData = {
        category: formData.category.trim(),
        severity: formData.severity,
        description: formData.description || null,
        institution_id: currentInstitution?.id,
        is_active: true,
      };

      if (editingType) {
        const { error } = await supabase
          .from('occurrence_types')
          .update(typeData)
          .eq('id', editingType.id);

        if (error) throw error;
        toast.success('Tipo de ocorrência atualizado');
      } else {
        const { error } = await supabase
          .from('occurrence_types')
          .insert(typeData);

        if (error) throw error;
        toast.success('Tipo de ocorrência criado');
      }

      setShowModal(false);
      loadOccurrenceTypes(currentInstitution!.id);
    } catch (error) {
      console.error('Error saving occurrence type:', error);
      toast.error('Erro ao salvar tipo de ocorrência');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (type: OccurrenceType) => {
    if (!confirm(`Deseja excluir "${type.category}"?`)) return;

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('occurrence_types')
        .update({ is_active: false })
        .eq('id', type.id);

      if (error) throw error;
      toast.success('Tipo de ocorrência excluído');
      loadOccurrenceTypes(currentInstitution!.id);
    } catch (error) {
      console.error('Error deleting occurrence type:', error);
      toast.error('Erro ao excluir tipo de ocorrência');
    }
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    removeFromStorage('currentRole');
    removeFromStorage('currentUser');
    removeFromStorage('currentInstitution');
    removeFromStorage('userInstitutions');
    router.push('/');
  };

  const getSeverityBadge = (severity: OccurrenceType['severity']) => {
    const config = OCCURRENCE_SEVERITIES[severity];
    const variants: Record<string, 'default' | 'destructive' | 'success' | 'warning' | 'mild' | 'secondary'> = {
      yellow: 'mild',
      orange: 'warning',
      red: 'destructive',
    };
    return <Badge variant={variants[config.color] || 'secondary'}>{config.label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <DashboardLayout
      userName={currentUser?.full_name || ''}
      userEmail={currentUser?.email || ''}
      currentRole="admin"
      currentInstitution={currentInstitution || undefined}
      onSignOut={handleSignOut}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Tipos de Ocorrências</h1>
            <p className="text-muted-foreground">
              Configure os tipos de ocorrências disponíveis
            </p>
          </div>
          <Button onClick={() => handleOpenModal()}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Tipo
          </Button>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Tipos Cadastrados</CardTitle>
              <CardDescription>
                {occurrenceTypes.length} tipo(s) de ocorrência
              </CardDescription>
            </div>
            <Button variant="outline" size="icon" onClick={() => loadOccurrenceTypes(currentInstitution!.id)}>
              <RefreshCcw className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {loadingTypes ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : occurrenceTypes.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum tipo de ocorrência cadastrado
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Severidade</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {occurrenceTypes.map((type) => (
                      <TableRow key={type.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{type.category}</p>
                            {type.description && (
                              <p className="text-sm text-muted-foreground">{type.description}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getSeverityBadge(type.severity)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenModal(type)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(type)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingType ? 'Editar Tipo de Ocorrência' : 'Novo Tipo de Ocorrência'}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="category">Nome *</Label>
            <Input
              id="category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              placeholder="Ex: Atraso, Falta de material..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="severity">Severidade *</Label>
            <Select
              id="severity"
              value={formData.severity}
              onChange={(e) => setFormData({ ...formData, severity: e.target.value as OccurrenceType['severity'] })}
            >
              {Object.entries(OCCURRENCE_SEVERITIES).map(([key, value]) => (
                <option key={key} value={key}>{value.label}</option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descrição detalhada do tipo de ocorrência..."
              rows={3}
            />
          </div>

          <ModalFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Salvando...
                </>
              ) : (
                'Salvar'
              )}
            </Button>
          </ModalFooter>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
