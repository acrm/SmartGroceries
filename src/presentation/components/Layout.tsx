import React from 'react';
import { ShoppingCart } from 'lucide-react';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="flex flex-col h-screen bg-gray-50 text-gray-900 pb-20">
      <header className="bg-white p-4 shadow flex items-center justify-between fixed top-0 w-full z-10 h-16">
        <div className="flex items-center text-blue-600 font-bold text-lg">
          <ShoppingCart className="mr-2" size={24} />
          <span>SmartGroceries v3</span>
        </div>
      </header>
      <main className="flex-1 overflow-auto mt-16 p-4">
        {children}
      </main>
    </div>
  );
};
