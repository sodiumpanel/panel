import { api } from '../../utils/api.js';
import { router } from '../../router.js';
import { renderNav } from '../../components/nav.js';
import { renderAdminSidebar } from '../../components/sidebar.js';
import { toast } from '../../components/toast.js';

export default function render() {
  return `
    ${renderNav()}
    <div class="admin-layout">
      ${renderAdminSidebar('servers')}
      <main class="admin-content">
        <div class="admin-header">
          <h1>Create Server</h1>
          <p class="text-secondary">Create a new game server</p>
        </div>

        <div class="card">
          <div class="card__body">
            <form id="create-server-form">
              <div class="form-row">
                <div class="form-group" style="flex: 2">
                  <label for="name">Server Name</label>
                  <input type="text" id="name" name="name" class="input" placeholder="My Server" required>
                </div>
                <div class="form-group" style="flex: 1">
                  <label for="owner_id">Owner</label>
                  <select id="owner_id" name="owner_id" class="input" required>
                    <option value="">Loading...</option>
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label for="node_id">Node</label>
                <select id="node_id" name="node_id" class="input" required>
                  <option value="">Loading...</option>
                </select>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label for="nest_id">Nest</label>
                  <select id="nest_id" name="nest_id" class="input" required>
                    <option value="">Loading...</option>
                  </select>
                </div>
                <div class="form-group">
                  <label for="egg_id">Egg</label>
                  <select id="egg_id" name="egg_id" class="input" required>
                    <option value="">Select nest first...</option>
                  </select>
                </div>
              </div>

              <div id="docker-image-group" class="form-group" style="display: none;">
                <label for="docker_image">Docker Image</label>
                <select id="docker_image" name="docker_image" class="input">
                  <option value="">Select egg first...</option>
                </select>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label for="memory">Memory (MB)</label>
                  <input type="number" id="memory" name="memory" class="input" value="1024" min="128">
                </div>
                <div class="form-group">
                  <label for="disk">Disk (MB)</label>
                  <input type="number" id="disk" name="disk" class="input" value="10240" min="256">
                </div>
                <div class="form-group">
                  <label for="cpu">CPU (%)</label>
                  <input type="number" id="cpu" name="cpu" class="input" value="100" min="1" max="400">
                </div>
              </div>

              <div id="startup-variables" class="form-group" style="display: none;">
                <label>Startup Variables</label>
                <div id="variables-container"></div>
              </div>

              <div class="form-actions">
                <a href="/admin/servers" class="btn btn-ghost">Cancel</a>
                <button type="submit" class="btn btn-primary">Create Server</button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  `;
}

export async function mount() {
  const form = document.getElementById('create-server-form');
  const ownerSelect = document.getElementById('owner_id');
  const nodeSelect = document.getElementById('node_id');
  const nestSelect = document.getElementById('nest_id');
  const eggSelect = document.getElementById('egg_id');
  const dockerImageGroup = document.getElementById('docker-image-group');
  const dockerImageSelect = document.getElementById('docker_image');
  const startupVarsSection = document.getElementById('startup-variables');
  const variablesContainer = document.getElementById('variables-container');

  let nests = [];
  let eggs = [];
  let selectedEgg = null;

  async function loadInitialData() {
    try {
      const [nodesRes, nestsRes, eggsRes, usersRes] = await Promise.all([
        api.get('/admin/nodes'),
        api.get('/admin/nests'),
        api.get('/admin/eggs'),
        api.get('/admin/users')
      ]);

      const nodes = nodesRes.data || [];
      nests = nestsRes.data || [];
      eggs = eggsRes.data || [];
      const users = usersRes.data || [];

      ownerSelect.innerHTML = '<option value="">Select owner...</option>' +
        users.map(u => `<option value="${u.id}">${u.username} (${u.email})</option>`).join('');

      nodeSelect.innerHTML = '<option value="">Select node...</option>' +
        nodes.map(n => `<option value="${n.id}">${n.name} (${n.fqdn})</option>`).join('');

      nestSelect.innerHTML = '<option value="">Select nest...</option>' +
        nests.map(n => `<option value="${n.id}">${n.name}</option>`).join('');

    } catch (err) {
      console.error('Failed to load data:', err);
      toast.error('Failed to load form data');
    }
  }

  function updateEggsByNest(nestId) {
    const filteredEggs = nestId ? eggs.filter(e => e.nest_id == nestId) : [];
    
    if (filteredEggs.length === 0) {
      eggSelect.innerHTML = '<option value="">No eggs in this nest</option>';
      dockerImageGroup.style.display = 'none';
      startupVarsSection.style.display = 'none';
      return;
    }

    eggSelect.innerHTML = '<option value="">Select egg...</option>' +
      filteredEggs.map(e => `<option value="${e.id}">${e.name}</option>`).join('');
  }

  function updateEggDetails(eggId) {
    selectedEgg = eggs.find(e => e.id == eggId);
    
    if (!selectedEgg) {
      dockerImageGroup.style.display = 'none';
      startupVarsSection.style.display = 'none';
      return;
    }

    // Docker images
    const images = selectedEgg.docker_images || [];
    if (images.length > 0) {
      dockerImageGroup.style.display = 'block';
      dockerImageSelect.innerHTML = images.map((img, i) => 
        `<option value="${img}" ${i === 0 ? 'selected' : ''}>${img}</option>`
      ).join('');
    } else {
      dockerImageGroup.style.display = 'none';
    }

    // Variables
    const variables = selectedEgg.variables || [];
    if (variables.length > 0) {
      startupVarsSection.style.display = 'block';
      variablesContainer.innerHTML = variables.map(v => `
        <div class="form-group">
          <label for="var-${v.env_variable}">${v.name}</label>
          <input type="text" id="var-${v.env_variable}" name="var_${v.env_variable}" 
                 class="input" value="${v.default_value || ''}" placeholder="${v.default_value || ''}">
          ${v.description ? `<p class="form-hint">${v.description}</p>` : ''}
        </div>
      `).join('');
    } else {
      startupVarsSection.style.display = 'none';
    }
  }

  nestSelect.addEventListener('change', () => {
    updateEggsByNest(nestSelect.value);
    dockerImageGroup.style.display = 'none';
    startupVarsSection.style.display = 'none';
  });

  eggSelect.addEventListener('change', () => {
    updateEggDetails(eggSelect.value);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating...';

    const variables = {};
    document.querySelectorAll('#variables-container input').forEach(input => {
      const envVar = input.name.replace('var_', '');
      variables[envVar] = input.value;
    });

    const data = {
      name: form.name.value,
      owner_id: parseInt(form.owner_id.value),
      node_id: parseInt(form.node_id.value),
      egg_id: parseInt(form.egg_id.value),
      memory: parseInt(form.memory.value),
      disk: parseInt(form.disk.value),
      cpu: parseInt(form.cpu.value),
      docker_image: form.docker_image?.value || null,
      variables
    };

    try {
      await api.post('/admin/servers', data);
      toast.success('Server created successfully');
      router.navigate('/admin/servers');
    } catch (err) {
      toast.error(err.message || 'Failed to create server');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create Server';
    }
  });

  await loadInitialData();
}
