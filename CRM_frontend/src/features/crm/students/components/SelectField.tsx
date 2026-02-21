import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface SelectFieldProps {
  label: string;
  name: string;
  value: string | number | undefined;
  onChange: (value: string) => void;
  options: Array<{ id?: number; label: string; value: string | number }>;
  isLoading?: boolean;
  required?: boolean;
  placeholder?: string;
}

export const SelectField: React.FC<SelectFieldProps> = ({
  label,
  name,
  value,
  onChange,
  options,
  isLoading = false,
  required = false,
  placeholder = 'Select an option',
}) => {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <Select
        value={value?.toString() || ''}
        onValueChange={onChange}
        disabled={isLoading}
        required={required}
      >
        <SelectTrigger>
          <SelectValue placeholder={isLoading ? 'Loading...' : placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.id || option.value} value={option.value.toString()}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

interface DynamicSelectFieldProps {
  label: string;
  name: string;
  value: string | number | undefined;
  onChange: (value: string) => void;
  fetchOptions: () => Promise<Array<{ id?: number; label: string; value: string | number }>>;
  required?: boolean;
  placeholder?: string;
}

export const DynamicSelectField: React.FC<DynamicSelectFieldProps> = ({
  label,
  name,
  value,
  onChange,
  fetchOptions,
  required = false,
  placeholder = 'Select an option',
}) => {
  const [options, setOptions] = useState<Array<{ id?: number; label: string; value: string | number }>>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadOptions = async () => {
      setIsLoading(true);
      try {
        const data = await fetchOptions();
        setOptions(data);
      } catch (error) {
        console.error('Error loading options:', error);
        setOptions([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadOptions();
  }, [fetchOptions]);

  return (
    <SelectField
      label={label}
      name={name}
      value={value}
      onChange={onChange}
      options={options}
      isLoading={isLoading}
      required={required}
      placeholder={placeholder}
    />
  );
};
