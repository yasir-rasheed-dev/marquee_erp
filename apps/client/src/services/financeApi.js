import apiClient from './apiClient';

// TODO: Implement financeApi endpoints
export const getAll = () => apiClient.get('/');
export const getById = (id) => apiClient.get(\//\\);
export const create = (data) => apiClient.post('/', data);
export const update = (id, data) => apiClient.put(\//\\, data);
export const remove = (id) => apiClient.delete(\//\\);

export default { getAll, getById, create, update, remove };
