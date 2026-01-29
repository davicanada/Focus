'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
    ShieldAlert, Plus, Pencil, Trash2, Power, PowerOff,
    User, Users, School, AlertTriangle, Filter, Clock, Mail
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Modal, ModalFooter } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { createClient } from '@/lib/supabase/client';
import { getFromStorage, formatDate } from '@/lib/utils';
import type {
    User as UserType,
    Institution,
    AlertRule,
    AlertRuleFormData,
    AlertScopeType,
    AlertFilterType,
    AlertNotifyTarget,
    Class,
    Student,
    OccurrenceType
} from '@/types';

export function AlertRules() {
    // Data
    const [rules, setRules] = useState<AlertRule[]>([]);
    const [classes, setClasses] = useState<Class[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [occurrenceTypes, setOccurrenceTypes] = useState<OccurrenceType[]>([]);
    const [loadingRules, setLoadingRules] = useState(false);

    // Modal states
    const [showRuleModal, setShowRuleModal] = useState(false);
    const [editingRule, setEditingRule] = useState<AlertRule | null>(null);
    const [saving, setSaving] = useState(false);

    // Filtro de turma para selecao de aluno
    const [selectedClassForStudent, setSelectedClassForStudent] = useState<string>('');

    // Form state
    const [formData, setFormData] = useState<AlertRuleFormData>({
        name: '',
        description: '',
        scope_type: 'institution',
        filter_type: 'any',
        is_immediate: false,
        threshold_count: 3,
        threshold_period_days: 30,
        notify_target: 'self',
    });

    // Delete confirmation
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deletingRule, setDeletingRule] = useState<AlertRule | null>(null);

    useEffect(() => {
        const init = async () => {
            const institution = getFromStorage<Institution | null>('currentInstitution', null);
            if (institution) {
                await Promise.all([
                    loadRules(),
                    loadOptions(institution.id),
                ]);
            }
        };
        init();
    }, []);

    const loadRules = async () => {
        setLoadingRules(true);
        try {
            const response = await fetch('/api/alert-rules');
            if (response.ok) {
                const data = await response.json();
                setRules(data || []);
            }
        } catch (error) {
            console.error('Error loading rules:', error);
            toast.error('Erro ao carregar regras');
        } finally {
            setLoadingRules(false);
        }
    };

    const loadOptions = async (institutionId: string) => {
        try {
            const supabase = createClient();

            const [classesRes, studentsRes, typesRes] = await Promise.all([
                supabase.from('classes').select('*').eq('institution_id', institutionId).eq('is_active', true).is('deleted_at', null).order('name'),
                supabase.from('students').select('*, class:classes(id, name)').eq('institution_id', institutionId).eq('is_active', true).is('deleted_at', null).order('full_name'),
                supabase.from('occurrence_types').select('*').eq('institution_id', institutionId).eq('is_active', true).order('category'),
            ]);

            setClasses(classesRes.data || []);
            setStudents(studentsRes.data || []);
            setOccurrenceTypes(typesRes.data || []);
        } catch (error) {
            console.error('Error loading options:', error);
        }
    };

    const handleOpenCreateModal = () => {
        setEditingRule(null);
        setSelectedClassForStudent('');
        setFormData({
            name: '',
            description: '',
            scope_type: 'institution',
            filter_type: 'any',
            is_immediate: false,
            threshold_count: 3,
            threshold_period_days: 30,
            notify_target: 'self',
        });
        setShowRuleModal(true);
    };

    const handleOpenEditModal = (rule: AlertRule) => {
        setEditingRule(rule);
        // Se tem aluno, encontrar a turma dele
        if (rule.scope_student_id) {
            const student = students.find(s => s.id === rule.scope_student_id);
            setSelectedClassForStudent(student?.class_id || '');
        } else {
            setSelectedClassForStudent('');
        }
        setFormData({
            name: rule.name,
            description: rule.description || '',
            scope_type: rule.scope_type,
            scope_student_id: rule.scope_student_id,
            scope_class_id: rule.scope_class_id,
            filter_type: rule.filter_type,
            filter_occurrence_type_id: rule.filter_occurrence_type_id,
            filter_severity: rule.filter_severity,
            is_immediate: rule.is_immediate || false,
            threshold_count: rule.threshold_count,
            threshold_period_days: rule.threshold_period_days,
            notify_target: rule.notify_target || 'self',
        });
        setShowRuleModal(true);
    };

    const handleSaveRule = async () => {
        // Validation
        if (!formData.name.trim()) {
            toast.error('Nome é obrigatório');
            return;
        }
        if (formData.scope_type === 'student' && !formData.scope_student_id) {
            toast.error('Selecione um aluno');
            return;
        }
        if (formData.scope_type === 'class' && !formData.scope_class_id) {
            toast.error('Selecione uma turma');
            return;
        }
        if (formData.filter_type === 'occurrence_type' && !formData.filter_occurrence_type_id) {
            toast.error('Selecione um tipo de ocorrência');
            return;
        }
        if (formData.filter_type === 'severity' && !formData.filter_severity) {
            toast.error('Selecione uma severidade');
            return;
        }

        setSaving(true);
        try {
            const url = editingRule ? `/api/alert-rules/${editingRule.id}` : '/api/alert-rules';
            const method = editingRule ? 'PUT' : 'POST';

            // Ajustar dados para alerta imediato
            const dataToSend = {
                ...formData,
                threshold_count: formData.is_immediate ? 1 : formData.threshold_count,
                threshold_period_days: formData.is_immediate ? null : formData.threshold_period_days,
            };

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dataToSend),
            });

            if (response.ok) {
                toast.success(editingRule ? 'Regra atualizada!' : 'Regra criada!');
                setShowRuleModal(false);
                await loadRules();
            } else {
                const data = await response.json();
                toast.error(data.error || 'Erro ao salvar regra');
            }
        } catch (error) {
            console.error('Error saving rule:', error);
            toast.error('Erro ao salvar regra');
        } finally {
            setSaving(false);
        }
    };

    const handleToggleActive = async (rule: AlertRule) => {
        try {
            const response = await fetch(`/api/alert-rules/${rule.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_active: !rule.is_active }),
            });

            if (response.ok) {
                toast.success(rule.is_active ? 'Regra desativada' : 'Regra ativada');
                await loadRules();
            }
        } catch (error) {
            console.error('Error toggling rule:', error);
            toast.error('Erro ao atualizar regra');
        }
    };

    const handleDeleteRule = async () => {
        if (!deletingRule) return;

        try {
            const response = await fetch(`/api/alert-rules/${deletingRule.id}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                toast.success('Regra excluída');
                setShowDeleteModal(false);
                setDeletingRule(null);
                await loadRules();
            }
        } catch (error) {
            console.error('Error deleting rule:', error);
            toast.error('Erro ao excluir regra');
        }
    };

    const getScopeIcon = (scopeType: AlertScopeType) => {
        switch (scopeType) {
            case 'student': return <User className="h-4 w-4" />;
            case 'class': return <Users className="h-4 w-4" />;
            case 'institution': return <School className="h-4 w-4" />;
        }
    };

    const getScopeLabel = (rule: AlertRule) => {
        switch (rule.scope_type) {
            case 'student': {
                const studentName = rule.student?.full_name || 'Aluno';
                const className = rule.student?.class?.name || '';
                return className ? `${studentName} (${className})` : studentName;
            }
            case 'class': return rule.class?.name || 'Turma específica';
            case 'institution': return 'Toda a instituição';
        }
    };

    const getFilterLabel = (rule: AlertRule) => {
        switch (rule.filter_type) {
            case 'occurrence_type': return rule.occurrence_type?.category || 'Tipo específico';
            case 'severity': return `Severidade ${rule.filter_severity}`;
            case 'any': return 'Qualquer ocorrência';
        }
    };

    const getThresholdLabel = (rule: AlertRule) => {
        if (rule.is_immediate) {
            return 'Alerta imediato';
        }
        return `${rule.threshold_count}+ em ${rule.threshold_period_days} dias`;
    };

    const getNotifyTargetLabel = (target: AlertNotifyTarget) => {
        return target === 'all_admins' ? 'Todos admins e visualizadores' : 'Apenas criador';
    };

    const filteredStudents = selectedClassForStudent
        ? students.filter(s => s.class_id === selectedClassForStudent)
        : [];

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <ShieldAlert className="h-5 w-5" />
                        Configuração de Regras
                    </h2>
                    <p className="text-muted-foreground text-sm">
                        Gerencie as regras automáticas de alerta para ocorrências
                    </p>
                </div>
                <Button onClick={handleOpenCreateModal} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Regra
                </Button>
            </div>

            {/* Alert Rules Section */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Regras Existentes</CardTitle>
                    <CardDescription>
                        Lista de regras configuradas para esta instituição
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loadingRules ? (
                        <div className="flex justify-center py-8">
                            <Spinner size="lg" />
                        </div>
                    ) : rules.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>Nenhuma regra de alerta configurada.</p>
                            <p className="text-sm mt-2">
                                Crie uma regra para receber notificações automáticas.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {rules.map((rule) => (
                                <div
                                    key={rule.id}
                                    className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${rule.is_active
                                        ? 'bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800'
                                        : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 opacity-60'
                                        }`}
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="font-medium">{rule.name}</p>
                                            {rule.is_active ? (
                                                <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                                    Ativo
                                                </Badge>
                                            ) : (
                                                <Badge variant="secondary">Inativo</Badge>
                                            )}
                                            {rule.is_immediate && (
                                                <Badge variant="warning" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                                                    Imediato
                                                </Badge>
                                            )}
                                        </div>
                                        {rule.description && (
                                            <p className="text-sm text-muted-foreground mt-1">{rule.description}</p>
                                        )}
                                        <div className="flex flex-wrap gap-3 mt-3 text-sm text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                {getScopeIcon(rule.scope_type)}
                                                {getScopeLabel(rule)}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Filter className="h-4 w-4" />
                                                {getFilterLabel(rule)}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <AlertTriangle className="h-4 w-4" />
                                                {getThresholdLabel(rule)}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Mail className="h-4 w-4" />
                                                {getNotifyTargetLabel(rule.notify_target)}
                                            </span>
                                        </div>
                                        {rule.last_triggered_at && (
                                            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                Último disparo: {formatDate(rule.last_triggered_at)} ({rule.trigger_count}x)
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleToggleActive(rule)}
                                            title={rule.is_active ? 'Desativar' : 'Ativar'}
                                        >
                                            {rule.is_active ? (
                                                <PowerOff className="h-4 w-4" />
                                            ) : (
                                                <Power className="h-4 w-4" />
                                            )}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleOpenEditModal(rule)}
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                setDeletingRule(rule);
                                                setShowDeleteModal(true);
                                            }}
                                            className="text-red-600 hover:text-red-700"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Create/Edit Rule Modal */}
            <Modal
                isOpen={showRuleModal}
                onClose={() => setShowRuleModal(false)}
                title={editingRule ? 'Editar Regra de Alerta' : 'Nova Regra de Alerta'}
                description="Configure quando você deve ser notificado sobre padrões de ocorrências"
            >
                <div className="space-y-4">
                    {/* Name */}
                    <div className="space-y-2">
                        <Label htmlFor="rule-name">Nome da Regra *</Label>
                        <Input
                            id="rule-name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Ex: Atrasos recorrentes - João Silva"
                        />
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <Label htmlFor="rule-description">Descrição (opcional)</Label>
                        <Textarea
                            id="rule-description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Descreva o propósito desta regra"
                            rows={2}
                        />
                    </div>

                    <hr className="my-4" />

                    {/* Scope */}
                    <div className="space-y-2">
                        <Label>Quem monitorar *</Label>
                        <Select
                            value={formData.scope_type}
                            onChange={(e) => {
                                setFormData({
                                    ...formData,
                                    scope_type: e.target.value as AlertScopeType,
                                    scope_student_id: undefined,
                                    scope_class_id: undefined,
                                });
                                setSelectedClassForStudent('');
                            }}
                        >
                            <option value="institution">Toda a instituição</option>
                            <option value="class">Turma específica</option>
                            <option value="student">Aluno específico</option>
                        </Select>
                    </div>

                    {formData.scope_type === 'class' && (
                        <div className="space-y-2">
                            <Label>Turma *</Label>
                            <Select
                                value={formData.scope_class_id || ''}
                                onChange={(e) => setFormData({ ...formData, scope_class_id: e.target.value })}
                            >
                                <option value="">Selecione uma turma...</option>
                                {classes.map((c) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </Select>
                        </div>
                    )}

                    {formData.scope_type === 'student' && (
                        <>
                            <div className="space-y-2">
                                <Label>Turma do Aluno *</Label>
                                <Select
                                    value={selectedClassForStudent}
                                    onChange={(e) => {
                                        setSelectedClassForStudent(e.target.value);
                                        setFormData({ ...formData, scope_student_id: undefined });
                                    }}
                                >
                                    <option value="">Selecione a turma primeiro...</option>
                                    {classes.map((c) => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Aluno *</Label>
                                <Select
                                    value={formData.scope_student_id || ''}
                                    onChange={(e) => setFormData({ ...formData, scope_student_id: e.target.value })}
                                    disabled={!selectedClassForStudent}
                                >
                                    <option value="">
                                        {selectedClassForStudent ? 'Selecione um aluno...' : 'Selecione a turma primeiro'}
                                    </option>
                                    {filteredStudents.map((s) => (
                                        <option key={s.id} value={s.id}>{s.full_name}</option>
                                    ))}
                                </Select>
                                {selectedClassForStudent && filteredStudents.length === 0 && (
                                    <p className="text-sm text-muted-foreground">Nenhum aluno nesta turma</p>
                                )}
                            </div>
                        </>
                    )}

                    <hr className="my-4" />

                    {/* Filter */}
                    <div className="space-y-2">
                        <Label>Tipo de ocorrência *</Label>
                        <Select
                            value={formData.filter_type}
                            onChange={(e) => setFormData({
                                ...formData,
                                filter_type: e.target.value as AlertFilterType,
                                filter_occurrence_type_id: undefined,
                                filter_severity: undefined,
                            })}
                        >
                            <option value="any">Qualquer ocorrência</option>
                            <option value="occurrence_type">Tipo específico</option>
                            <option value="severity">Severidade específica</option>
                        </Select>
                    </div>

                    {formData.filter_type === 'occurrence_type' && (
                        <div className="space-y-2">
                            <Label>Tipo *</Label>
                            <Select
                                value={formData.filter_occurrence_type_id || ''}
                                onChange={(e) => setFormData({ ...formData, filter_occurrence_type_id: e.target.value })}
                            >
                                <option value="">Selecione um tipo...</option>
                                {occurrenceTypes.map((t) => (
                                    <option key={t.id} value={t.id}>{t.category} ({t.severity})</option>
                                ))}
                            </Select>
                        </div>
                    )}

                    {formData.filter_type === 'severity' && (
                        <div className="space-y-2">
                            <Label>Severidade *</Label>
                            <Select
                                value={formData.filter_severity || ''}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    filter_severity: e.target.value as 'leve' | 'media' | 'grave'
                                })}
                            >
                                <option value="">Selecione a severidade...</option>
                                <option value="leve">Leve</option>
                                <option value="media">Média</option>
                                <option value="grave">Grave</option>
                            </Select>
                        </div>
                    )}

                    <hr className="my-4" />

                    {/* Immediate Alert Checkbox */}
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="is_immediate"
                            checked={formData.is_immediate}
                            onCheckedChange={(checked) => setFormData({
                                ...formData,
                                is_immediate: checked === true,
                                threshold_count: checked ? 1 : 3,
                                threshold_period_days: checked ? null : 30,
                            })}
                        />
                        <Label htmlFor="is_immediate" className="cursor-pointer">
                            Alertar imediatamente (cada ocorrência gera um alerta)
                        </Label>
                    </div>

                    {/* Threshold (only if not immediate) */}
                    {!formData.is_immediate && (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="threshold-count">Quantidade mínima *</Label>
                                <Input
                                    id="threshold-count"
                                    type="number"
                                    min={1}
                                    value={formData.threshold_count}
                                    onChange={(e) => setFormData({ ...formData, threshold_count: parseInt(e.target.value) || 1 })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="threshold-days">Período (dias) *</Label>
                                <Input
                                    id="threshold-days"
                                    type="number"
                                    min={1}
                                    value={formData.threshold_period_days || 30}
                                    onChange={(e) => setFormData({ ...formData, threshold_period_days: parseInt(e.target.value) || 1 })}
                                />
                            </div>
                        </div>
                    )}

                    {!formData.is_immediate && (
                        <p className="text-sm text-muted-foreground">
                            Você será notificado quando houver <strong>{formData.threshold_count || 0}+</strong> ocorrências
                            nos últimos <strong>{formData.threshold_period_days || 0}</strong> dias.
                        </p>
                    )}

                    {formData.is_immediate && (
                        <p className="text-sm text-muted-foreground">
                            Você será notificado <strong>imediatamente</strong> sempre que uma ocorrência correspondente for registrada.
                        </p>
                    )}

                    <hr className="my-4" />

                    {/* Notify Target */}
                    <div className="space-y-2">
                        <Label>Enviar alerta por email para *</Label>
                        <Select
                            value={formData.notify_target}
                            onChange={(e) => setFormData({ ...formData, notify_target: e.target.value as AlertNotifyTarget })}
                        >
                            <option value="self">Apenas para mim</option>
                            <option value="all_admins">Todos os administradores e visualizadores</option>
                        </Select>
                    </div>
                </div>
                <ModalFooter>
                    <Button variant="outline" onClick={() => setShowRuleModal(false)}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSaveRule} disabled={saving}>
                        {saving && <Spinner size="sm" className="mr-2" />}
                        {editingRule ? 'Salvar' : 'Criar Regra'}
                    </Button>
                </ModalFooter>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                title="Excluir Regra"
                description={`Tem certeza que deseja excluir a regra "${deletingRule?.name}"? Esta acao nao pode ser desfeita.`}
            >
                <ModalFooter>
                    <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
                        Cancelar
                    </Button>
                    <Button variant="destructive" onClick={handleDeleteRule}>
                        Excluir
                    </Button>
                </ModalFooter>
            </Modal>
        </div>
    );
}
