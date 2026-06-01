import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuthContext } from "./AuthContext";

interface BranchContextType {
  selectedBranchId: string; // "all" or string representation of branch ID
  setSelectedBranchId: (id: string) => void;
  isRestricted: boolean;
  userBranchId: number | null;
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

export const BranchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { state: authState } = useAuthContext();
  const user = authState.user;

  // Determine if the logged-in user is restricted to a branch
  const isEmployeeOrManager = user?.role === "employee" || user?.role === "manager";
  const userBranchId = user?.branchId || null;
  const isRestricted = isEmployeeOrManager && userBranchId !== null;

  const [selectedBranchId, setSelectedBranchIdState] = useState<string>(() => {
    if (isRestricted) {
      return String(userBranchId);
    }
    const saved = localStorage.getItem("selectedBranchId");
    return saved || "all";
  });

  useEffect(() => {
    if (isRestricted) {
      setSelectedBranchIdState(String(userBranchId));
    } else {
      const saved = localStorage.getItem("selectedBranchId");
      setSelectedBranchIdState(saved || "all");
    }
  }, [isRestricted, userBranchId]);

  const setSelectedBranchId = (id: string) => {
    if (isRestricted) return; // Cannot change if restricted
    setSelectedBranchIdState(id);
    localStorage.setItem("selectedBranchId", id);
  };

  return (
    <BranchContext.Provider value={{ selectedBranchId, setSelectedBranchId, isRestricted, userBranchId }}>
      {children}
    </BranchContext.Provider>
  );
};

export const useBranchContext = () => {
  const context = useContext(BranchContext);
  if (!context) {
    throw new Error("useBranchContext must be used within a BranchProvider");
  }
  return context;
};
