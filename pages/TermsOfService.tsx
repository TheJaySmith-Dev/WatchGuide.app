import React from 'react';
import { ArrowLeft } from 'lucide-react';

const TermsOfService: React.FC = () => {
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
        <div className="max-w-3xl mx-auto px-6 py-12 md:py-16">
          <h1 className="text-3xl md:text-4xl font-black mb-4">Terms of Service</h1>
          <p className="text-gray-400 text-sm mb-8">
            These Terms of Service (&quot;Terms&quot;) govern your access to and use of the Watch Guide
            application (&quot;App&quot;). By using the App you agree to be bound by these Terms.
          </p>

          <div className="space-y-8 text-sm text-gray-300">
            <section>
              <h2 className="text-lg font-semibold text-white mb-2">1. Use of the App</h2>
              <p className="text-gray-400">
                Watch Guide is a companion experience for discovering film and TV content. You are responsible
                for complying with all applicable laws and for any activity that occurs under your account or device.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white mb-2">2. Accounts and Subscriptions</h2>
              <p className="text-gray-400">
                Certain features may require an account or a paid subscription. Subscriptions are processed
                securely via our billing partner through RevenueCat. Billing terms, renewal, and cancellation
                are managed by your payment provider as surfaced in the Customer Center.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white mb-2">3. Third-Party Services</h2>
              <p className="text-gray-400">
                Watch Guide integrates with third-party services such as streaming providers, metadata APIs,
                and billing platforms. We do not control and are not responsible for the content or policies
                of those services.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white mb-2">4. Intellectual Property</h2>
              <p className="text-gray-400">
                The App&apos;s design, code, and original content are owned by the creator of Watch Guide and are
                protected by applicable intellectual property laws. You may not copy, modify, or distribute the App
                except as permitted by law.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white mb-2">5. Disclaimer of Warranty</h2>
              <p className="text-gray-400">
                The App is provided on an &quot;as is&quot; and &quot;as available&quot; basis without warranties of any kind,
                whether express or implied. We do not guarantee that the App will be uninterrupted or error-free.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white mb-2">6. Limitation of Liability</h2>
              <p className="text-gray-400">
                To the maximum extent permitted by law, Watch Guide shall not be liable for any indirect,
                incidental, special, or consequential damages arising out of or in connection with your use
                of the App.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white mb-2">7. Changes to These Terms</h2>
              <p className="text-gray-400">
                We may update these Terms from time to time. Continued use of the App after changes become
                effective constitutes acceptance of the revised Terms.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white mb-2">8. Contact</h2>
              <p className="text-gray-400">
                For any questions about these Terms or the App, please contact the Watch Guide maintainer.
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TermsOfService;

