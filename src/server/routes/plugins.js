import express from 'express';
import { authenticateUser, requireAdmin } from '../utils/auth.js';
import {
  getAllPlugins, activatePlugin, deactivatePlugin,
  getPluginSettings, savePluginSettings
} from '../plugins/manager.js';

const router = express.Router();

// List all plugins
router.get('/', authenticateUser, requireAdmin, (req, res) => {
  res.json({ plugins: getAllPlugins() });
});

// Activate a plugin
router.post('/:id/activate', authenticateUser, requireAdmin, async (req, res) => {
  try {
    await activatePlugin(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Deactivate a plugin
router.post('/:id/deactivate', authenticateUser, requireAdmin, async (req, res) => {
  try {
    await deactivatePlugin(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get plugin settings
router.get('/:id/settings', authenticateUser, requireAdmin, (req, res) => {
  const settings = getPluginSettings(req.params.id);
  if (!settings) return res.status(404).json({ error: 'Plugin not found' });
  res.json(settings);
});

// Save plugin settings
router.put('/:id/settings', authenticateUser, requireAdmin, (req, res) => {
  try {
    savePluginSettings(req.params.id, req.body.values || {});
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
