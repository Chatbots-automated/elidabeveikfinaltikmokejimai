import React from 'react';
import { X, Plus, Minus, ShoppingBag, Trash2, User } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface CartProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Cart({ isOpen, onClose }: CartProps) {
  const navigate = useNavigate();
  const { cart, removeFromCart, updateCartItemQuantity, getCartTotal, clearCart } = useStore();
  const { user } = useAuth();

  const handleCheckout = () => {
    onClose();
    navigate('/checkout');
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm transition-opacity z-40"
        onClick={onClose}
      />
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShoppingBag className="h-6 w-6 text-elida-gold" />
              <h2 className="text-xl font-bold text-gray-900">Krepšelis</h2>
            </div>
            <div className="flex items-center gap-4">
              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                  Išvalyti
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <ShoppingBag className="h-16 w-16 text-gray-300 mb-4" />
              <p className="text-gray-500 text-lg mb-2">Jūsų krepšelis tuščias</p>
              <p className="text-gray-400 text-sm">Pridėkite prekių, kad galėtumėte pradėti</p>
            </div>
          ) : (
            <div className="p-6 space-y-6">
              {cart.map((item) => (
                <div key={`${item.id}-${item.selectedSize}-${item.selectedColor}`} 
                     className="flex gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <div className="w-24 h-24 rounded-lg overflow-hidden bg-white">
                    <img
                      src={item.imageurl}
                      alt={item.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/elida-logo.svg';
                        target.className = 'w-full h-full object-contain p-2';
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <h3 className="font-semibold text-gray-900">{item.name}</h3>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                    {item.selectedSize && (
                      <p className="text-sm text-gray-600">Dydis: {item.selectedSize}</p>
                    )}
                    {item.selectedColor && (
                      <p className="text-sm text-gray-600">Spalva: {item.selectedColor}</p>
                    )}
                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center border border-gray-200 rounded-lg bg-white">
                        <button
                          onClick={() => updateCartItemQuantity(item.id, item.quantity - 1)}
                          className="p-2 hover:bg-gray-50 transition-colors rounded-l-lg"
                          disabled={item.quantity <= 1}
                        >
                          <Minus className="h-4 w-4 text-gray-600" />
                        </button>
                        <span className="px-4 py-2 font-medium text-gray-900">{item.quantity}</span>
                        <button
                          onClick={() => updateCartItemQuantity(item.id, item.quantity + 1)}
                          className="p-2 hover:bg-gray-50 transition-colors rounded-r-lg"
                        >
                          <Plus className="h-4 w-4 text-gray-600" />
                        </button>
                      </div>
                      <p className="font-semibold text-gray-900">€{(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {cart.length > 0 && (
          <div className="border-t border-gray-100 p-6 bg-white">
            <div className="space-y-4 mb-6">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Tarpinė suma</span>
                <span>€{getCartTotal(false).toFixed(2)}</span>
              </div>
              {user && (
                <div className="flex justify-between text-sm text-green-600">
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    <span>Narystės nuolaida</span>
                  </div>
                  <span>-15%</span>
                </div>
              )}
              <div className="flex justify-between text-sm text-gray-600">
                <span>Pristatymas</span>
                <span>Apskaičiuojama užsakymo metu</span>
              </div>
              <div className="flex justify-between text-lg font-semibold text-gray-900">
                <span>Viso</span>
                <div className="flex flex-col items-end">
                  <span>€{getCartTotal(!!user).toFixed(2)}</span>
                  {user && (
                    <span className="text-sm text-gray-500 line-through">
                      €{getCartTotal(false).toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={handleCheckout}
              className="w-full bg-gradient-to-r from-elida-gold to-elida-accent text-white py-4 rounded-xl 
                       font-semibold hover:shadow-lg focus:ring-4 focus:ring-elida-gold/50 transition-all duration-300"
            >
              Pereiti prie apmokėjimo
            </button>
          </div>
        )}
      </div>
    </>
  );
}