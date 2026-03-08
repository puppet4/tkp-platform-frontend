import { type LucideIcon } from "lucide-react";

interface Tab {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface PageTabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (id: string) => void;
}

export function PageTabs({ tabs, activeTab, onTabChange }: PageTabsProps) {
  return (
    <div className="flex items-center gap-1 mb-5 border-b border-border overflow-x-auto">
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => onTabChange(t.id)}
          className={`flex items-center gap-1.5 px-3 py-2.5 text-sm transition-colors relative whitespace-nowrap ${
            activeTab === t.id ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <t.icon className="h-3.5 w-3.5" />
          {t.label}
          {activeTab === t.id && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
          )}
        </button>
      ))}
    </div>
  );
}
