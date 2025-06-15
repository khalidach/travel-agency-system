import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2, MapPin, Hotel, DollarSign } from "lucide-react";
import type { Program, Package, RoomPrice } from "../context/AppContext";

interface ProgramFormProps {
  program?: Program | null;
  onSave: (program: Program) => void;
  onCancel: () => void;
}

interface CityData {
  name: string;
  nights: number;
}

interface FormData {
  name: string;
  type: "Hajj" | "Umrah" | "Tourism";
  duration: number;
  cities: CityData[];
  packages: Package[];
}

export default function ProgramForm({ program, onSave, onCancel }: ProgramFormProps) {
  const { t } = useTranslation();

  const [formData, setFormData] = useState<FormData>({
    name: "", type: "Umrah", duration: 7,
    cities: [{ name: "", nights: 1 }],
    packages: [{ name: "Standard", hotels: {}, prices: [] }],
  });

  const [availableRoomTypes] = useState(["Double", "Triple", "Quad", "Quintuple"]);

  useEffect(() => {
    if (program) {
      setFormData({
        name: program.name, type: program.type, duration: program.duration,
        cities: program.cities, packages: program.packages,
      });
    }
  }, [program]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const programData = program ? { ...formData, id: program.id } : formData;
    onSave(programData as Program);
  };
  
  // No changes needed for the rest of the form logic (addCity, updatePackageName, etc.)
  // ...

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
       {/* All JSX is the same as your original file, no changes needed here */}
    </form>
  );
}
