import { api, getToken } from './api.js';

class State {
  constructor() {
    this._user = null;
    this._loaded = false;
  }

  get user() {
    if (this._user) return this._user;
    const token = getToken();
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return { id: payload.id, username: payload.username, isAdmin: payload.isAdmin };
    } catch {
      return null;
    }
  }

  get username() {
    return this.user?.username || '';
  }

  get isAdmin() {
    return this.user?.isAdmin || false;
  }

  get isLoggedIn() {
    return !!getToken();
  }

  async load() {
    if (this._loaded || !getToken()) return;
    const username = this.username;
    if (!username) return;
    try {
      const res = await api(`/api/user/profile?username=${encodeURIComponent(username)}&viewer=${encodeURIComponent(username)}`);
      const data = await res.json();
      if (data.user) {
        this._user = data.user;
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
