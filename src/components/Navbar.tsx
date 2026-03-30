"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Cpu, Wallet } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  useEffect(() => {
    const checkConnection = async () => {
      if (typeof window !== "undefined" && typeof (window as any).ethereum !== "undefined") {
        try {
          const accounts = await (window as any).ethereum.request({ method: "eth_accounts" });
          if (accounts.length > 0) {
            setWalletAddress(accounts[0]);
          }
        } catch (e) {
          console.error(e);
        }
      }
    };
    checkConnection();
  }, []);

  const connectWallet = async () => {
    if (typeof window !== "undefined" && typeof (window as any).ethereum !== "undefined") {
      try {
        const accounts = await (window as any).ethereum.request({ method: "eth_requestAccounts" });
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
        }
      } catch (err) {
        console.error(err);
      }
    } else {
      alert("Please install MetaMask or another Web3 wallet provider to connect.");
    }
  };

  return (
    <nav className="fixed top-0 left-0 w-full z-40 px-6 py-6 md:px-12 pointer-events-none">
      <div className="max-w-7xl mx-auto flex items-center justify-between pointer-events-auto">
        
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-12 h-12 border-2 border-brutal-text bg-brutal-text flex items-center justify-center group-hover:bg-brutal-orange group-hover:border-brutal-orange transition-colors">
            <Cpu className="w-6 h-6 text-brutal-bg" />
          </div>
          <span className="font-bold tracking-[0.2em] text-lg uppercase text-brutal-text hidden md:block group-hover:text-brutal-orange transition-colors">
            web3 | guard
          </span>
        </Link>

        {/* Links */}
        <div className="flex items-center gap-2 border-2 border-brutal-text bg-brutal-bg p-1 rounded-none shadow-[4px_4px_0px_0px_rgba(28,28,28,1)]">
          <Link 
            href="/"
            className={`px-6 py-2 text-xs uppercase tracking-[0.2em] font-bold transition-all ${
              pathname === "/" ? "bg-brutal-text text-brutal-bg" : "text-brutal-text/60 hover:text-brutal-text hover:bg-brutal-text/5"
            }`}
          >
            audit
          </Link>
          <Link 
            href="/about"
            className={`px-6 py-2 text-xs uppercase tracking-[0.2em] font-bold transition-all ${
              pathname === "/about" ? "bg-brutal-text text-brutal-bg" : "text-brutal-text/60 hover:text-brutal-text hover:bg-brutal-text/5"
            }`}
          >
            ethos
          </Link>
        </div>

        {/* Wallet Connect */}
        <div className="pointer-events-auto">
          {walletAddress ? (
            <div className="px-6 py-3 border-2 border-[#10B981] bg-[#10B981]/10 text-[#10B981] text-xs tracking-[0.2em] uppercase font-bold flex items-center gap-3 shadow-[4px_4px_0px_0px_rgba(16,185,129,0.3)]">
              <div className="w-2 h-2 bg-[#10B981] animate-pulse" />
              <span className="hidden sm:inline">{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span>
              <span className="sm:hidden">Connected</span>
            </div>
          ) : (
            <button 
              onClick={connectWallet}
              className="flex items-center gap-3 px-6 py-3 border-2 border-brutal-text bg-brutal-text text-brutal-bg hover:bg-brutal-orange hover:border-brutal-orange text-xs tracking-[0.2em] font-bold transition-all shadow-[4px_4px_0px_0px_rgba(28,28,28,1)] hover:shadow-[4px_4px_0px_0px_rgba(255,69,34,1)]"
            >
              <Wallet className="w-4 h-4" />
              <span className="hidden sm:inline">Connect Wallet</span>
              <span className="sm:hidden">Connect</span>
            </button>
          )}
        </div>

      </div>
    </nav>
  );
}
