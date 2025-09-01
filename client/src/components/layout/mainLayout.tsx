import React, { memo } from "react";
import Header from "./Header";
import Footer from "./footer";

interface MainLayoutProps {
  children: React.ReactNode;
  className?: string;
}

const MainLayout = memo(({ children, className = "" }: MainLayoutProps) => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className={`flex-1 ${className}`}>{children}</main>

      <Footer />
    </div>
  );
});

MainLayout.displayName = "MainLayout";

export default MainLayout;
