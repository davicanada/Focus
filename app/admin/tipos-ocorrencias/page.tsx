'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, RefreshCcw, Check, X, Settings2 } from 'lucide-react';
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
import { OCCURRENCE_SEVERITIES, type User, type Institution, type OccurrenceType, type OccurrenceSubcategory } from '@/types';
import { EDUCATION_LEVELS, type EducationStage } from '@/lib/constants/education';

export default function TiposOcorrenciasPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentInstitution, setCurrentInstitution] = useState<Institution | null>(null);

  // Data
  const [occurrenceTypes, setOccurrenceTypes] = useState<OccurrenceType[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [institutionLevels, setInstitutionLevels] = useState<EducationStage[]>([]);
  const [subcategories, setSubcategories] = useState<OccurrenceSubcategory[]>([]);

  // Modal state - Tipos
  const [showModal, setShowModal] = useState(false);
  const [editingType, setEditingType] = useState<OccurrenceType | null>(null);
  const [saving, setSaving] = useState(false);

  // Inline subcategory creation
  const [creatingNewSub, setCreatingNewSub] = useState(false);
  const [newSubName, setNewSubName] = useState('');
  const [savingNewSub, setSavingNewSub] = useState(false);

  // Manage subcategories modal
  const [showManageSubModal, setShowManageSubModal] = useState(false);
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [editSubName, setEditSubName] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    category: '',
    severity: 'leve' as OccurrenceType['severity'],
    description: '',
    education_levels: [] as string[],
    subcategory_id: '' as string,
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
      await Promise.all([
        loadOccurrenceTypes(institution.id),
        loadInstitutionLevels(institution.id),
        loadSubcategories(institution.id),
      ]);
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
        .select('*, subcategory:occurrence_subcategories(id, name, color, is_default)')
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

  const loadInstitutionLevels = async (institutionId: string) => {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('classes')
        .select('education_level')
        .eq('institution_id', institutionId)
        .eq('is_active', true)
        .is('deleted_at', null);

      const unique = Array.from(new Set((data || []).map((c: { education_level: string }) => c.education_level).filter(Boolean))) as EducationStage[];
      setInstitutionLevels(unique);
    } catch (error) {
      console.error('Error loading institution levels:', error);
    }
  };

  const loadSubcategories = async (institutionId: string) => {
    try {
      const res = await fetch(`/api/occurrence-subcategories?institution_id=${institutionId}`);
      if (res.ok) {
        const data = await res.json();
        setSubcategories(data);
      }
    } catch (error) {
      console.error('Error loading subcategories:', error);
    }
  };

  const handleOpenModal = (type?: OccurrenceType) => {
    if (type) {
      setEditingType(type);
      setFormData({
        category: type.category,
        severity: type.severity,
        description: type.description || '',
        education_levels: type.education_levels || [],
        subcategory_id: type.subcategory_id || '',
      });
    } else {
      setEditingType(null);
      setFormData({
        category: '',
        severity: 'leve',
        description: '',
        education_levels: [],
        subcategory_id: '',
      });
    }
    setCreatingNewSub(false);
    setNewSubName('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.category.trim()) {
      toast.error('Nome do tipo é obrigatório');
      return;
    }

    if (!formData.subcategory_id) {
      toast.error('Subcategoria é obrigatória');
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();

      const typeData = {
        category: formData.category.trim(),
        severity: formData.severity,
        description: formData.description || null,
        education_levels: formData.education_levels.length > 0 ? formData.education_levels : null,
        subcategory_id: formData.subcategory_id || null,
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

  const handleCreateSubInline = async () => {
    if (!newSubName.trim()) {
      toast.error('Nome da subcategoria é obrigatório');
      return;
    }

    setSavingNewSub(true);
    try {
      const res = await fetch('/api/occurrence-subcategories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSubName.trim(),
          institution_id: currentInstitution?.id,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao criar');
      }
      const created = await res.json();
      toast.success('Subcategoria criada');
      setCreatingNewSub(false);
      setNewSubName('');
      await loadSubcategories(currentInstitution!.id);
      setFormData(prev => ({ ...prev, subcategory_id: created.id }));
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar subcategoria');
    } finally {
      setSavingNewSub(false);
    }
  };

  const handleSaveSubEdit = async (sub: OccurrenceSubcategory) => {
    if (!editSubName.trim()) {
      toast.error('Nome da subcategoria é obrigatório');
      return;
    }
    try {
      const res = await fetch(`/api/occurrence-subcategories/${sub.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editSubName.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao atualizar');
      }
      toast.success('Subcategoria atualizada');
      setEditingSubId(null);
      loadSubcategories(currentInstitution!.id);
      loadOccurrenceTypes(currentInstitution!.id);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar subcategoria');
    }
  };

  const handleDeleteSub = async (sub: OccurrenceSubcategory) => {
    if (!confirm(`Deseja excluir a subcategoria "${sub.name}"?`)) return;
    try {
      const res = await fetch(`/api/occurrence-subcategories/${sub.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao excluir');
      }
      toast.success('Subcategoria excluída');
      loadSubcategories(currentInstitution!.id);
      loadOccurrenceTypes(currentInstitution!.id);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao excluir subcategoria');
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
                      <TableHead>Subcategoria</TableHead>
                      <TableHead>Níveis</TableHead>
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
                        <TableCell>
                          {type.subcategory ? (
                            <Badge
                              variant="secondary"
                              className="text-white"
                              style={{ backgroundColor: type.subcategory.color || '#6B7280' }}
                            >
                              {type.subcategory.name}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {type.education_levels && type.education_levels.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {type.education_levels.map(level => (
                                <Badge key={level} variant="secondary">
                                  {EDUCATION_LEVELS[level as EducationStage]?.label || level}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <Badge variant="default">Geral</Badge>
                          )}
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

      {/* Manage Subcategories Modal */}
      <Modal
        isOpen={showManageSubModal}
        onClose={() => { setShowManageSubModal(false); setEditingSubId(null); }}
        title="Gerenciar Subcategorias"
        className="max-w-lg"
      >
        <div className="space-y-3">
          {subcategories.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">Nenhuma subcategoria cadastrada</p>
          ) : (
            <div className="space-y-1">
              {subcategories.map((sub) => (
                <div key={sub.id} className="flex items-center justify-between py-2 px-2 rounded hover:bg-gray-50">
                  {editingSubId === sub.id ? (
                    <div className="flex items-center gap-2 flex-1 mr-2">
                      <Input
                        value={editSubName}
                        onChange={(e) => setEditSubName(e.target.value)}
                        className="h-8 text-sm"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveSubEdit(sub);
                          if (e.key === 'Escape') setEditingSubId(null);
                        }}
                      />
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleSaveSubEdit(sub)}>
                        <Check className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingSubId(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{sub.name}</span>
                        {sub.is_default && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Padrão</Badge>
                        )}
                      </div>
                      {!sub.is_default && (
                        <div className="flex gap-0.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => { setEditingSubId(sub.id); setEditSubName(sub.name); }}
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleDeleteSub(sub)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
          <ModalFooter>
            <Button variant="outline" onClick={() => { setShowManageSubModal(false); setEditingSubId(null); }}>
              Fechar
            </Button>
          </ModalFooter>
        </div>
      </Modal>

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
            <Label htmlFor="subcategory_id">Subcategoria</Label>
            <Select
              id="subcategory_id"
              value={creatingNewSub ? '__new__' : formData.subcategory_id}
              onChange={(e) => {
                if (e.target.value === '__new__') {
                  setCreatingNewSub(true);
                  setNewSubName('');
                } else {
                  setCreatingNewSub(false);
                  setFormData({ ...formData, subcategory_id: e.target.value });
                }
              }}
            >
              <option value="" disabled>Selecione uma subcategoria...</option>
              <option value="__new__">+ Criar nova subcategoria</option>
              {subcategories.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name}{sub.is_default ? ' (Padrão)' : ''}
                </option>
              ))}
            </Select>
            {creatingNewSub && (
              <div className="flex items-center gap-2 mt-1">
                <Input
                  value={newSubName}
                  onChange={(e) => setNewSubName(e.target.value)}
                  placeholder="Nome da nova subcategoria"
                  className="h-8 text-sm"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateSubInline();
                    if (e.key === 'Escape') { setCreatingNewSub(false); setFormData({ ...formData, subcategory_id: '' }); }
                  }}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={handleCreateSubInline}
                  disabled={savingNewSub}
                >
                  {savingNewSub ? <Spinner size="sm" /> : <Check className="h-4 w-4 text-green-600" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => { setCreatingNewSub(false); setFormData({ ...formData, subcategory_id: '' }); }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            <button
              type="button"
              className="text-xs text-primary hover:underline cursor-pointer flex items-center gap-1"
              onClick={() => setShowManageSubModal(true)}
            >
              <Settings2 className="h-3 w-3" />
              Gerenciar subcategorias
            </button>
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

          <div className="space-y-2">
            <Label>Níveis de Ensino</Label>
            <p className="text-xs text-muted-foreground">
              Deixe vazio para disponibilizar em todos os níveis (Geral)
            </p>
            <div className="space-y-2 p-3 border rounded-md">
              {institutionLevels.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma turma cadastrada na instituição</p>
              ) : (
                institutionLevels.map(level => {
                  const checked = formData.education_levels.includes(level);
                  return (
                    <label key={level} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          setFormData(prev => ({
                            ...prev,
                            education_levels: checked
                              ? prev.education_levels.filter(l => l !== level)
                              : [...prev.education_levels, level],
                          }));
                        }}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm">{EDUCATION_LEVELS[level]?.label || level}</span>
                    </label>
                  );
                })
              )}
            </div>
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
