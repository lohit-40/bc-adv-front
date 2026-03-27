"use client";

import { useState } from "react";

interface Vulnerability {
  type: string;
  severity: string;
  line_number: number | null;
  description: string;
}

interface ScanResponse {
  address: string;
  status: string;
  vulnerabilities: Vulnerability[];
}

export default function Home() {
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResponse | null>(null);
  const [error, setError] = useState("");

  const handleScan = async () => {
    if (!address) {
      setError("Please enter a valid Ethereum smart contract address.");
      return;
    }
    setError("");
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("http://127.0.0.1:8000/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contract_address: address }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Scanning failed.");
      }

      const data: ScanResponse = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col items-center py-20 px-4 font-sans selection:bg-purple-500/30">
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay"></div>
      
      {/* Background gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/20 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[10%] right-[-10%] w-[30%] h-[30%] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="z-10 w-full max-w-4xl flex flex-col items-center">
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-4 text-transparent bg-clip-text bg-gradient-to-br from-white to-neutral-500 text-center">
          Web3 Guard
        </h1>
        <p className="text-neutral-400 text-lg mb-12 text-center max-w-2xl">
          Instantly scan verified Ethereum smart contracts for common vulnerabilities like Reentrancy and Access Control flaws.
        </p>

        {/* Search Bar */}
        <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-2xl p-2 flex flex-col sm:flex-row gap-2 shadow-2xl backdrop-blur-sm relative transition-all focus-within:border-purple-500/50 focus-within:ring-4 focus-within:ring-purple-500/10">
          <input
            type="text"
            placeholder="0x..."
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="flex-1 bg-transparent border-none px-4 py-3 text-neutral-200 placeholder-neutral-600 focus:outline-none text-lg rounded-xl"
            spellCheck={false}
          />
          <button
            onClick={handleScan}
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-500 text-white px-8 py-3 rounded-xl font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(147,51,234,0.3)] hover:shadow-[0_0_30px_rgba(147,51,234,0.5)]"
          >
            {loading ? (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <span>Scan Contract</span>
            )}
          </button>
        </div>

        {error && (
          <div className="mt-8 bg-red-950/50 border border-red-900 text-red-400 px-6 py-4 rounded-xl max-w-2xl w-full text-center animate-in fade-in slide-in-from-bottom-4">
            {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="mt-12 w-full animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-semibold text-white">Scan Results</h2>
              <div className="bg-neutral-900 border border-neutral-800 px-4 py-1.5 rounded-full text-sm font-medium text-neutral-400 font-mono">
                {result.address.slice(0, 8)}...{result.address.slice(-6)}
              </div>
            </div>

            {result.vulnerabilities.length === 0 ? (
              <div className="bg-neutral-900/50 border border-green-900/50 rounded-3xl p-12 text-center flex flex-col items-center">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-6">
                  <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-medium text-green-400 mb-2">No Vulnerabilities Found</h3>
                <p className="text-neutral-400">Our initial scan did not detect common Reentrancy or Access Control patterns.</p>
              </div>
            ) : (
              <div className="grid gap-6">
                {result.vulnerabilities.map((vuln, idx) => (
                  <div key={idx} className="bg-neutral-900/80 border border-neutral-800 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row gap-6 relative overflow-hidden group hover:border-neutral-700 transition-colors">
                    {/* Severity Indicator Line */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${vuln.severity === 'High' ? 'bg-red-500' : vuln.severity === 'Medium' ? 'bg-orange-500' : 'bg-yellow-500'}`}></div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                          vuln.severity === 'High' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 
                          vuln.severity === 'Medium' ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' : 
                          'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                        }`}>
                          {vuln.severity} Risk
                        </span>
                        <h3 className="text-xl font-semibold text-white">{vuln.type}</h3>
                      </div>
                      <p className="text-neutral-400 leading-relaxed mb-4">
                        {vuln.description}
                      </p>
                    </div>
                    
                    {vuln.line_number && (
                      <div className="md:w-32 flex flex-col justify-center items-start md:items-end md:border-l md:border-neutral-800 md:pl-6 pt-6 md:pt-0 border-t border-neutral-800 mt-2 md:mt-0">
                        <span className="text-neutral-500 text-sm uppercase tracking-wider mb-1">Line</span>
                        <span className="text-2xl font-mono text-purple-400 font-semibold">{vuln.line_number}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
