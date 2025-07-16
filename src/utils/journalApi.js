
import axios from 'axios';
const API_URL = `${import.meta.env.VITE_API_URL}/journal`;
function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const getJournalEntries = async (page = 1, pageSize = 4) => {
  const res = await axios.get(`${API_URL}?page=${page}&pageSize=${pageSize}`, {
    headers: {
      ...getAuthHeaders()
    }
  });
  return res.data;
};

export const postJournalEntry = async (data) => {
  const res = await axios.post(API_URL, data, {
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    }
  });
  return res.data;
};


export const updateJournalEntry = async (id, data) => {
  const url = `${API_URL}/${id}`;
  console.log('[updateJournalEntry] PUT', url, 'data:', data);
  const res = await axios.put(url, data, {
    headers: {
      ...getAuthHeaders()
    }
  });
  return res.data;
};


export const deleteJournalEntry = async (id) => {
  const url = `${API_URL}/${id}`;
  console.log('[deleteJournalEntry] DELETE', url);
  const res = await axios.delete(url, {
    headers: {
      ...getAuthHeaders()
    }
  });
  return res.data;
};
