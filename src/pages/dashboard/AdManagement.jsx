import React, { useState, useEffect } from 'react';
import { FaPlus, FaFilter, FaSearch, FaEye, FaChartLine, FaEdit, FaTrash, FaPlay, FaPause, FaCopy } from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import AdCard from '../../components/AdCard';

const AdManagement = () => {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAd, setSelectedAd] = useState(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const navigate = useNavigate();

  // Fetch user's ads
  useEffect(() => {
    fetchUserAds();
  }, []);

  const fetchUserAds = async () => {
    try {
      const token = localStorage.getItem('token');
      const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
      const response = await fetch(`${API_BASE}/ads`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();
      if (result.success) {
        setAds(result.data?.ads || []);
      } else {
        setError(result.message || 'Failed to fetch ads');
      }
    } catch (err) {
      console.error('Error fetching ads:', err);
      setError('Failed to fetch ads');
    } finally {
      setLoading(false);
    }
  };

  // Filter and search ads
  const filteredAds = ads.filter(ad => {
    const matchesFilter = filter === 'all' || ad.status === filter;
    const matchesSearch = ad.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ad.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Status counts for filter badges
  const statusCounts = ads.reduce((acc, ad) => {
    acc[ad.status] = (acc[ad.status] || 0) + 1;
    acc.all = (acc.all || 0) + 1;
    return acc;
  }, {});

  const getStatusColor = (status) => {
    const colors = {
      draft: 'bg-gray-500',
      pending_payment: 'bg-yellow-500',
      pending_approval: 'bg-orange-500',
      active: 'bg-green-500',
      paused: 'bg-blue-500',
      completed: 'bg-purple-500',
      cancelled: 'bg-red-500',
      rejected: 'bg-red-600'
    };
    return colors[status] || 'bg-gray-500';
  };

  const getStatusText = (status) => {
    const texts = {
      draft: 'Draft',
      pending_payment: 'Pending Payment',
      pending_approval: 'Pending Approval',
      active: 'Active',
      paused: 'Paused',
      completed: 'Completed',
      cancelled: 'Cancelled',
      rejected: 'Rejected'
    };
    return texts[status] || status;
  };

  const handleViewAd = (ad) => {
    setSelectedAd(ad);
    setShowAnalytics(true);
  };

  const handleEditAd = (ad) => {
    // Navigate to edit page (you can implement this later)
    console.log('Edit ad:', ad._id);
  };

  const handleDeleteAd = async (ad) => {
    if (!window.confirm('Are you sure you want to delete this ad?')) return;

    try {
      const token = localStorage.getItem('token');
      const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
      const response = await fetch(`${API_BASE}/ads/${ad._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();
      if (result.success) {
        setAds(ads.filter(a => a._id !== ad._id));
      } else {
        alert(result.message || 'Failed to delete ad');
      }
    } catch (err) {
      console.error('Error deleting ad:', err);
      alert('Failed to delete ad');
    }
  };

  const handleDuplicateAd = (ad) => {
    // Navigate to creation page with pre-filled data
    navigate('/dashboard/ad-creation', { state: { duplicateFrom: ad } });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#a99d6b]"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Ad Management
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              Manage your advertisements and track their performance
            </p>
          </div>
          <Link 
            to="/dashboard/ad-creation"
            className="inline-flex items-center px-4 py-2 bg-[#a99d6b] hover:bg-[#968B5C] text-white rounded-lg font-medium transition-colors"
          >
            <FaPlus className="mr-2" />
            Create New Ad
          </Link>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <FaEye className="text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Ads</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{ads.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <FaPlay className="text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Active</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{statusCounts.active || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <FaPause className="text-orange-600 dark:text-orange-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Pending</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {(statusCounts.pending_approval || 0) + (statusCounts.pending_payment || 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <FaChartLine className="text-purple-600 dark:text-purple-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Completed</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{statusCounts.completed || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Status Filters */}
          <div className="flex flex-wrap gap-2">
            {['all', 'active', 'pending_approval', 'pending_payment', 'paused', 'completed', 'draft', 'rejected'].map(status => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  filter === status
                    ? 'bg-[#a99d6b] text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {status === 'all' ? 'All' : getStatusText(status)}
                {statusCounts[status] && (
                  <span className="ml-1">({statusCounts[status]})</span>
                )}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search ads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#a99d6b] focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Ads Grid */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
          <p className="text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {filteredAds.length === 0 ? (
        <div className="text-center py-12">
          <FaEye className="mx-auto text-4xl text-gray-400 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            {searchTerm || filter !== 'all' ? 'No ads found' : 'No ads created yet'}
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            {searchTerm || filter !== 'all' 
              ? 'Try adjusting your search or filter criteria.'
              : 'Create your first advertisement to get started.'
            }
          </p>
          {!searchTerm && filter === 'all' && (
            <Link 
              to="/dashboard/ad-creation"
              className="inline-flex items-center px-4 py-2 bg-[#a99d6b] hover:bg-[#968B5C] text-white rounded-lg font-medium transition-colors"
            >
              <FaPlus className="mr-2" />
              Create Your First Ad
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {filteredAds.map(ad => (
            <div key={ad._id} className="relative group">
              <AdCard
                ad={ad}
                onView={handleViewAd}
                onEdit={handleEditAd}
                onDelete={handleDeleteAd}
                showAnalytics={true}
              />
              
              {/* Quick Actions Overlay */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex gap-1">
                  <button
                    onClick={() => handleDuplicateAd(ad)}
                    className="p-2 bg-white dark:bg-gray-800 rounded-full shadow-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    title="Duplicate Ad"
                  >
                    <FaCopy className="text-gray-600 dark:text-gray-300 text-sm" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdManagement;
