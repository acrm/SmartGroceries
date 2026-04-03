import React from 'react';
import { ShoppingCart } from 'lucide-react';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="app">
      <header className="app-header">
        <ShoppingCart className="header-icon" size={24} />
        <span>Умные покупки</span>
      </header>
      {children}
    </div>
  );
};
