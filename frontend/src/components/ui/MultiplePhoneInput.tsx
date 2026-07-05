import { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface MultiplePhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  compact?: boolean;
}

export default function MultiplePhoneInput({
  value,
  onChange,
  compact = false,
}: MultiplePhoneInputProps) {
  const { t } = useTranslation();

  // Parse initial value from comma-separated string to array
  const parseNumbers = (val: string): string[] => {
    if (!val || val.trim() === "") return [""];
    return val.split(",").map((s) => s.trim());
  };

  const [numbers, setNumbers] = useState<string[]>(() => parseNumbers(value));

  // Sync internal state if the value is changed from outside (e.g., form reset or load)
  useEffect(() => {
    const parsed = parseNumbers(value);
    if (parsed.join(",") !== numbers.join(",")) {
      setNumbers(parsed);
    }
  }, [value]);

  const handleNumberChange = (index: number, val: string) => {
    // Strip commas to prevent issues with comma-separation
    const cleanVal = val.replace(/,/g, "");
    const updated = [...numbers];
    updated[index] = cleanVal;
    setNumbers(updated);

    // Filter out empty numbers before sending to parent form state
    const filtered = updated.map((n) => n.trim()).filter((n) => n !== "");
    onChange(filtered.join(", "));
  };

  const addPhoneField = () => {
    setNumbers([...numbers, ""]);
  };

  const removePhoneField = (index: number) => {
    const updated = numbers.filter((_, i) => i !== index);
    const finalNumbers = updated.length === 0 ? [""] : updated;
    setNumbers(finalNumbers);

    const filtered = finalNumbers.map((n) => n.trim()).filter((n) => n !== "");
    onChange(filtered.join(", "));
  };

  return (
    <div className="space-y-1.5 w-full">
      <div className="space-y-1.5">
        {numbers.map((num, index) => (
          <div key={index} className="flex items-center gap-1.5">
            <input
              type="tel"
              value={num}
              onChange={(e) => handleNumberChange(index, e.target.value)}
              placeholder={
                numbers.length > 1
                  ? `${t("phoneNumber")} ${index + 1}`
                  : t("phoneNumber")
              }
              className={`w-full border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                compact ? "px-2 py-1 text-xs" : "px-3 py-2 text-sm"
              }`}
            />
            {numbers.length > 1 && (
              <button
                type="button"
                onClick={() => removePhoneField(index)}
                className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                title={t("remove")}
              >
                <Trash2 className={`${compact ? "w-3.5 h-3.5" : "w-4 h-4"}`} />
              </button>
            )}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addPhoneField}
        className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors focus:outline-none py-0.5"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>{t("addPhoneNumber")}</span>
      </button>
    </div>
  );
}
