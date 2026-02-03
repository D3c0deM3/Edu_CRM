import { useEffect, useState } from 'react';

interface SelectFieldProps {
  label: string;
  name: string;
  value: any;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: Array<{ id?: number; label: string; value: any }>;
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
    <div className="form-group">
      <label>
        {label}
        {required && <span className="required-asterisk">*</span>}
      </label>
      <select
        name={name}
        value={value || ''}
        onChange={onChange}
        disabled={isLoading}
        required={required}
        className="form-select"
      >
        <option value="">{isLoading ? 'Loading...' : placeholder}</option>
        {options.map((option) => (
          <option key={option.id || option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

interface DynamicSelectFieldProps {
  label: string;
  name: string;
  value: any;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  fetchOptions: () => Promise<Array<{ id?: number; label: string; value: any }>>;
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
  const [options, setOptions] = useState<Array<{ id?: number; label: string; value: any }>>([]);
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
