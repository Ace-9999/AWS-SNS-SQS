import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';

export const AppLayout: React.FC = () => {
  return (
    <div className="flex flex-col h-screen w-screen bg-[#0B0F19] text-slate-100 overflow-hidden font-sans">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-[#0F172A]/50 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

