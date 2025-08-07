import axios from 'axios';

const API_BASE = '/api/ad-interactions';

export const likeAd = async (adId) => {
  const token = localStorage.getItem('token');
  const res = await axios.post(
    `${API_BASE}/${adId}/like`,
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return res.data;
};

export const commentAd = async (adId, text) => {
  const token = localStorage.getItem('token');
  const res = await axios.post(
    `${API_BASE}/${adId}/comment`,
    { text },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return res.data;
};

export const replyAdComment = async (adId, commentId, text) => {
  const token = localStorage.getItem('token');
  const res = await axios.post(
    `${API_BASE}/${adId}/comment/${commentId}/reply`,
    { text },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return res.data;
};

export const shareAd = async (adId) => {
  const token = localStorage.getItem('token');
  const res = await axios.post(
    `${API_BASE}/${adId}/share`,
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return res.data;
};

export const viewAd = async (adId) => {
  const token = localStorage.getItem('token');
  const res = await axios.post(
    `${API_BASE}/${adId}/view`,
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return res.data;
};

export const getAdInteractions = async (adId) => {
  const token = localStorage.getItem('token');
  const res = await axios.get(
    `${API_BASE}/${adId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return res.data;
};
