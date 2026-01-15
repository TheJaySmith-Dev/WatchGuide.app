import React, { useEffect, useState } from 'react';
import { X, Loader2, DollarSign } from 'lucide-react';
import { revenuecatService } from '../services/revenuecat';

interface PaywallProps {
  onClose: () => void;
}

const Paywall: React.FC<PaywallProps> = ({ onClose }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [packages, setPackages] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        await revenuecatService.init();
        const offerings = await revenuecatService.getOfferings();
        const current = (offerings as any)?.current;
        const pkgs = current?.availablePackages || current?.packages || [];
        setPackages(pkgs);
      } catch (e: any) {
        setError(e?.message || 'Failed to load offerings');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const purchase = async (pkg: any) => {
    try {
      setError(null);
      setLoading(true);
      const identifier = pkg?.identifier || pkg?.package?.identifier || pkg?.id;
      await revenuecatService.purchasePackage(identifier);
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Purchase failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="bg-[#101010] border border-white/10 rounded-3xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl">
        <div className="p-6 border-b border-white/10 flex justify-between items-center sticky top-0 bg-[#101010] rounded-t-3xl z-10">
          <h3 className="text-xl font-bold text-white">Watch Guide Premium</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 space-y-4 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="animate-spin text-white" />
            </div>
          )}
          {error && (
            <div className="text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-sm">
              {error}
            </div>
          )}
          {!loading && !error && packages.length === 0 && (
            <div className="text-gray-300 bg-white/5 border border-white/10 rounded-xl p-4 text-sm">
              No offerings found. Configure products and offerings in RevenueCat, then reload.
            </div>
          )}
          <div className="space-y-3">
            {packages.map((pkg) => {
              const product = (pkg.product || pkg.storeProduct || {}) as any;
              const title = product.title || product.name || 'Subscription';
              const price = product.priceString || (product.price && product.currency ? `${product.currency} ${product.price}` : '');
              return (
                <div key={pkg.identifier} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl">
                  <div>
                    <div className="text-white font-semibold">{title}</div>
                    <div className="text-gray-400 text-sm">{price}</div>
                  </div>
                  <button
                    onClick={() => purchase(pkg)}
                    className="px-4 py-2 bg-indigo-600/20 border border-indigo-500/30 rounded-xl hover:bg-indigo-600/30 transition-all text-indigo-300 text-sm font-medium flex items-center gap-2"
                  >
                    <DollarSign size={16} />
                    Subscribe
                  </button>
                </div>
              );
            })}
          </div>
          <button
            onClick={() => revenuecatService.openCustomerCenter()}
            className="w-full mt-2 px-4 py-2 bg-white/10 border border-white/20 rounded-xl hover:bg-white/15 transition-all text-white/80 text-sm font-medium"
          >
            Manage Subscription
          </button>
        </div>
      </div>
    </div>
  );
};

export default Paywall;

