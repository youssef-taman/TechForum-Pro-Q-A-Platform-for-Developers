import { Outlet, Link } from 'react-router-dom';
import { LayoutGrid, User, Bell, Search } from 'lucide-react';

const Layout = () => {
  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg">
              <LayoutGrid className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-xl">TechForum<span className="text-blue-600">Pro</span></span>
          </Link>
          <div className="flex-1 max-w-md mx-8 relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Search..." className="w-full pl-10 pr-4 py-2 bg-slate-100 rounded-full text-sm outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex items-center gap-4 text-slate-500">
            <Bell className="w-5 h-5 cursor-pointer" />
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center border border-blue-200">
              <User className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;