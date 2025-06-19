import React, { createContext, useContext, useReducer, ReactNode } from "react";
import type { Program, ProgramPricing } from "./models";

interface ProgramsState {
  programs: Program[];
  programPricing: ProgramPricing[];
  loading: boolean;
}

type ProgramsAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_PROGRAMS"; payload: Program[] }
  | { type: "ADD_PROGRAM"; payload: Program }
  | { type: "UPDATE_PROGRAM"; payload: Program }
  | { type: "DELETE_PROGRAM"; payload: number }
  | { type: "SET_PROGRAM_PRICING"; payload: ProgramPricing[] }
  | { type: "ADD_PROGRAM_PRICING"; payload: ProgramPricing }
  | { type: "UPDATE_PROGRAM_PRICING"; payload: ProgramPricing }
  | { type: "DELETE_PROGRAM_PRICING"; payload: number };

const initialState: ProgramsState = {
  programs: [],
  programPricing: [],
  loading: false,
};

function programsReducer(
  state: ProgramsState,
  action: ProgramsAction
): ProgramsState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    case "SET_PROGRAMS":
      return { ...state, programs: action.payload };
    case "ADD_PROGRAM":
      return { ...state, programs: [...state.programs, action.payload] };
    case "UPDATE_PROGRAM":
      return {
        ...state,
        programs: state.programs.map((p) =>
          p.id === action.payload.id ? action.payload : p
        ),
      };
    case "DELETE_PROGRAM":
      return {
        ...state,
        programs: state.programs.filter((p) => p.id !== action.payload),
      };
    case "SET_PROGRAM_PRICING":
      return { ...state, programPricing: action.payload };
    case "ADD_PROGRAM_PRICING":
      return {
        ...state,
        programPricing: [...state.programPricing, action.payload],
      };
    case "UPDATE_PROGRAM_PRICING":
      return {
        ...state,
        programPricing: state.programPricing.map((p) =>
          p.id === action.payload.id ? action.payload : p
        ),
      };
    case "DELETE_PROGRAM_PRICING":
      return {
        ...state,
        programPricing: state.programPricing.filter(
          (p) => p.id !== action.payload
        ),
      };
    default:
      return state;
  }
}

const ProgramsContext = createContext<{
  state: ProgramsState;
  dispatch: React.Dispatch<ProgramsAction>;
} | null>(null);

export function ProgramsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(programsReducer, initialState);

  return (
    <ProgramsContext.Provider value={{ state, dispatch }}>
      {children}
    </ProgramsContext.Provider>
  );
}

export function useProgramsContext() {
  const context = useContext(ProgramsContext);
  if (!context) {
    throw new Error(
      "useProgramsContext must be used within a ProgramsProvider"
    );
  }
  return context;
}
