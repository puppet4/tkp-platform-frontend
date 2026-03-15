import { useState } from "react";

interface FormInputProps {
  label: string;
  type?: "text" | "email" | "password" | "number";
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: "email" | "slug";
  disabled?: boolean;
  error?: string;
  helperText?: string;
}

export function FormInput({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  required = false,
  minLength,
  maxLength,
  pattern,
  disabled = false,
  error: externalError,
  helperText,
}: FormInputProps) {
  const [touched, setTouched] = useState(false);
  const [internalError, setInternalError] = useState<string | null>(null);

  const validate = (val: string) => {
    if (required && !val.trim()) {
      return `${label}不能为空`;
    }

    if (minLength && val.length < minLength) {
      return `${label}至少需要${minLength}个字符`;
    }

    if (maxLength && val.length > maxLength) {
      return `${label}不能超过${maxLength}个字符`;
    }

    if (pattern === "email" && val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      return "请输入有效的邮箱地址";
    }

    if (pattern === "slug" && val && !/^[\w\u4e00-\u9fff\u3400-\u4dbf-]+$/u.test(val)) {
      return "只能包含中文、字母、数字、下划线和连字符";
    }

    return null;
  };

  const handleBlur = () => {
    setTouched(true);
    const err = validate(value);
    setInternalError(err);
  };

  const handleChange = (val: string) => {
    onChange(val);
    if (touched) {
      const err = validate(val);
      setInternalError(err);
    }
  };

  const displayError = externalError || (touched ? internalError : null);

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
          displayError
            ? "border-red-500 focus:ring-red-500"
            : "border-gray-300 focus:ring-blue-500"
        } ${disabled ? "bg-gray-100 cursor-not-allowed" : ""}`}
      />
      {displayError && (
        <p className="text-sm text-red-500">{displayError}</p>
      )}
      {helperText && !displayError && (
        <p className="text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  );
}
