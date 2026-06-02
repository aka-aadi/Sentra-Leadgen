"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Sparkles, Eye, EyeOff, Lock, User, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { ParticleBackground } from "@/components/particle-background";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const loginMut = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Login failed");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Login successful!");
      window.location.href = "/dashboard";
    },
    onError: (err: any) => {
      toast.error(err.message || "Invalid password");
    },
  });

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden dark">
      <ParticleBackground />
      
      <div className="w-full max-w-[400px] z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-2xl shadow-indigo-500/40 mb-5 border border-white/10 relative group overflow-hidden">
            <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <Sparkles className="h-8 w-8 text-white relative z-10" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight text-center drop-shadow-md">SENTRA LeadGen</h1>
          <p className="text-sm text-indigo-200/70 mt-2 font-medium tracking-wide">Sign in to your Superadmin account</p>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          {/* subtle glare effect inside card */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>
          
          <form onSubmit={(e) => { e.preventDefault(); loginMut.mutate(); }} className="space-y-6 relative z-10">
            <div>
              <label className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-2.5 block">Username</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-indigo-400/50">
                  <User className="h-4 w-4" />
                </div>
                <input 
                  type="text" 
                  value="superadmin" 
                  disabled
                  className="w-full h-12 rounded-xl bg-slate-950/50 border border-white/5 pl-11 pr-4 text-sm font-bold text-slate-400 cursor-not-allowed shadow-inner" 
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2.5">
                <label className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Password</label>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-indigo-400 group-focus-within:text-indigo-300 transition-colors">
                  <Lock className="h-4 w-4" />
                </div>
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter superadmin password"
                  autoFocus
                  className="w-full h-12 rounded-xl bg-slate-950/80 border border-white/10 pl-11 pr-12 text-sm font-medium text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all shadow-inner" 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={!password || loginMut.isPending}
              className="w-full h-12 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:hover:scale-100 mt-4 border border-white/10"
            >
              {loginMut.isPending ? "Authenticating..." : (
                <>Sign In <ArrowRight className="h-4 w-4" /></>
              )}
            </button>
          </form>
          
          <div className="mt-8 text-center relative z-10">
             <p className="text-[11px] font-medium text-slate-500">
               Forgot password? Reset it from the database.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
}
