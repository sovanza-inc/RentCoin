import { useActiveAccount } from "thirdweb/react";
import { client } from "./client";
import "./index.css";
import "./App.css";
import { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';

import { TokenMint } from './TokenMint';
import Dashboard from './Dashboard';

export function App() {
	const address = useActiveAccount();
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <Router>
            <div className="min-h-screen bg-gray-900">
                <header className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center">
                                <Link to="/" className="flex items-center">
                                    <img 
                                        src="https://rentcoins.io/wp-content/uploads/2025/01/RentCoins-logo-transparent-white-150x150.png" 
                                        alt="RentCoins Logo" 
                                        className="h-10 w-auto"
                                    />
                                    <span className="ml-3 text-xl font-bold text-white">RentCoins</span>
                                </Link>
                            </div>
                            
                            {/* Desktop Navigation */}
                            <nav className="hidden md:flex items-center space-x-6">
                                <Link to="/" className="text-gray-300 hover:text-white transition-colors">Dashboard</Link>
                                <Link to="/mint" className="px-4 py-2 rounded-lg bg-gradient-to-r from-green-500 to-blue-500 text-white font-medium hover:from-green-600 hover:to-blue-600 transition-all transform hover:scale-[1.02]">Mint Tokens</Link>
                            </nav>

                            {/* Mobile Menu Button */}
                            <button 
                                className="md:hidden p-2 rounded-lg text-gray-400 hover:text-white focus:outline-none"
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            >
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    {isMobileMenuOpen ? (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    ) : (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                    )}
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Mobile Menu */}
                    <div className={`${isMobileMenuOpen ? 'block' : 'hidden'} md:hidden bg-gray-800 border-b border-gray-700`}>
                        <div className="px-2 pt-2 pb-3 space-y-1">
                            <Link to="/" className="block px-3 py-2 rounded-md text-gray-300 hover:text-white hover:bg-gray-700">Dashboard</Link>
                            <Link to="/mint" className="block px-3 py-2 rounded-md bg-gradient-to-r from-green-500 to-blue-500 text-white font-medium">Mint Tokens</Link>
                        </div>
                    </div>
                </header>


	  <main className="main-content">
                    <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/mint" element={<TokenMint />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </main>
              </div>
            </Router>
        );
}