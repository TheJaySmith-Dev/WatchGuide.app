import React from 'react';
import { Crown, ArrowLeft, CheckCircle2 } from 'lucide-react';

const Pricing: React.FC = () => {
  const goHome = (e: React.MouseEvent) => {
    e.preventDefault();
    window.history.pushState({}, '', '/');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col">
      <header className="w-full border-b border-white/10 bg-black/60 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" onClick={goHome} className="flex items-center gap-2 text-sm text-gray-300 hover:text-white">
            <ArrowLeft size={16} />
            Back to app
          </a>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-widest text-indigo-400">Watch Guide</span>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center p-2 rounded-full bg-indigo-600/20 border border-indigo-500/40 mb-4">
              <Crown className="text-indigo-400" size={20} />
            </div>
            <h1 className="text-3xl md:text-4xl font-black mb-4">Watch Guide Premium</h1>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Unlock a cinematic, distraction-free companion for your streaming nights, powered by smart recommendations and deep metadata.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-[1.4fr,1fr] items-start">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-8 md:p-10 shadow-2xl">
              <h2 className="text-xl font-semibold mb-2">What you get</h2>
              <p className="text-gray-400 text-sm mb-6">
                Designed for movie lovers and series completists who care about more than just what&apos;s trending.
              </p>
              <div className="space-y-3">
                {[
                  'Premium AI-powered discovery tuned for film and TV, not generic search',
                  'Beautiful, cinematic layouts optimized for the couch and big screens',
                  'Smarter watchlist tools that work with your existing services',
                  'Priority access to new features and experiments',
                ].map((line) => (
                  <div key={line} className="flex items-start gap-3 text-sm text-gray-200">
                    <CheckCircle2 className="text-emerald-400 mt-[2px]" size={18} />
                    <span>{line}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-indigo-600/10 border border-indigo-500/40 rounded-3xl p-8 md:p-10 flex flex-col items-stretch">
              <div className="mb-6">
                <div className="text-xs font-semibold tracking-widest text-indigo-300 uppercase mb-2">
                  Single plan
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black">$X.XX</span>
                  <span className="text-gray-400 text-sm">per month</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Exact pricing is managed securely by RevenueCat and Stripe.
                </div>
              </div>
              <button
                onClick={goHome}
                className="w-full py-3 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-sm font-semibold transition-colors shadow-lg shadow-indigo-500/30"
              >
                Open app to subscribe
              </button>
              <p className="text-[11px] text-gray-400 mt-3">
                Subscriptions are handled through RevenueCat. You can manage or cancel anytime from the Customer Center.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Pricing;

