"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ShieldCheck, ShieldAlert, Cpu, Code2, Link, Sparkles, Download } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { playSound } from "@/utils/sounds";

const API_URL = "/api";

const Chatbot = dynamic(() => import("@/components/Chatbot"), { ssr: false });
const HistorySidebar = dynamic(() => import("@/components/HistorySidebar"), { ssr: false });

interface Vulnerability {
  type: string;
  severity: string;
  line_number: number | null;
  description: string;
  remediation: string | null;
}

interface ScanResponse {
  address: string;
  status: string;
  vulnerabilities: Vulnerability[];
  audit_tx_hash?: string;
  hash_key?: string;
}

export default function App() {
  const [inputMode, setInputMode] = useState<'address' | 'code' | null>(null);
  const [address, setAddress] = useState("");
  const [sourceCode, setSourceCode] = useState("");
  const [chainId, setChainId] = useState("1");
  const [loading, setLoading] = useState(false);
  const scanSteps = ["Fetching Blockchain Data...", "Decompiling Contract...", "Running AI Heuristics...", "Finalizing Report..."];
  const [scanStep, setScanStep] = useState(0);
  const [result, setResult] = useState<ScanResponse | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [recentDeployments, setRecentDeployments] = useState<string[]>([]);

  useEffect(() => {
    const checkWallet = setInterval(() => {
      if (typeof window !== "undefined" && typeof (window as any).ethereum !== "undefined") {
        const selected = (window as any).ethereum.selectedAddress;
        if (selected && selected !== userAddress) {
          setUserAddress(selected);
        }
      }
    }, 2000);
    return () => clearInterval(checkWallet);
  }, [userAddress]);

  useEffect(() => {
    if (userAddress) {
      const fetchDeployments = async () => {
        try {
          const res = await fetch(`${API_URL}/wallet/${userAddress}/deployments?chain_id=${chainId}`);
          if (res.ok) {
            const data = await res.json();
            setRecentDeployments(data.deployments);
          }
        } catch(e) { console.error(e) }
      };
      fetchDeployments();
    }
  }, [userAddress, chainId]);

  // Auto-Remediation State
  const [secureContract, setSecureContract] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleScan = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (inputMode === 'address' && !address) {
      toast.error("Please provide a verified contract address.");
      return;
    }
    if (inputMode === 'code' && !sourceCode) {
      toast.error("Please paste your raw Solidity source code.");
      return;
    }
    
    setLoading(true);
    setResult(null);
    setScanStep(0);
    playSound('scan');
    
    const interval = setInterval(() => {
      setScanStep(prev => {
        if (prev < 3) playSound('scan');
        return prev < 3 ? prev + 1 : prev;
      });
    }, 2500);

    const payload = inputMode === 'address' 
      ? { contract_address: address, chain_id: chainId } 
      : { source_code: sourceCode };

    try {
      const res = await fetch(`${API_URL}/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Scanning failed.");
      }

      const data: ScanResponse = await res.json();
      setResult(data);
      
      if (data.vulnerabilities.length > 0) {
        playSound('alert');
        toast.error("Vulnerabilities detected!");
      } else {
        playSound('success');
        toast.success("Security analysis complete, contract is secure!");
      }
      
      // Save history locally
      try {
        const saved = localStorage.getItem('web3guard_history') || '[]';
        const historyArray = JSON.parse(saved);
        const newEntry = { ...data, timestamp: new Date().toISOString() };
        const deduplicated = historyArray.filter((item: any) => item.address !== data.address || !data.address);
        const newHistory = [newEntry, ...deduplicated].slice(0, 10);
        localStorage.setItem('web3guard_history', JSON.stringify(newHistory));
      } catch (e) {
        console.error("Failed to save history", e);
      }
      
    } catch (err: any) {
      playSound('error');
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  };

  const handleGenerateSecureCode = async () => {
    if (!result || (!sourceCode && !address)) return;
    setIsGenerating(true);
    setSecureContract(null);
    
    // We send whichever input the user originally provided
    const payload = inputMode === 'address' 
      ? { contract_address: address, chain_id: chainId } 
      : { source_code: sourceCode };
      
    try {
      const response = await fetch(`${API_URL}/secure_contract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        const data = await response.json();
        setSecureContract(data.secure_code);
      } else {
        const errData = await response.json();
        const errStr = errData.detail || "Failed to generate secure contract";
        if (errStr.includes("429") || errStr.toLowerCase().includes("quota")) {
          toast.error("Gemini AI Quota Exceeded! Please configure a premium API key.", { duration: 6000 });
        } else {
          toast.error("AI Remediation Error: " + errStr.slice(0, 100));
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to reach AI Backend");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadPDF = () => {
    // Rely exclusively on native browser printing (which allows "Save as PDF")
    // This utilizes the @media print CSS added to globals.css to perfectly format 
    // the layout as a native, vector-perfect, selectable-text document instead of a blurry screenshot.
    setTimeout(() => {
      window.print();
    }, 100);
  };

  return (
    <main className="relative min-h-screen w-full">
      <Toaster position="bottom-center" toastOptions={{
        style: { background: '#111', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }
      }} />
      {/* Main UI Overlay */}
      <div className="relative z-10 w-full min-h-screen flex flex-col justify-center px-6 md:px-24 pt-32 pb-20 pointer-events-none">
        <div className="max-w-6xl w-full mx-auto pointer-events-auto">
          
          {/* Header Section */}
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="mb-24 relative"
          >
            <div className="flex items-center gap-3 mb-6 absolute -top-12 left-2 md:-left-12">
              <span className="text-brutal-orange text-6xl font-serif mt-4">*</span>
              <span className="uppercase tracking-[0.2em] text-xs font-bold text-brutal-text leading-tight max-w-[200px]">
                We are rethinking how smart contract communication happens.
              </span>
            </div>
            <h1 className="text-[100px] md:text-[160px] lg:text-[220px] font-medium tracking-tighter leading-[0.8] text-brutal-text lowercase relative z-10">
              web3<br/>
              guard
            </h1>
            
            <div className="absolute top-1/2 right-0 hidden lg:block transform rotate-90 origin-right z-0">
              <span className="text-xs tracking-widest uppercase text-brutal-text/40">Scroll to discover</span>
            </div>
          </motion.div>

          {/* Interactive Search Area */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="w-full max-w-3xl"
          >
            {/* Toggle Input Mode */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-6 border-b-2 border-brutal-text pb-4 w-full">
                <button 
                  onClick={() => setInputMode('address')}
                  className={`flex items-center gap-2 text-sm tracking-[0.2em] uppercase transition-all ${
                    inputMode === 'address' 
                    ? 'text-brutal-orange font-bold' 
                    : 'text-brutal-text/40 hover:text-brutal-text'
                  }`}
                >
                  <Link className="w-4 h-4" />
                  [ Address ]
                </button>
                <button 
                  onClick={() => setInputMode('code')}
                  className={`flex items-center gap-2 text-sm tracking-[0.2em] uppercase transition-all ${
                    inputMode === 'code' 
                    ? 'text-brutal-orange font-bold' 
                    : 'text-brutal-text/40 hover:text-brutal-text'
                  }`}
                >
                  <Code2 className="w-4 h-4" />
                  [ Source ]
                </button>
              </div>

              {inputMode === 'address' && (
                <div className="flex items-center gap-3 animate-in fade-in py-2">
                  <span className="text-brutal-text font-bold text-xs tracking-widest uppercase">Network :</span>
                  <select 
                    value={chainId} 
                    onChange={(e) => setChainId(e.target.value)}
                    className="bg-transparent border-none text-brutal-orange font-bold text-sm tracking-widest outline-none cursor-pointer hover:opacity-80 transition-all appearance-none pr-4 uppercase"
                  >
                    <option value="1">Ethereum</option>
                    <option value="11155111">Sepolia</option>
                    <option value="137">Polygon</option>
                    <option value="56">BSC</option>
                    <option value="42161">Arbitrum</option>
                  </select>
                </div>
              )}

              {inputMode === 'address' && recentDeployments.length > 0 && (
                <div className="flex flex-col gap-3 mt-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <span className="text-xs text-brutal-text/50 uppercase tracking-widest font-bold">Recent Signatures:</span>
                  <div className="flex flex-wrap gap-2">
                    {recentDeployments.map(dep => (
                      <button
                        key={dep}
                        onClick={() => setAddress(dep)}
                        className="px-4 py-2 bg-brutal-text text-brutal-bg text-xs tracking-widest hover:bg-brutal-orange transition-colors font-mono"
                      >
                        {dep.slice(0,6)}...{dep.slice(-4)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <AnimatePresence>
              {inputMode !== null && (
                <motion.form 
                  initial={{ opacity: 0, height: 0, overflow: 'hidden' }}
                  animate={{ opacity: 1, height: 'auto', overflow: 'visible' }}
                  exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  onSubmit={handleScan} 
                  className="relative group mt-10"
                >
                  <div className="relative flex flex-col gap-6">
                    {inputMode === 'address' ? (
                      <input
                        type="text"
                        placeholder="paste verified contract address *"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        className="brutal-input"
                        spellCheck={false}
                      />
                    ) : (
                      <textarea
                        placeholder="paste raw solidity code here *"
                        value={sourceCode}
                        onChange={(e) => setSourceCode(e.target.value)}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        rows={6}
                        className="w-full bg-transparent border-b-4 border-brutal-text px-0 py-4 outline-none text-2xl font-mono tracking-tight text-brutal-text placeholder:text-brutal-text/30 focus:border-brutal-orange transition-colors resize-y rounded-none appearance-none"
                        spellCheck={false}
                      />
                    )}
                    
                    <div className="w-full max-w-[280px] mt-4">
                      <button
                        type="submit"
                        disabled={loading}
                        className="brutal-btn w-full"
                      >
                        {loading ? (
                          <div className="flex items-center justify-center gap-3">
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                              className="w-4 h-4 border-2 border-brutal-bg border-t-transparent rounded-full flex-shrink-0"
                            />
                            <span>{scanSteps[scanStep]}</span>
                          </div>
                        ) : (
                          "Commence Audit"
                        )}
                      </button>
                    </div>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Results Area */}
          <AnimatePresence>
            {result && (
              <motion.div
                id="audit-report-content"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="mt-32 border-t-4 border-brutal-text pt-16 relative"
              >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-6">
                  <div>
                    <h2 className="text-5xl md:text-7xl font-bold tracking-tighter text-brutal-text lowercase mb-4">audit <br/> report *</h2>
                    <p className="text-brutal-text/60 font-mono text-sm tracking-widest bg-brutal-text/5 inline-block px-4 py-2">{result.address}</p>
                    
                    <div className="flex flex-wrap items-center gap-4 mt-6">
                      {result.audit_tx_hash && (
                        <a 
                          href={`https://sepolia.etherscan.io/tx/${result.audit_tx_hash}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-6 py-3 border-2 border-brutal-text bg-brutal-text text-brutal-bg hover:bg-transparent hover:text-brutal-text transition-all text-xs tracking-[0.2em] font-bold uppercase w-max"
                        >
                          <ShieldCheck className="w-4 h-4" />
                          blockchain verified
                        </a>
                      )}
                      
                      <button
                        onClick={handleDownloadPDF}
                        className="inline-flex items-center gap-2 px-6 py-3 border-2 border-brutal-text text-brutal-text hover:bg-brutal-text hover:text-brutal-bg transition-all text-xs tracking-[0.2em] font-bold uppercase"
                      >
                        <Download className="w-4 h-4" />
                        export pdf
                      </button>

                      {result.hash_key && (
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/audit/${result.hash_key}`);
                            toast.success("Shareable link copied to clipboard!");
                          }}
                          className="inline-flex items-center gap-2 px-6 py-3 border-2 border-brutal-orange text-brutal-orange hover:bg-brutal-orange hover:text-brutal-bg transition-all text-xs tracking-[0.2em] font-bold uppercase"
                        >
                          <Link className="w-4 h-4" />
                          share link
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {result.vulnerabilities.length === 0 ? (
                    <div className="flex items-center gap-3 px-8 py-4 border-2 border-[#10B981] bg-[#10B981]/10 text-[#10B981]">
                      <ShieldCheck className="w-6 h-6" />
                      <span className="text-sm tracking-[0.2em] font-bold uppercase">secure</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 px-8 py-4 border-2 border-brutal-orange bg-brutal-orange/10 text-brutal-orange">
                      <ShieldAlert className="w-6 h-6" />
                      <span className="text-sm tracking-[0.2em] font-bold uppercase">vulnerable</span>
                    </div>
                  )}
                </div>

                {result.vulnerabilities.length === 0 ? (
                  <div className="w-full aspect-[21/9] flex items-center justify-center border-4 border-brutal-text bg-transparent relative">
                     <span className="absolute -top-6 -left-4 text-7xl text-[#10B981] font-serif">*</span>
                    <p className="text-brutal-text font-medium text-2xl tracking-tighter">contract isolated. no severe exploits discovered.</p>
                  </div>
                ) : (
                  <div className="grid gap-6 border-l-4 border-brutal-text pl-4 md:pl-10">
                    {result.vulnerabilities.map((vuln, idx) => (
                      <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 * idx }}
                        key={idx} 
                        className="group flex flex-col p-8 md:p-12 border-2 border-brutal-text hover:bg-brutal-text hover:text-brutal-bg transition-all duration-300"
                      >
                        <div className="flex flex-col md:flex-row md:items-start justify-between mb-8">
                          <div className="flex-1">
                            <div className="flex items-center gap-6 mb-6">
                              <span className={`px-4 py-2 text-xs uppercase tracking-[0.2em] font-bold border-2 ${
                                vuln.severity === 'High' ? 'border-brutal-orange text-brutal-orange' : 
                                vuln.severity === 'Medium' ? 'border-yellow-600 text-yellow-600' : 
                                'border-blue-600 text-blue-600'
                              } group-hover:border-brutal-bg group-hover:text-brutal-bg`}>
                                {vuln.severity} Risk
                              </span>
                              <h3 className="text-3xl md:text-5xl font-medium tracking-tighter lowercase">{vuln.type}</h3>
                            </div>
                            <p className="font-medium leading-relaxed max-w-3xl text-lg opacity-80 group-hover:opacity-100">
                              {vuln.description}
                            </p>
                          </div>
                          {vuln.line_number && (
                            <div className="mt-8 md:mt-0 flex flex-col md:items-end pb-4 border-b-2 border-brutal-text/20 md:border-b-0 md:pl-8 md:border-l-2 group-hover:border-brutal-bg/30">
                              <span className="text-xs uppercase tracking-[0.2em] mb-2 font-bold opacity-50">Line Num</span>
                              <span className="text-6xl font-bold font-mono">.{vuln.line_number}</span>
                            </div>
                          )}
                        </div>

                        {/* AI Remediation Engine Display */}
                        {vuln.remediation && (
                          <div className="mt-8 p-6 lg:p-10 border-2 border-brutal-text bg-brutal-bg text-brutal-text relative group-hover:border-brutal-bg group-hover:translate-x-4 transition-transform duration-300">
                            <div className="absolute top-4 right-4 text-brutal-orange text-4xl font-serif">*</div>
                            <div className="flex items-center gap-3 mb-6 text-brutal-orange">
                              <Sparkles className="w-5 h-5" />
                              <span className="text-sm uppercase tracking-[0.2em] font-bold">Untold AI Remediation</span>
                            </div>
                            <div className="prose prose-p:text-brutal-text prose-headings:text-brutal-text max-w-none font-medium text-base prose-pre:bg-brutal-text prose-pre:text-brutal-bg prose-pre:border-2 prose-pre:border-brutal-text prose-pre:rounded-none leading-relaxed whitespace-pre-wrap">
                              {vuln.remediation}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
                
                {/* Full Contract Auto-Remediation Button */}
                {result.vulnerabilities.length > 0 && (
                  <div className="mt-20 flex flex-col items-center border-t-4 border-brutal-text pt-20">
                    <div className="w-full max-w-2xl text-center mb-8">
                      <h3 className="text-4xl md:text-6xl font-bold tracking-tighter text-brutal-text lowercase mb-4">re-engineer <br/> contract *</h3>
                      <p className="text-sm font-bold tracking-[0.2em] uppercase text-brutal-text/70 mb-10 max-w-md mx-auto">Deploy the untold AI protocol to structurally patch all vulnerabilities.</p>
                      
                      <button
                        onClick={handleGenerateSecureCode}
                        disabled={isGenerating}
                        className="brutal-btn w-full text-lg py-5"
                      >
                        {isGenerating ? (
                          <>
                            <div className="w-5 h-5 border-2 border-brutal-bg border-t-transparent rounded-full animate-spin" />
                            re-engineering...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-5 h-5" />
                            execute remediation
                          </>
                        )}
                      </button>
                    </div>
                    
                    {/* Secure Contract Display */}
                    {secureContract && (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-12 w-full p-8 md:p-12 border-4 border-brutal-text bg-brutal-text text-brutal-bg shadow-[16px_16px_0px_0px_rgba(255,69,34,1)] relative overflow-hidden"
                      >
                        <div className="flex items-center gap-4 mb-8 border-b-2 border-brutal-bg/20 pb-6">
                          <ShieldCheck className="w-10 h-10 text-brutal-orange" />
                          <h2 className="text-3xl md:text-5xl font-bold tracking-tighter lowercase">secured <br/> architecture *</h2>
                        </div>
                        <div className="prose max-w-none font-mono text-[13px] md:text-sm leading-relaxed whitespace-pre-wrap overflow-x-auto text-left text-brutal-bg/90">
                          <pre><code className="block text-left">{secureContract}</code></pre>
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}
                
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
      
      {/* History Sidebar */}
      <HistorySidebar onSelectReport={(report) => {
        setResult(report);
        setInputMode(report.address ? 'address' : 'code');
        setAddress(report.address || '');
        setSourceCode(report.address ? '' : '/* Loaded from history */');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }} />

      {/* AI Security Copilot Chatbot */}
      <Chatbot 
        sourceCode={result ? (sourceCode || address) : ""} 
        vulnerabilities={result ? result.vulnerabilities : []}
        secureCode={result ? secureContract : null}
        hasContext={!!result}
      />
    </main>
  );
}
