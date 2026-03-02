import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "../AppSidebar";

export default function AppSidebarExample() {
  return (
    <SidebarProvider>
      <div className="flex h-96 w-full">
        <AppSidebar />
      </div>
    </SidebarProvider>
  );
}
