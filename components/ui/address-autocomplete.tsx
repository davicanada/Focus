'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Input } from './input';
import { cn } from '@/lib/utils';

export interface AddressData {
  fullAddress: string;
  street?: string;
  number?: string;
  neighborhood?: string;
  city: string;
  state: string;
  stateCode: string;
  postalCode?: string;
  country: string;
  countryCode: string;
  latitude?: number;
  longitude?: number;
}

interface AddressAutocompleteProps {
  value?: string;
  onChange?: (address: AddressData | null) => void;
  onInputChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  countryRestriction?: string;
}

declare global {
  interface Window {
    google: typeof google;
    initGoogleMaps?: () => void;
  }
}

let isScriptLoaded = false;
let isScriptLoading = false;
const callbacks: (() => void)[] = [];

function loadGoogleMapsScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (isScriptLoaded && window.google?.maps?.places) {
      resolve();
      return;
    }

    if (isScriptLoading) {
      callbacks.push(() => resolve());
      return;
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      reject(new Error('Google Maps API key not found'));
      return;
    }

    isScriptLoading = true;

    window.initGoogleMaps = () => {
      isScriptLoaded = true;
      isScriptLoading = false;
      resolve();
      callbacks.forEach((cb) => cb());
      callbacks.length = 0;
    };

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGoogleMaps`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      isScriptLoading = false;
      reject(new Error('Failed to load Google Maps script'));
    };

    document.head.appendChild(script);
  });
}

function extractAddressComponents(place: google.maps.places.PlaceResult): AddressData | null {
  if (!place.address_components) return null;

  const components: Record<string, { long_name: string; short_name: string }> = {};

  place.address_components.forEach((component) => {
    component.types.forEach((type) => {
      components[type] = {
        long_name: component.long_name,
        short_name: component.short_name,
      };
    });
  });

  const city = components.administrative_area_level_2?.long_name ||
               components.locality?.long_name ||
               components.sublocality_level_1?.long_name || '';

  const state = components.administrative_area_level_1?.long_name || '';
  const stateCode = components.administrative_area_level_1?.short_name || '';

  if (!city || !state) return null;

  return {
    fullAddress: place.formatted_address || '',
    street: components.route?.long_name,
    number: components.street_number?.long_name,
    neighborhood: components.sublocality_level_1?.long_name || components.sublocality?.long_name,
    city,
    state,
    stateCode,
    postalCode: components.postal_code?.long_name,
    country: components.country?.long_name || 'Brasil',
    countryCode: components.country?.short_name || 'BR',
    latitude: place.geometry?.location?.lat(),
    longitude: place.geometry?.location?.lng(),
  };
}

export function AddressAutocomplete({
  value = '',
  onChange,
  onInputChange,
  placeholder = 'Digite o endereco...',
  className,
  disabled,
  required,
  countryRestriction = 'br',
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [inputValue, setInputValue] = useState(value);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const initAutocomplete = useCallback(async () => {
    if (!inputRef.current) return;

    try {
      await loadGoogleMapsScript();

      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }

      autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
        componentRestrictions: { country: countryRestriction },
        fields: ['address_components', 'formatted_address', 'geometry'],
        types: ['address'],
      });

      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current?.getPlace();

        if (place && place.address_components) {
          const addressData = extractAddressComponents(place);

          if (addressData) {
            setInputValue(addressData.fullAddress);
            onInputChange?.(addressData.fullAddress);
            onChange?.(addressData);
          }
        }
      });

      setIsLoading(false);
      setError(null);
    } catch (err) {
      setIsLoading(false);
      setError(err instanceof Error ? err.message : 'Erro ao carregar autocomplete');
      console.error('Error initializing autocomplete:', err);
    }
  }, [countryRestriction, onChange, onInputChange]);

  useEffect(() => {
    initAutocomplete();

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [initAutocomplete]);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onInputChange?.(newValue);

    // Clear the selected address if user is typing
    if (newValue !== value) {
      onChange?.(null);
    }
  };

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        placeholder={isLoading ? 'Carregando...' : placeholder}
        className={cn(
          isLoading && 'opacity-70',
          error && 'border-destructive',
          className
        )}
        disabled={disabled || isLoading}
        required={required}
        autoComplete="off"
      />
      {error && (
        <p className="text-xs text-destructive mt-1">{error}</p>
      )}
    </div>
  );
}
