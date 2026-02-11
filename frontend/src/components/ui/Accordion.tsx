// frontend/src/components/ui/Accordion.tsx
import { useState, ReactNode } from "react";
import { ChevronDown } from "lucide-react";

interface AccordionProps {
  title: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
}

const Accordion = ({ title, children, actions }: AccordionProps) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="border border-border rounded-xl bg-muted/50">
      <div
        className="flex items-center justify-between p-4 cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center">
          <ChevronDown
            className={`w-5 h-5 text-muted-foreground transform transition-transform duration-300 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
          <div className="mx-3">{title}</div>
        </div>
        <div>{actions}</div>
      </div>
      <div
        className={`overflow-y-scroll transition-all duration-500 ease-in-out ${
          isOpen ? "max-h-[2000px]" : "max-h-0"
        }`}
      >
        <div className="p-6 border-t border-border">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Accordion;
