'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

const Header: React.FC = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const toggleMenu = () => setIsOpen(!isOpen);

  return (
    <header className="flex flex-col sm:flex-row justify-between items-center py-4 px-4 md:px-12 bg-white shadow-lg sticky top-0 z-50">
      
      <div className="flex justify-between items-center w-full sm:w-auto">
        <div className="flex items-center space-x-2">
          <Link href="/" aria-label="Go to HustleHub Africa homepage">
            <Image
              src="/logo.png"
              alt="HustleHub Africa Logo"
              width={50}
              height={50}
              className="rounded-md ring-4 ring-blue-500 hover:ring-blue-600 transition duration-300"
              priority
            />
          </Link>
          <Link
            href="/"
            className="hover:text-indigo-700 transition-colors text-2xl font-extrabold text-indigo-600 hidden sm:inline"
          >
            HustleHub Africa
          </Link>
        </div>

        <button
          onClick={toggleMenu}
          className="sm:hidden p-2 text-gray-600 hover:text-indigo-600 focus:outline-none rounded-lg"
          aria-label="Toggle navigation menu"
          aria-expanded={isOpen}
          aria-controls="mobile-menu"
        >
          {isOpen ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7"></path>
            </svg>
          )}
        </button>
      </div>
      
      <nav className="hidden sm:flex space-x-4 sm:space-x-8 items-center" aria-label="Primary navigation">
        <Link href="/" className="text-gray-600 hover:text-indigo-600 transition-colors">Home</Link>
        <Link href="/blog" className="text-gray-600 hover:text-indigo-600 transition-colors">Blog</Link>
        <Link href="/#earning" className="text-gray-600 hover:text-indigo-600 transition-colors">Paid Surveys</Link>
        <Link href="/auth/login" className="text-gray-600 hover:text-indigo-600 transition-colors">Login</Link>
        <Link href="/admin" className="text-gray-600 hover:text-indigo-600 transition-colors hidden lg:block" aria-label="Admin Login Portal">Admin Login</Link>
        
        <Link 
          href="/auth/sign-up"
          className="px-4 py-2 bg-green-500 text-white font-medium rounded-xl hover:bg-green-600 transition-colors shadow-md text-sm sm:text-base"
          aria-label="Get started and create a new account"
        >
          Get Started
        </Link>
      </nav>

      <nav 
        id="mobile-menu"
        className={`sm:hidden w-full flex-col mt-3 transition-all duration-300 ease-in-out bg-white ${isOpen ? 'max-h-96 opacity-100 py-2 border-t border-gray-100' : 'max-h-0 opacity-0 overflow-hidden'}`}
        aria-label="Mobile navigation menu"
      >
        <Link href="/" className="block py-2 px-3 text-gray-700 hover:bg-indigo-50 rounded-lg" onClick={toggleMenu}>Home</Link>
        <Link href="/blog" className="block py-2 px-3 text-gray-700 hover:bg-indigo-50 rounded-lg" onClick={toggleMenu}>Blog</Link>
        <Link href="/#earning" className="block py-2 px-3 text-gray-700 hover:bg-indigo-50 rounded-lg" onClick={toggleMenu}>Paid Surveys</Link>
        <Link href="/auth/login" className="block py-2 px-3 text-gray-700 hover:bg-indigo-50 rounded-lg" onClick={toggleMenu}>Login</Link>
        <Link href="/admin" className="block py-2 px-3 text-gray-700 hover:bg-indigo-50 rounded-lg" aria-label="Admin Login Portal" onClick={toggleMenu}>Admin Login</Link>
        
        <Link 
          href="/auth/sign-up"
          className="w-full mt-4 py-2 bg-green-500 text-white font-medium rounded-xl hover:bg-green-600 transition-colors shadow-md text-center block"
          aria-label="Get started and create a new account (mobile)"
          onClick={toggleMenu}
        >
          Get Started
        </Link>
      </nav>
    </header>
  );
};

export default Header;
