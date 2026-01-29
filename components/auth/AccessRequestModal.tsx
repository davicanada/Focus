'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Modal, ModalFooter } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { AddressAutocomplete, type AddressData } from '@/components/ui/address-autocomplete';
import { maskPhone, isValidBrazilianPhone, isValidEmail } from '@/lib/utils';
import type { AccessRequestType } from '@/types';

// Interface para instituições públicas (retornada pela API)
interface PublicInstitution {
  id: string;
  name: string;
  city: string;
  state_code: string;
}

interface AccessRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AccessRequestModal({ isOpen, onClose }: AccessRequestModalProps) {
  const [requestType, setRequestType] = useState<AccessRequestType>('professor');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [institutionId, setInstitutionId] = useState('');
  const [institutionName, setInstitutionName] = useState('');
  const [addressData, setAddressData] = useState<AddressData | null>(null);
  const [addressInput, setAddressInput] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [institutions, setInstitutions] = useState<PublicInstitution[]>([]);
  const [loadingInstitutions, setLoadingInstitutions] = useState(false);
  const [institutionsError, setInstitutionsError] = useState(false);

  // Validation error states
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');

  // Load institutions when modal opens
  useEffect(() => {
    if (isOpen && (requestType === 'admin_existing' || requestType === 'professor' || requestType === 'admin_viewer')) {
      loadInstitutions();
    }
  }, [isOpen, requestType]);

  // Reset errors when modal closes
  useEffect(() => {
    if (!isOpen) {
      setEmailError('');
      setPhoneError('');
    }
  }, [isOpen]);

  const loadInstitutions = async () => {
    setLoadingInstitutions(true);
    setInstitutionsError(false);
    try {
      const response = await fetch('/api/institutions/public');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao carregar instituições');
      }

      setInstitutions(result.data || []);
    } catch (error) {
      console.error('Error loading institutions:', error);
      setInstitutionsError(true);
    } finally {
      setLoadingInstitutions(false);
    }
  };

  const resetForm = () => {
    setRequestType('professor');
    setEmail('');
    setFullName('');
    setPhone('');
    setInstitutionId('');
    setInstitutionName('');
    setAddressData(null);
    setAddressInput('');
    setMessage('');
    setEmailError('');
    setPhoneError('');
    setInstitutionsError(false);
  };

  const handleAddressChange = (data: AddressData | null) => {
    setAddressData(data);
  };

  // Handle phone input with mask
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const maskedValue = maskPhone(e.target.value);
    setPhone(maskedValue);

    // Validate on change
    if (maskedValue && !isValidBrazilianPhone(maskedValue)) {
      setPhoneError('Telefone inválido. Use o formato (XX) XXXXX-XXXX');
    } else {
      setPhoneError('');
    }
  };

  // Handle email input with validation
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);

    // Only show error if user has typed something
    if (value && !isValidEmail(value)) {
      setEmailError('Email inválido');
    } else {
      setEmailError('');
    }
  };

  // Validate email on blur
  const handleEmailBlur = () => {
    if (email && !isValidEmail(email)) {
      setEmailError('Por favor, insira um email válido');
    }
  };

  // Validate phone on blur
  const handlePhoneBlur = () => {
    if (phone && !isValidBrazilianPhone(phone)) {
      setPhoneError('Por favor, insira um telefone válido com DDD');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!fullName.trim()) {
      toast.error('Preencha seu nome completo');
      return;
    }

    if (!email.trim()) {
      toast.error('Preencha seu email');
      return;
    }

    if (!isValidEmail(email)) {
      setEmailError('Por favor, insira um email válido');
      toast.error('Por favor, insira um email válido');
      return;
    }

    if (phone && !isValidBrazilianPhone(phone)) {
      setPhoneError('Por favor, insira um telefone válido com DDD');
      toast.error('Por favor, insira um telefone válido com DDD');
      return;
    }

    if (requestType === 'admin_new') {
      if (!institutionName) {
        toast.error('Preencha o nome da instituição');
        return;
      }
      if (!addressData) {
        toast.error('Selecione um endereço válido da lista de sugestões');
        return;
      }
    }

    if ((requestType === 'admin_existing' || requestType === 'professor' || requestType === 'admin_viewer') && !institutionId) {
      toast.error('Selecione uma instituição');
      return;
    }

    setIsLoading(true);

    try {
      // Clean phone number before sending (only digits)
      const cleanedPhone = phone ? phone.replace(/\D/g, '') : null;

      const requestBody: Record<string, unknown> = {
        email: email.trim().toLowerCase(),
        full_name: fullName.trim(),
        phone: cleanedPhone,
        request_type: requestType,
        message: message.trim() || null,
      };

      if (requestType === 'admin_new' && addressData) {
        requestBody.institution_name = institutionName.trim();
        requestBody.institution_full_address = addressData.fullAddress;
        requestBody.institution_street = addressData.street || null;
        requestBody.institution_number = addressData.number || null;
        requestBody.institution_neighborhood = addressData.neighborhood || null;
        requestBody.institution_city = addressData.city;
        requestBody.institution_state = addressData.stateCode; // Use stateCode (2 chars) instead of full state name
        requestBody.institution_state_code = addressData.stateCode;
        requestBody.institution_postal_code = addressData.postalCode || null;
        requestBody.institution_country = addressData.country;
        requestBody.institution_latitude = addressData.latitude || null;
        requestBody.institution_longitude = addressData.longitude || null;
      } else {
        requestBody.institution_id = institutionId;
      }

      const response = await fetch('/api/access-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao enviar solicitação');
      }

      toast.success('Solicitação enviada com sucesso! Aguarde a aprovação.');
      resetForm();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao enviar solicitação');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Solicitar Acesso"
      description="Preencha os dados para solicitar acesso ao sistema"
      className="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Request Type */}
        <div className="space-y-2">
          <Label htmlFor="requestType">Tipo de Solicitação</Label>
          <Select
            id="requestType"
            value={requestType}
            onChange={(e) => setRequestType(e.target.value as AccessRequestType)}
            disabled={isLoading}
          >
            <option value="professor">Professor em instituição existente</option>
            <option value="admin_existing">Administrador em instituição existente</option>
            <option value="admin_viewer">Visualizador em instituição existente</option>
            <option value="admin_new">Nova instituição + Administrador</option>
          </Select>
        </div>

        {/* Personal Info */}
        <div className="space-y-2">
          <Label htmlFor="fullName">Nome Completo *</Label>
          <Input
            id="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Seu nome completo"
            disabled={isLoading}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={handleEmailChange}
            onBlur={handleEmailBlur}
            placeholder="seu@email.com"
            disabled={isLoading}
            required
            className={emailError ? 'border-destructive' : ''}
          />
          {emailError && (
            <p className="text-xs text-destructive">{emailError}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Telefone</Label>
          <Input
            id="phone"
            type="tel"
            value={phone}
            onChange={handlePhoneChange}
            onBlur={handlePhoneBlur}
            placeholder="(11) 99999-9999"
            disabled={isLoading}
            className={phoneError ? 'border-destructive' : ''}
          />
          {phoneError ? (
            <p className="text-xs text-destructive">{phoneError}</p>
          ) : (
            <p className="text-xs text-muted-foreground">Formato: (XX) XXXXX-XXXX</p>
          )}
        </div>

        {/* Institution Selection (for existing institutions) */}
        {(requestType === 'admin_existing' || requestType === 'professor' || requestType === 'admin_viewer') && (
          <div className="space-y-2">
            <Label htmlFor="institutionId">Instituição *</Label>
            {institutionsError ? (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                <p>Erro ao carregar instituições.</p>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={loadInstitutions}
                  className="p-0 h-auto text-destructive underline"
                >
                  Tentar novamente
                </Button>
              </div>
            ) : (
              <Select
                id="institutionId"
                value={institutionId}
                onChange={(e) => setInstitutionId(e.target.value)}
                disabled={isLoading || loadingInstitutions}
              >
                <option value="">
                  {loadingInstitutions ? 'Carregando...' : 'Selecione uma instituição'}
                </option>
                {institutions.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.name} - {inst.city}/{inst.state_code}
                  </option>
                ))}
              </Select>
            )}
            {!loadingInstitutions && !institutionsError && institutions.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Nenhuma instituição cadastrada ainda.
              </p>
            )}
          </div>
        )}

        {/* New Institution Fields */}
        {requestType === 'admin_new' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="institutionName">Nome da Instituição *</Label>
              <Input
                id="institutionName"
                value={institutionName}
                onChange={(e) => setInstitutionName(e.target.value)}
                placeholder="Escola Municipal..."
                disabled={isLoading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="institutionAddress">Endereço da Instituição *</Label>
              <AddressAutocomplete
                value={addressInput}
                onChange={handleAddressChange}
                onInputChange={setAddressInput}
                placeholder="Digite o endereço e selecione da lista..."
                disabled={isLoading}
                required
                countryRestriction="br"
              />
              {addressData && (
                <div className="text-xs text-muted-foreground bg-muted p-2 rounded-md mt-2">
                  <p><strong>Endereço selecionado:</strong></p>
                  <p>{addressData.fullAddress}</p>
                  <p className="mt-1">
                    <strong>Cidade:</strong> {addressData.city} |
                    <strong> Estado:</strong> {addressData.state} ({addressData.stateCode})
                    {addressData.postalCode && <> | <strong>CEP:</strong> {addressData.postalCode}</>}
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Message */}
        <div className="space-y-2">
          <Label htmlFor="message">Mensagem (opcional)</Label>
          <Textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Informações adicionais..."
            disabled={isLoading}
            rows={3}
          />
        </div>

        <ModalFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading || !!emailError || !!phoneError}>
            {isLoading ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Enviando...
              </>
            ) : (
              'Enviar Solicitação'
            )}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
