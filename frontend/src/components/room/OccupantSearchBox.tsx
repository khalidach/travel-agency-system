// frontend/src/components/room/OccupantSearchBox.tsx
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Occupant } from "../../context/models";
import { useDebounce } from "../../hooks/useDebounce";
import { X, ArrowRight } from "lucide-react";
import * as api from "../../services/api";
import { useTranslation } from "react-i18next";

interface OccupantSearchBoxProps {
  programId: string;
  hotelName: string;
  assignedOccupant: Occupant | null;
  assignedIds: Set<number>;
  onAssign: (occupant: Occupant) => void;
  onUnassign: () => void;
  onMove: (occupant: Occupant) => void;
}

export default function OccupantSearchBox({
  programId,
  hotelName,
  assignedOccupant,
  assignedIds,
  onAssign,
  onUnassign,
  onMove,
}: OccupantSearchBoxProps) {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const debouncedSearchTerm = useDebounce(searchTerm, 700);

  const { data: searchResults = [] } = useQuery<Occupant[]>({
    queryKey: [
      "unassignedOccupantsSearch",
      programId,
      hotelName,
      debouncedSearchTerm,
    ],
    queryFn: () =>
      api.searchUnassignedOccupants(programId, hotelName, debouncedSearchTerm),
    enabled: !!debouncedSearchTerm && showDropdown && !assignedOccupant,
  });

  const finalResults = useMemo(() => {
    // Client-side filter to prevent showing people already assigned in the current view
    return searchResults.filter((occ) => !assignedIds.has(occ.id));
  }, [searchResults, assignedIds]);

  if (assignedOccupant) {
    return (
      <div className="flex items-center justify-between bg-muted p-2 rounded-lg border border-border">
        <span className="font-medium text-sm text-foreground">
          {assignedOccupant.clientName}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onMove(assignedOccupant)}
            className="p-1 text-primary hover:bg-background/50 rounded transition-colors"
            title={t("move") as string}
          >
            <ArrowRight size={16} />
          </button>
          <button
            onClick={onUnassign}
            className="p-1 text-destructive hover:bg-destructive/10 rounded transition-colors"
            title={t("unassign") as string}
          >
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onFocus={() => setShowDropdown(true)}
        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
        placeholder={t("searchPlaceholder") as string}
        className="w-full p-2 border border-input rounded-lg text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      />
      {showDropdown && finalResults.length > 0 && (
        <ul className="absolute z-20 w-full bg-popover border border-border rounded-lg mt-1 max-h-40 overflow-y-auto shadow-lg">
          {finalResults.map((occ) => (
            <li
              key={occ.id}
              onClick={() => {
                onAssign(occ);
                setSearchTerm("");
                setShowDropdown(false);
              }}
              className="px-3 py-2 hover:bg-accent hover:text-accent-foreground cursor-pointer text-sm text-popover-foreground"
            >
              {occ.clientName}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
