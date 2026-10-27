import { Link, useRouterState } from "@tanstack/react-router";
import {
  BookOpenCheck,
  FileSearch,
  FileStack,
  LayoutDashboard,
  ListChecks,
  MessagesSquare,
  ScrollText,
  Search,
  Settings,
  Sparkles,
  Star,
} from "lucide-react";
import { Logo } from "@/components/logo";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const primaryNavItems = [
  { title: "Home", url: "/app", icon: LayoutDashboard, exact: true },
  { title: "Library", url: "/app/materials", icon: BookOpenCheck },
  { title: "Ask AI", url: "/app/assistant", icon: MessagesSquare },
  { title: "PYQ Analyzer", url: "/app/analysis", icon: FileSearch },
  { title: "Quiz", url: "/app/quiz", icon: ListChecks },
];

const systemItems = [{ title: "Settings", url: "/app/settings", icon: Settings }];

export function AppSidebar() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  const renderGroup = (label: string, items: typeof primaryNavItems) => (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const active = item.exact ? pathname === item.url : pathname.startsWith(item.url);
            return (
              <SidebarMenuItem key={item.url}>
                <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                  <Link to={item.url}>
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b px-3 py-4">
        <Link to="/" className="group-data-[collapsible=icon]:hidden">
          <Logo />
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {renderGroup("Navigation", primaryNavItems)}
        {renderGroup("System", systemItems)}
      </SidebarContent>
      <SidebarFooter className="border-t p-3 group-data-[collapsible=icon]:hidden">
        <div className="rounded-xl bg-accent p-3 text-accent-foreground">
          <p className="flex items-center gap-2 text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5" /> Document-grounded AI
          </p>
          <p className="mt-1 text-xs opacity-80">
            Every answer is traced back to your uploaded PDFs and page numbers.
          </p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
