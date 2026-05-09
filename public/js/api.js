let BASE = 'http://127.0.0.1:5100';

const api = {
  setPort(port) { BASE = `http://127.0.0.1:${port}`; },

  async get(path) {
    const r = await fetch(BASE + path);
    return r.json();
  },

  async post(path, body) {
    const r = await fetch(BASE + path, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return r.json();
  },

  async put(path, body) {
    const r = await fetch(BASE + path, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return r.json();
  },

  async del(path) {
    const r = await fetch(BASE + path, { method: 'DELETE' });
    return r.json();
  },
};
