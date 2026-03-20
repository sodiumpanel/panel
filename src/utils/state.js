import { api, getToken } from './api.js';

class State {
  constructor() {
    this._user = null;
    this._loaded = false;
  }

  get user() {
    return this._user;
  }

  get username() {
    return this._user?.username || '';
  }

  get isAdmin() {
    return this._user?.isAdmin || false;
  }

  get isLoggedIn() {
    return !!getToken();
  }

  async load() {
    if (this._loaded || !getToken()) return;
    try {
      const res = await api('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        this._user = data;
        this._loaded = true;
      }
    } catch {}
  }

  clear() {
    this._user = null;
    this._loaded = false;
  }

  update(fields) {
    if (this._user) {
      Object.assign(this._user, fields);
    }
  }
}

export const state = new State();
