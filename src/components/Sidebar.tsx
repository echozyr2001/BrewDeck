import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "./ui/sidebar";
import { Package, Search } from "lucide-react";
import { FiGrid } from "react-icons/fi";
import { categories } from "../data/categories";
import { getCategoryIcon } from "../utils/categoryUtils";

interface SidebarProps {
  activeTab: "search" | "installed" | "discover";
  brewInfo: any;
  onTabChange: (tab: "search" | "installed" | "discover") => void;
  onSearchQueryChange: (query: string) => void;
  onSearch: () => void;
}

export function AppSidebar({
  activeTab,
  brewInfo,
  onTabChange,
  onSearchQueryChange,
  onSearch,
}: SidebarProps) {
  return (
    <Sidebar className="w-64 flex-shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col">
      <SidebarHeader className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-lg font-serif font-semibold text-sidebar-foreground">
              BrewDeck
            </h1>
            <p className="text-xs text-muted-foreground">
              Homebrew Package Manager
            </p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="flex-1 p-4 space-y-4">
        <div className="space-y-1">
          <Button
            onClick={() => onTabChange("installed")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
              activeTab === "installed"
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50"
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Installed</span>
            <Badge variant="secondary" className="ml-auto text-xs">
              {brewInfo?.total_installed || 0}
            </Badge>
          </Button>

          <Button
            onClick={() => onTabChange("search")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
              activeTab === "search"
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50"
            }`}
          >
            <Search className="w-4 h-4" />
            <span>Search</span>
          </Button>

          <Button
            onClick={() => onTabChange("discover")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
              activeTab === "discover"
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50"
            }`}
          >
            <FiGrid className="w-4 h-4" />
            <span>Discover</span>
          </Button>
        </div>
        <div className="space-y-3">
          <div className="px-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Discover
            </h3>
          </div>
          <div className="space-y-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => {
                  onTabChange("search");
                  onSearchQueryChange(category.id.toLowerCase());
                  onSearch();
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-sidebar-foreground hover:bg-sidebar-accent/50 group"
              >
                <div className="w-6 h-6 rounded-md bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors text-sm">
                  {getCategoryIcon(category.id)}
                </div>
                <div className="flex-1 text-left">
                  <div className="font-medium">{category.id}</div>
                  <div className="text-xs text-muted-foreground">
                    {category.casks.length} apps
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </SidebarContent>
      <SidebarFooter />
    </Sidebar>
  );
}
