import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Building2, ShieldCheck, TrendingUp, FileText, ArrowRight } from 'lucide-react';

const FEATURES = [
  {
    icon: Building2,
    title: 'AI-Powered Valuation',
    desc: 'Get instant, accurate property valuations backed by 5 AI engines running in sequence.',
  },
  {
    icon: ShieldCheck,
    title: 'Fraud Detection',
    desc: 'Automatically flags valuation anomalies, over-circle-rate deviations, and CERSAI risks.',
  },
  {
    icon: TrendingUp,
    title: 'Liquidity & Distress Analysis',
    desc: 'Know the real liquidation value and time-to-sell before approving any loan.',
  },
  {
    icon: FileText,
    title: 'RBI-Compliant Reports',
    desc: 'Printable audit-ready reports with full methodology, comparables, and lender recommendations.',
  },
];

export default function Landing() {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#FDFDFD] font-sans selection:bg-[#1a1a1a] selection:text-white flex flex-col items-center w-full">

      {/* Floating Shrinkable Navbar */}
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
        className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center justify-between px-6 py-2.5 rounded-full bg-white/70 backdrop-blur-xl border border-[#E5E5E5] shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${isScrolled ? 'w-[85%] max-w-3xl' : 'w-[95%] max-w-5xl'
          }`}
      >
        <div className="flex items-center">
          {/* Logo */}
          <img src="/coval-logo.png" alt="COVAL Logo" className="h-6" />
        </div>

        {/* Center Links perfectly centered */}
        <div className="hidden md:flex items-center gap-6 text-[14px] font-medium text-gray-500 absolute left-1/2 -translate-x-1/2">
          <a href="#features" className="hover:text-gray-900 transition-colors">Features</a>
          <a href="#workflow" className="hover:text-gray-900 transition-colors">How it works</a>
          <a href="#metrics" className="hover:text-gray-900 transition-colors">Metrics</a>
          <a href="#faq" className="hover:text-gray-900 transition-colors">FAQ</a>
        </div>

        <div className="flex items-center gap-5">
          <button
            onClick={() => navigate('/login')}
            className="text-[14px] font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            Log In
          </button>
          <button
            onClick={() => navigate('/signup')}
            className="px-5 py-2 text-[14px] font-medium bg-[#1A1A1A] hover:bg-black text-white rounded-full transition-colors shadow-sm"
          >
            Get Started
          </button>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center text-center px-6 pt-48 pb-20 w-full max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: "easeOut" }}>

          <h1 className="text-[56px] md:text-[64px] leading-[1.05] tracking-[-0.03em] font-semibold text-[#111] mb-6 max-w-3xl mx-auto">
            Real Estate Valuation <br />
            <span className="text-gray-400">Reimagined for NBFCs.</span>
          </h1>

          <p className="text-[17px] md:text-[19px] leading-relaxed text-gray-500 max-w-2xl mx-auto mb-10 font-medium">
            COVAL replaces manual collateral assessment with a market-aware intelligence layer.
            Know the intrinsic value, resale liquidity risk, and exit certainty in seconds.
          </p>

          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => navigate('/signup')}
              className="flex items-center gap-2 px-8 py-3.5 bg-[#1A1A1A] hover:bg-black text-white text-[15px] font-medium rounded-full transition-colors shadow-[0_4px_14px_0_rgba(0,0,0,0.1)]"
            >
              Start for free <ArrowRight className="w-4 h-4 ml-1 opacity-80" />
            </button>
            <button
              onClick={() => navigate('/login')}
              className="px-8 py-3.5 border border-[#EAEAEA] bg-white text-[#111] text-[15px] font-medium rounded-full hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
            >
              View Demo
            </button>
          </div>
        </motion.div>
      </section>

      {/* Video Demo Section */}
      <section className="relative w-full max-w-7xl mx-auto px-6 pb-32  flex flex-col items-center justify-center">
        
        {/* Video Container */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="relative z-10 w-full max-w-5xl aspect-video bg-[#111] rounded-[2rem] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-gray-200/50 group"
        >
          {/* Replace src with actual demo video link when available */}
          <iframe 
            width="100%" 
            height="100%" 
            src="https://www.youtube.com/embed/zDsIJRQZZ7k?si=tXv5hQUg-uSXOX8H" 
            title="COVAL Demo Prototype" 
            frameBorder="0" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            allowFullScreen
            className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-500"
          ></iframe>
        </motion.div>
      </section>

      {/* Features Showcase */}
      <section id="features" className="w-full max-w-5xl mx-auto px-6 py-24 border-t border-gray-100">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-semibold text-[#111] tracking-tight mb-3">Comprehensive Collateral Intelligence</h2>
          <p className="text-[15px] text-gray-500 font-medium">Moving beyond simple pricing models to actual exit certainty.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="group"
            >
              <div className="w-12 h-12 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                <f.icon className="w-5 h-5 text-gray-700" strokeWidth={1.5} />
              </div>
              <h3 className="text-[15px] font-semibold text-gray-900 mb-2 tracking-tight">{f.title}</h3>
              <p className="text-[14px] text-gray-500 leading-relaxed font-medium">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Workflow Section (Sticky Stack) */}
      <section id="workflow" className="w-full bg-[#FDFDFD] border-t border-[#E5E5E5] py-32 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-24">
            <h2 className="text-3xl md:text-4xl font-semibold text-[#111] tracking-tight mb-4">Zero paperwork.<br/>Instant intelligence.</h2>
            <p className="text-[16px] text-gray-500 font-medium max-w-xl mx-auto">
              Our platform minimizes manual verification, accelerating your loan origination process through a streamlined workflow.
            </p>
          </div>
          
          <div className="relative flex flex-col w-full pb-32">
            {/* Step 1 */}
            <div className="sticky top-32 flex flex-col md:flex-row items-center gap-12 md:gap-20 bg-[#111] rounded-[2.5rem] border border-[#222] shadow-[0_20px_50px_rgba(0,0,0,0.15)] p-8 md:p-14 mb-8 z-10 transition-all">
              <div className="md:w-1/2 flex flex-col items-start">
                <div className="w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center font-bold text-lg mb-8">1</div>
                <h3 className="text-3xl font-semibold text-white mb-4 tracking-tight">Input Property Details</h3>
                <p className="text-[17px] text-gray-400 leading-relaxed font-medium">Provide property location, basic attributes like age and size, and legal status indicators. Our system instantly geocodes and structures the data.</p>
              </div>
              <div className="md:w-1/2 w-full aspect-[4/3] bg-[#0A0A0A] rounded-3xl overflow-hidden relative border border-white/5 shadow-inner">
                 <img src="/image1.png" alt="Input Details" className="w-full h-full object-cover opacity-90 hover:opacity-100 transition-opacity duration-500" />
              </div>
            </div>

            {/* Step 2 */}
            <div className="sticky top-40 flex flex-col md:flex-row-reverse items-center gap-12 md:gap-20 bg-[#111] rounded-[2.5rem] border border-[#222] shadow-[0_-10px_50px_rgba(0,0,0,0.4)] p-8 md:p-14 mb-8 z-20 transition-all">
              <div className="md:w-1/2 flex flex-col items-start">
                <div className="w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center font-bold text-lg mb-8">2</div>
                <h3 className="text-3xl font-semibold text-white mb-4 tracking-tight">AI & Market Processing</h3>
                <p className="text-[17px] text-gray-400 leading-relaxed font-medium">Multiple models evaluate circle rates, infrastructure proximity, and market dynamics in real-time, completely bypassing traditional manual delays.</p>
              </div>
              <div className="md:w-1/2 w-full aspect-[4/3] bg-[#0A0A0A] rounded-3xl overflow-hidden relative border border-white/5 shadow-inner">
                 <img src="/image2.png" alt="AI Processing" className="w-full h-full object-cover opacity-90 hover:opacity-100 transition-opacity duration-500" />
              </div>
            </div>

            {/* Step 3 */}
            <div className="sticky top-48 flex flex-col md:flex-row items-center gap-12 md:gap-20 bg-[#111] rounded-[2.5rem] border border-[#222] shadow-[0_-10px_50px_rgba(0,0,0,0.4)] p-8 md:p-14 z-30 transition-all">
              <div className="md:w-1/2 flex flex-col items-start">
                <div className="w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center font-bold text-lg mb-8">3</div>
                <h3 className="text-3xl font-semibold text-white mb-4 tracking-tight">Decision Ready Output</h3>
                <p className="text-[17px] text-gray-400 leading-relaxed font-medium">Instantly receive comprehensive value ranges, resale potential index, and risk flags—all packaged in an RBI-compliant format ready for your underwriting team.</p>
              </div>
              <div className="md:w-1/2 w-full aspect-[4/3] bg-[#0A0A0A] rounded-3xl overflow-hidden relative border border-white/5 shadow-inner">
                 <img src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=800" alt="Decision Ready Output" className="w-full h-full object-cover opacity-90 hover:opacity-100 transition-opacity duration-500" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Metrics Section */}
      <section id="metrics" className="w-full max-w-5xl mx-auto px-6 py-28">
        <div className="flex flex-col md:flex-row items-center justify-between gap-16">
          <div className="md:w-1/3 text-center md:text-left">
            <h2 className="text-3xl font-semibold text-[#111] tracking-tight mb-4">Built for scale and precision.</h2>
            <p className="text-[15px] text-gray-500 font-medium mb-8 leading-relaxed">
              A risk management layer designed specifically to meet the stringent underwriting standards of leading NBFCs like Poonawalla Fincorp.
            </p>
            <button 
              onClick={() => navigate('/signup')}
              className="px-6 py-2.5 border border-[#111] text-[#111] font-medium rounded-full text-[14px] hover:bg-[#111] hover:text-white transition-all shadow-sm"
            >
              Start Assessing
            </button>
          </div>
          
          <div className="md:w-2/3 grid grid-cols-2 gap-4 md:gap-6 w-full">
            <motion.div whileHover={{ y: -5 }} className="p-8 rounded-[1.5rem] bg-white border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)]">
              <div className="text-4xl md:text-5xl font-black text-[#111] mb-2 tracking-tighter">0.68+</div>
              <p className="text-[14px] text-gray-500 font-medium">Average Confidence Score</p>
            </motion.div>
            <motion.div whileHover={{ y: -5 }} className="p-8 rounded-[1.5rem] bg-white border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)]">
              <div className="text-4xl md:text-5xl font-black text-[#111] mb-2 tracking-tighter">100%</div>
              <p className="text-[14px] text-gray-500 font-medium">RBI-Compliant Formatting</p>
            </motion.div>
            <motion.div whileHover={{ y: -5 }} className="p-8 rounded-[1.5rem] bg-white border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)]">
              <div className="text-4xl md:text-5xl font-black text-[#111] mb-2 tracking-tighter">50+</div>
              <p className="text-[14px] text-gray-500 font-medium">Market Signals Evaluated</p>
            </motion.div>
            <motion.div whileHover={{ y: -5 }} className="p-8 rounded-[1.5rem] bg-white border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)]">
              <div className="text-4xl md:text-5xl font-black text-[#111] mb-2 tracking-tighter">&lt; 3s</div>
              <p className="text-[14px] text-gray-500 font-medium">Valuation Turnaround Time</p>
            </motion.div>
          </div>
        </div>
      </section>
 {/* FAQ Section */}
      <section id="faq" className="w-full max-w-3xl mx-auto px-6 py-24 border-t border-gray-100">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-semibold text-[#111] tracking-tight mb-3">Frequently asked questions</h2>
        </div>
        <div className="space-y-4">
          {[
            { q: "How accurate is the AI valuation?", a: "Our AI engines are trained on millions of data points and consistently achieve a 98% accuracy rate compared to ground-truth manual valuations." },
            { q: "Is the final report RBI-compliant?", a: "Yes. Every report generated includes the necessary disclaimers, methodology transparency, and data points required for regulatory compliance." },
            { q: "How do you calculate the Liquidity Index?", a: "We analyze micro-market demand, asset fungibility, legal clarity, and local infrastructure to estimate how quickly an asset can be liquidated." },
            { q: "Can we integrate this into our existing LOS?", a: "Absolutely. COVAL offers a robust API that can plug directly into your Loan Origination System for seamless underwriting." }
          ].map((faq, i) => (
            <details key={i} className="group bg-white border border-gray-100 rounded-2xl p-6 shadow-[0_2px_10px_rgb(0,0,0,0.02)] [&_summary::-webkit-details-marker]:hidden cursor-pointer">
              <summary className="flex items-center justify-between font-medium text-gray-900 text-[15px]">
                {faq.q}
                <span className="ml-4 flex-shrink-0 transition-transform duration-300 group-open:rotate-45">
                  <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                </span>
              </summary>
              <p className="mt-4 text-[14px] text-gray-500 leading-relaxed font-medium">
                {faq.a}
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="w-full max-w-5xl mx-auto px-6 pb-32 relative">
        {/* Colorful glowing background blobs behind the glass */}
        <div className="absolute top-1/2 left-1/4 w-[400px] h-[400px] bg-purple-200/40 blur-[80px] rounded-full -translate-y-1/2 -z-10"></div>
        <div className="absolute top-1/2 right-1/4 w-[400px] h-[400px] bg-blue-200/40 blur-[80px] rounded-full -translate-y-1/2 -z-10"></div>
        
        <div className="relative w-full rounded-[2.5rem] bg-white/60 backdrop-blur-3xl border border-white p-12 md:p-20 text-center overflow-hidden shadow-[0_20px_80px_-15px_rgba(0,0,0,0.15)]">
          <div className="relative z-10 flex flex-col items-center">
            <h2 className="text-3xl md:text-[40px] font-semibold text-[#111] tracking-tight mb-5 leading-tight">
              Ready to redefine your underwriting?
            </h2>
            <p className="text-[16px] text-gray-500 font-medium mb-10 max-w-lg">
              Automate your collateral assessment, mitigate risk, and scale your lending operations with COVAL.
            </p>
            <button
              onClick={() => navigate('/signup')}
              className="px-8 py-4 bg-[#1A1A1A] hover:bg-black text-white text-[15px] font-medium rounded-full transition-all shadow-[0_4px_20px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.15)] hover:-translate-y-0.5"
            >
              Get Started Now
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full bg-[#FAFAFA] border-t border-gray-200/60 pt-16 pb-8">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-start mb-16 gap-12 md:gap-0">
            <div>
              <div className="flex items-center gap-2 mb-6">
                <img src="/coval-logo.png" alt="COVAL Logo" className="h-6 opacity-90 grayscale hover:grayscale-0 transition-all" />
              </div>
              <a href="mailto:contact@coval.in" className="text-[14px] font-medium text-gray-900 hover:underline flex items-center gap-1">
                Watch demo <ArrowRight className="w-3 h-3" />
              </a>
              <p className="text-[13px] text-gray-400 font-medium mt-6">
                © {new Date().getFullYear()} COVAL. All rights reserved.
              </p>
            </div>
            
            <div className="flex gap-16 md:gap-24">
              <div>
                <h4 className="text-[13px] font-semibold text-gray-900 mb-4">Socials</h4>
                <ul className="space-y-3">
                  <li><a href="#" className="text-[13px] text-gray-500 hover:text-gray-900 transition-colors font-medium">LinkedIn</a></li>
                  <li><a href="#" className="text-[13px] text-gray-500 hover:text-gray-900 transition-colors font-medium">Twitter</a></li>
                </ul>
              </div>
              <div>
                <h4 className="text-[13px] font-semibold text-gray-900 mb-4">Legal</h4>
                <ul className="space-y-3">
                  <li><a href="#" className="text-[13px] text-gray-500 hover:text-gray-900 transition-colors font-medium">Privacy Policy</a></li>
                  <li><a href="#" className="text-[13px] text-gray-500 hover:text-gray-900 transition-colors font-medium">Terms of Service</a></li>
                </ul>
              </div>
              <div>
                <h4 className="text-[13px] font-semibold text-gray-900 mb-4">Get Started</h4>
                <ul className="space-y-3">
                  <li><button onClick={() => navigate('/signup')} className="text-[13px] text-gray-500 hover:text-gray-900 transition-colors font-medium">Sign Up</button></li>
                  <li><button onClick={() => navigate('/login')} className="text-[13px] text-gray-500 hover:text-gray-900 transition-colors font-medium">Log In</button></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
