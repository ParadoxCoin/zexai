import React, { useEffect, useState } from 'react';
import { CreditCard, Package, DollarSign, CheckCircle } from 'lucide-react';
import { apiService } from '@/services/api';

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  discount: number;
  popular: boolean;
}

export const BillingPage: React.FC = () => {
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    loadPackages();
  }, []);

  const loadPackages = async () => {
    try {
      const response = await apiService.get<CreditPackage[]>('/billing/packages');
      if (response.success && response.data) {
        setPackages(response.data);
      }
    } catch (error) {
      console.error('Failed to load packages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (packageId: string) => {
    setPurchasing(packageId);
    try {
      const response = await apiService.post('/billing/purchase', { package_id: packageId });
      if (response.success) {
        alert('Purchase successful! Credits added to your account.');
      }
    } catch (error: any) {
      alert(error.message || 'Purchase failed');
    } finally {
      setPurchasing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading packages...</div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Billing & Credits</h1>
          <p className="mt-2 text-sm text-gray-700">
            Purchase credit packages to use AI services
          </p>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {packages.map((pkg) => (
          <div
            key={pkg.id}
            className={`relative bg-white rounded-lg shadow-sm border-2 ${
              pkg.popular ? 'border-blue-500' : 'border-gray-200'
            } p-6`}
          >
            {pkg.popular && (
              <div className="absolute top-0 right-0 -mt-3 -mr-3">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-500 text-white">
                  Popular
                </span>
              </div>
            )}

            <div className="flex items-center justify-between mb-4">
              <Package className="h-8 w-8 text-blue-500" />
              {pkg.discount > 0 && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {pkg.discount}% OFF
                </span>
              )}
            </div>

            <h3 className="text-xl font-semibold text-gray-900 mb-2">{pkg.name}</h3>
            
            <div className="mb-4">
              <div className="flex items-baseline">
                <span className="text-3xl font-bold text-gray-900">${pkg.price}</span>
                <span className="ml-2 text-sm text-gray-500">USD</span>
              </div>
              <div className="mt-1 text-sm text-gray-600">
                {pkg.credits.toLocaleString()} credits
              </div>
            </div>

            <ul className="space-y-2 mb-6">
              <li className="flex items-center text-sm text-gray-600">
                <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                All AI services included
              </li>
              <li className="flex items-center text-sm text-gray-600">
                <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                No expiration
              </li>
              <li className="flex items-center text-sm text-gray-600">
                <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                Priority support
              </li>
            </ul>

            <button
              onClick={() => handlePurchase(pkg.id)}
              disabled={purchasing === pkg.id}
              className={`w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
                pkg.popular
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-gray-600 hover:bg-gray-700'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50`}
            >
              <CreditCard className="h-4 w-4 mr-2" />
              {purchasing === pkg.id ? 'Processing...' : 'Purchase'}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-12 bg-blue-50 rounded-lg p-6">
        <div className="flex items-start">
          <DollarSign className="h-6 w-6 text-blue-600 mt-1" />
          <div className="ml-4">
            <h3 className="text-lg font-medium text-gray-900">Payment Methods</h3>
            <p className="mt-2 text-sm text-gray-600">
              We accept credit cards, cryptocurrency, Binance Pay, and MetaMask (15% discount).
            </p>
            <div className="mt-4 flex items-center space-x-4">
              <span className="text-sm text-gray-500">💳 Credit Card</span>
              <span className="text-sm text-gray-500">₿ Crypto</span>
              <span className="text-sm text-gray-500">🔶 Binance Pay</span>
              <span className="text-sm text-gray-500">🦊 MetaMask</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
