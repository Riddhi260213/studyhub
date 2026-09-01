/**
 * StudyHub API Client — fetch wrapper centralising all backend communication.
 */
const API = (() => {
  const BASE = '/api';
  async function request(method, path, body) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (body !== undefined) opts.body = JSON.stringify(body);
    let res;
    try { res = await fetch(BASE + path, opts); }
    catch (e) { throw new Error('Cannot reach the server. Is the backend running?'); }
    let data = null;
    const text = await res.text();
    if (text) { try { data = JSON.parse(text); } catch {} }
    if (!res.ok) {
      const msg = (data && data.error) || `Request failed (${res.status})`;
      const err = new Error(msg); err.status = res.status; err.data = data;
      throw err;
    }
    return data;
  }
  return {
    getSubjects: () => request('GET', '/subjects'),
    createSubject: (s) => request('POST', '/subjects', s),
    updateSubject: (id, s) => request('PUT', `/subjects/${id}`, s),
    deleteSubject: (id) => request('DELETE', `/subjects/${id}`),
    getTasks: () => request('GET', '/tasks'),
    createTask: (t) => request('POST', '/tasks', t),
    updateTask: (id, t) => request('PUT', `/tasks/${id}`, t),
    patchTask: (id, patch) => request('PATCH', `/tasks/${id}`, patch),
    deleteTask: (id) => request('DELETE', `/tasks/${id}`),
    getStats: () => request('GET', '/stats'),
  };
})();
