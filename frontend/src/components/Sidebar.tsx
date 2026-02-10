// frontend/src/components/Sidebar.tsx
import React, { useState, useEffect, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuthContext } from "../context/AuthContext";
import { User } from "../context/models";
import {
  BarChart3,
  Package,
  Calendar,
  TrendingUp,
  Plane,
  Users,
  Crown,
  BedDouble,
  FileText,
  Settings,
  Layers,
  ChevronDown,
  ConciergeBell,
  DollarSign,
  Lock,
  BarChart2,
  ShipWheel,
} from "lucide-react";

type MenuItem = {
  key: string;
  path?: string;
  icon: React.ElementType;
  roles: string[];
  children?: MenuItem[];
  accessCheck?: (user: User | null) => boolean;
  isDisabled?: boolean;
  new?: boolean;
};

const allMenuItems: MenuItem[] = [
  {
    key: "owner",
    path: "/owner",
    icon: Crown,
    roles: ["owner"],
  },
  {
    key: "agencyReports",
    path: "/owner/reports",
    icon: BarChart2,
    roles: ["owner"],
  },
  {
    key: "tiers",
    path: "/tiers",
    icon: Layers,
    roles: ["owner"],
  },
  {
    key: "dashboard",
    path: "/dashboard",
    icon: BarChart3,
    roles: ["admin", "manager", "employee"],
  },
  {
    key: "gestionPrograms",
    icon: Package,
    roles: ["admin", "manager", "employee"],
    children: [
      {
        key: "programs",
        path: "/programs",
        icon: Package,
        roles: ["admin", "manager", "employee"],
      },
      {
        key: "programPricing",
        path: "/program-pricing",
        icon: ShipWheel,
        roles: ["admin", "manager"],
      },
      {
        key: "programCosting",
        path: "/program-costing",
        icon: DollarSign,
        roles: ["admin"],
        new: true,
        accessCheck: (user: User | null) => {
          if (!user) return false;
          if (typeof user.limits?.programCosts === "boolean")
            return user.limits.programCosts;
          if (typeof user.tierLimits?.programCosts === "boolean")
            return user.tierLimits.programCosts;
          return false;
        },
      },
      {
        key: "booking",
        path: "/booking",
        icon: Calendar,
        roles: ["admin", "manager", "employee"],
      },
      {
        key: "roomManagement",
        path: "/room-management",
        icon: BedDouble,
        roles: ["admin", "manager", "employee"],
      },
      {
        key: "profitReport",
        path: "/profit-report",
        icon: TrendingUp,
        roles: ["admin"],
        accessCheck: (user: User | null) => {
          if (!user) return false;
          if (typeof user.limits?.profitReport === "boolean")
            return user.limits.profitReport;
          if (typeof user.tierLimits?.profitReport === "boolean")
            return user.tierLimits.profitReport;
          return false;
        },
      },
    ],
  },
  {
    key: "dailyServices",
    icon: ConciergeBell,
    roles: ["admin", "manager", "employee"],
    accessCheck: (user) => {
      if (!user) return false;
      if (typeof user.limits?.dailyServices === "boolean")
        return user.limits.dailyServices;
      if (typeof user.tierLimits?.dailyServices === "boolean")
        return user.tierLimits.dailyServices;
      return false;
    },
    children: [
      {
        key: "manageDailyServices",
        path: "/daily-services",
        icon: ConciergeBell,
        roles: ["admin", "manager", "employee"],
      },
      {
        key: "dailyServiceReport",
        path: "/daily-services-report",
        icon: TrendingUp,
        roles: ["admin", "manager"],
      },
    ],
  },
  {
    key: "facturation",
    path: "/facturation",
    icon: FileText,
    roles: ["admin", "manager", "employee"],
    accessCheck: (user) => {
      if (!user) return false;
      if (typeof user.limits?.invoicing === "boolean")
        return user.limits.invoicing;
      if (typeof user.tierLimits?.invoicing === "boolean")
        return user.tierLimits.invoicing;
      if (user.tierId) return user.tierId !== 1;
      return false;
    },
  },
  {
    key: "employees",
    path: "/employees",
    icon: Users,
    roles: ["admin"],
  },
  {
    key: "settings",
    path: "/settings",
    icon: Settings,
    roles: ["admin"],
  },
];

const MenuItemContent = ({
  item,
  isActive,
}: {
  item: MenuItem;
  isActive: boolean;
}) => {
  const { t } = useTranslation();
  const Icon = item.icon;
  return (
    <>
      <Icon
        className={`mx-3 h-5 w-5 transition-colors ${
          isActive && !item.isDisabled
            ? "text-primary"
            : item.isDisabled
              ? "text-muted-foreground/50"
              : "text-muted-foreground group-hover:text-foreground"
        }`}
      />
      <span className={`${item.isDisabled ? "text-muted-foreground/50" : ""}`}>
        {t(item.key)}
      </span>
      {item.isDisabled && (
        <Lock className="ml-auto mr-3 h-4 w-4 text-muted-foreground/50" />
      )}
    </>
  );
};

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = useAuthContext();
  const user = state.user;
  const userRole = user?.role;
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const menuItems = useMemo(() => {
    const processItems = (items: MenuItem[]): MenuItem[] => {
      return items
        .filter((item) => userRole && item.roles.includes(userRole))
        .map((item) => {
          const isDisabled = item.accessCheck ? !item.accessCheck(user) : false;
          if (item.children) {
            const processedChildren = processItems(item.children);
            const areAllChildrenDisabled =
              processedChildren.length > 0 &&
              processedChildren.every((child) => child.isDisabled);
            return {
              ...item,
              children: processedChildren,
              isDisabled: isDisabled || areAllChildrenDisabled,
            };
          }
          return { ...item, isDisabled };
        });
    };
    return processItems(allMenuItems);
  }, [userRole, user]);

  useEffect(() => {
    const activeParent = menuItems.find((item) =>
      item.children?.some((child) => location.pathname.startsWith(child.path!)),
    );
    if (activeParent) {
      setOpenMenu(activeParent.key);
    }
  }, [location.pathname, menuItems]);

  const handleMenuClick = (item: MenuItem) => {
    if (item.isDisabled) return;
    if (item.children) {
      setOpenMenu(openMenu === item.key ? null : item.key);
    } else if (item.path) {
      navigate(item.path);
    }
  };

  return (
    <div className="w-64 bg-card shadow-xl border-r border-border flex flex-col transition-colors duration-300">
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-lg">
            <Plane className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-card-foreground">
              TravelPro
            </h1>
            <p className="text-sm text-muted-foreground">Management System</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            if (item.children) {
              const isParentActive = item.children.some((child) =>
                location.pathname.startsWith(child.path!),
              );
              const isOpen = openMenu === item.key;
              return (
                <li key={item.key}>
                  <button
                    onClick={() => handleMenuClick(item)}
                    className={`group flex items-center justify-between w-full px-1 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                      isParentActive && !isOpen && !item.isDisabled
                        ? "bg-primary/10 text-primary shadow-sm"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    } ${
                      item.isDisabled ? "cursor-not-allowed opacity-60" : ""
                    }`}
                  >
                    <div className="flex items-center">
                      <MenuItemContent item={item} isActive={isParentActive} />
                    </div>
                    {!item.isDisabled && (
                      <ChevronDown
                        className={`w-5 h-5 transition-transform duration-300 ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                    )}
                  </button>
                  <div
                    className={`overflow-hidden transition-[max-height] duration-500 ease-in-out ${
                      isOpen ? "max-h-96" : "max-h-0"
                    }`}
                  >
                    <ul className="pl-8 pt-2 space-y-1">
                      {item.children.map((child) => {
                        const isChildActive = location.pathname.startsWith(
                          child.path!,
                        );
                        return (
                          <li key={child.key}>
                            <Link
                              to={child.isDisabled ? "#" : child.path!}
                              className={`relative group flex items-center px-1 py-2 text-sm font-medium rounded-xl transition-all duration-200 ${
                                isChildActive && !child.isDisabled
                                  ? "text-primary bg-primary/10"
                                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
                              } ${
                                child.isDisabled
                                  ? "cursor-not-allowed opacity-60"
                                  : ""
                              }`}
                              onClick={(e) =>
                                child.isDisabled && e.preventDefault()
                              }
                            >
                              <MenuItemContent
                                item={child}
                                isActive={isChildActive}
                              />
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </li>
              );
            }
            const isActive = location.pathname === item.path;
            return (
              <li key={item.key}>
                <Link
                  to={item.isDisabled ? "#" : item.path!}
                  onClick={(e) => item.isDisabled && e.preventDefault()}
                  className={`group flex items-center px-1 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                    isActive && !item.isDisabled
                      ? "bg-primary/10 text-primary shadow-sm"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  } ${item.isDisabled ? "cursor-not-allowed opacity-60" : ""}`}
                >
                  <MenuItemContent item={item} isActive={isActive} />
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-border">
        <div className="text-xs text-muted-foreground text-center">
          © 2025 TravelPro System
        </div>
      </div>
    </div>
  );
}
