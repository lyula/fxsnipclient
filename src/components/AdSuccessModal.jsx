import React from 'react';
import { FaCheckCircle, FaEye, FaCog } from 'react-icons/fa';
import ModalPortal from './ModalPortal';

const AdSuccessModal = ({ isOpen, onClose, onViewAd, onManageAds }) => {
  if (!isOpen) return null;

  return (
    <ModalPortal onClose={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 transform transition-all">
        {/* Success Icon */}
        <div className="text-center mb-6">
          <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
            <FaCheckCircle className="text-green-600 dark:text-green-400 text-3xl" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Ad Created Successfully!
          </h2>
          <p className="text-gray-600 dark:text-gray-300 text-sm">
            Your advertisement has been created and is now pending approval. 
            You'll receive a notification once it's reviewed.
          </p>
        </div>

        {/* Status Info */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
          <div className="flex items-center text-blue-800 dark:text-blue-300">
            <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
            <span className="text-sm font-medium">Status: Pending Approval</span>
          </div>
          <p className="text-blue-700 dark:text-blue-400 text-xs mt-2">
            Your ad will be reviewed within 24-48 hours. You'll be notified via email and in-app notification once approved.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={onManageAds}
            className="w-full bg-[#a99d6b] hover:bg-[#968B5C] text-white px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center"
          >
            <FaCog className="mr-2" />
            Manage My Ads
          </button>
          
          <button
            onClick={onViewAd}
            className="w-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center"
          >
            <FaEye className="mr-2" />
            Preview Ad
          </button>

          <button
            onClick={onClose}
            className="w-full text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 px-4 py-2 text-sm font-medium transition-colors"
          >
            Close
          </button>
        </div>

        {/* Additional Info */}
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Need help? Visit our{' '}
            <span className="text-blue-600 dark:text-blue-400 cursor-pointer hover:underline">
              Ad Guidelines
            </span>{' '}
            or contact support.
          </p>
        </div>
      </div>
    </ModalPortal>
  );
};

export default AdSuccessModal;
