import React, { useState } from "react";
import { useLocation } from "wouter";
import Sidebar from "@/components/Sidebar";
import { Menu, User } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [location] = useLocation();
  
  // Extract the page title from the current location
  const getPageTitle = () => {
    switch (location) {
      case "/":
        return "Dashboard";
      case "/voter-management":
        return "Voter Management";
      case "/candidate-management":
        return "Candidate Management";
      case "/voting-status":
        return "Voting Status";
      case "/results":
        return "Results";
      case "/audit":
        return "Audit Trail";
      case "/settings":
        return "Settings";
      default:
        return "Admin Dashboard";
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      
      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top Navigation */}
        <div className="bg-white border-b border-neutral-200 z-10">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex">
                <Button
                  variant="ghost"
                  className="text-neutral-500 px-4 md:hidden"
                  onClick={() => setSidebarOpen(true)}
                >
                  <Menu className="h-6 w-6" />
                </Button>
                <div className="flex items-center">
                  <span className="text-xl font-semibold text-primary-dark">{getPageTitle()}</span>
                </div>
              </div>
              <div className="flex items-center">
                <div className="flex items-center">
                  <span className="text-sm font-medium text-neutral-700 mr-2">Admin User</span>
                  <span className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white">
                    <User className="h-4 w-4" />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-neutral-100 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
