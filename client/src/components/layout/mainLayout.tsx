import React from 'react';
import Navbar from '../ui/navbar';
import Footer from './footer';


interface MainLayoutProps {
  children: React.ReactNode;
  showNavbar?: boolean;
  showFooter?: boolean;
  className?: string;
}

export default function MainLayout({ 
  children, 
  showNavbar = true, 
  showFooter = true,
  className = ""
}: MainLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      {showNavbar && <Navbar />}
      
      <main className={`flex-1 ${showNavbar ? 'pt-16' : ''} ${className}`}>
        {children}
      </main>
      
      {showFooter && <Footer />}
    </div>
  );
}