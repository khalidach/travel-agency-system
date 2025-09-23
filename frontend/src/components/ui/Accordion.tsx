// frontend/src/components/ui/Accordion.tsx
import React, { useState, ReactNode } from "react";
import { ChevronDown } from "lucide-react";

interface AccordionProps {
  title: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
}

const Accordion = ({ title, children, actions }: AccordionProps) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800">
      <div
        className="flex items-center justify-between p-4 cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center">
          <ChevronDown
            className={`w-5 h-5 text-gray-500 dark:text-gray-400 transform transition-transform duration-300 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
          <div className="mx-3">{title}</div>
        </div>
        <div>{actions}</div>
      </div>
      <div
        className={`overflow-hidden transition-all duration-500 ease-in-out ${
          isOpen ? "max-h-[2000px]" : "max-h-0"
        }`}
      >
        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Accordion;
