'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { LoginForm } from './LoginForm';
import { UserProfile } from './UserProfile';

interface HeaderProps {
  videoCount?: number;
  readyVideoCount?: number;
}

export function Header({ videoCount = 0, readyVideoCount = 0 }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [showLoginModal, setShowLoginModal] = useState(false);
  
  // Use auth context directly - component must be wrapped in AuthProvider
  const { isAuthenticated, user, logout, login } = useAuth();

  const isActive = (path: string) => {
    if (path === '/' && pathname === '/') return true;
    if (path !== '/' && pathname.startsWith(path)) return true;
    return false;
  };

  const handleLogout = () => {
    logout();
    router.push('/tv');
  };

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-4">
            <Link href="/tv" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 6a2 2 0 012-2h6l2 2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                </svg>
              </div>
              <h1 className="text-xl font-semibold text-gray-900">Specialist TV</h1>
            </Link>
            
            {/* Navigation Menu */}
            <nav className="flex items-center space-x-8">
              <Link 
                href="/tv" 
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  isActive('/tv') 
                    ? 'border-blue-500 text-blue-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                TV
              </Link>
              <Link 
                href="/creator" 
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  isActive('/creator') 
                    ? 'border-blue-500 text-blue-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Creator
              </Link>
            </nav>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Video Stats - show on creator and tv pages */}
            {(pathname === '/creator' || pathname === '/tv') && videoCount > 0 && (
              <div className="text-sm text-gray-600">
                {videoCount} videos{readyVideoCount !== undefined ? ` • ${readyVideoCount} ready` : ''}
              </div>
            )}
            
            {/* Authentication - show on all pages */}
            {isAuthenticated && user ? (
              <UserProfile user={user} onLogout={handleLogout} />
            ) : (
              <button
                onClick={() => setShowLoginModal(true)}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="-ml-0.5 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m0 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3v1" />
                </svg>
                Login
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Login Modal with blurred background */}
      {showLoginModal && (
        <>
          {/* Blur the entire page content */}
          <div className="fixed inset-0 z-40 backdrop-blur-sm pointer-events-none" />
          
          {/* Login Form Modal */}
          <LoginForm
            onLogin={(token: string) => {
              login(token);
              setShowLoginModal(false);
            }}
            onClose={() => setShowLoginModal(false)}
          />
        </>
      )}
    </header>
  );
}
