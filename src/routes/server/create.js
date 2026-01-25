import { api } from '../../utils/api.js';
import { router } from '../../router.js';
import { renderNav } from '../../components/nav.js';
import { toast } from '../../components/toast.js';

export default function render() {
  return `
    ${renderNav()}
    <main class="main-content">
      <div class="container">
        <div class="page-header">
          <h1>Create Server</h1>
          <p class="text-secondary">Create a new game server</p>
        </div>

        <div class="card">
          <div class="card__body">
            <form id="create-server-form">
              <div class="form-group">
                <label for="name">Server Name</label>
                <input type="text" id="name" name="name" class="input" placeholder="My Awesome Server" required>
              </div>

              <div class="form-group">
                <label for="node_id">Node</label>
                <select id="node_id" name="node_id" class="input" required>
                  <option value="">Loading...</option>
                </select>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label for="nest_id">Category</label>
                  <select id="nest_id" name="nest_id" class="input" required>
                    <option value="">Loading...</option>
                  </select>
                </div>
                <div class="form-group">
                  <label for="egg_id">Game / Egg</label>
                  <select id="egg_id" name="egg_id" class="input" required>
                    <option value="">Select category first...</option>
                  </select>
                </div>
              </div>

              <div id="docker-image-group" class="form-group" style="display: none;">
                <label for="docker_image">Docker Image</label>
                <select id="docker_image" name="docker_image" class="input">
                  <option value="">Select game first...</option>
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
                <label>Configuration</label>
                <div id="variables-container"></div>
              </div>

              <div class="form-actions">
                <a href="/servers" class="btn btn-ghost">Cancel</a>
                <button type="submit" class="btn btn-primary">Create Server</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </main>
  `;
}

export async function mount() {
  const form = document.getElementById('create-server-form');
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
      const [nodesRes, nestsRes, eggsRes] = await Promise.all([
        api.get('/nodes'),
        api.get('/servers/data/nests'),
        api.get('/servers/data/eggs')
      ]);

      const nodes = nodesRes.data || [];
      nests = nestsRes.data || [];
      eggs = eggsRes.data || [];

      nodeSelect.innerHTML = '<option value="">Select node...</option>' +
        nodes.map(n => `<option value="${n.id}">${n.name}</option>`).join('');

      nestSelect.innerHTML = '<option value="">Select category...</option>' +
        nests.map(n => `<option value="${n.id}">${n.name}</option>`).join('');

    } catch (err) {
      console.error('Failed to load data:', err);
      toast.error('Failed to load form data');
    }
  }

  function updateEggsByNest(nestId) {
    const filteredEggs = nestId ? eggs.filter(e => e.nest_id == nestId) : [];
    
    if (filteredEggs.length === 0) {
      eggSelect.innerHTML = '<option value="">No games in this category</option>';
      dockerImageGroup.style.display = 'none';
      startupVarsSection.style.display = 'none';
      return;
    }

    eggSelect.innerHTML = '<option value="">Select game...</option>' +
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

    // Variables - only show user-editable ones
    const variables = (selectedEgg.variables || []).filter(v => v.user_viewable !== false);
    if (variables.length > 0) {
      startupVarsSection.style.display = 'block';
      variablesContainer.innerHTML = variables.map(v => `
        <div class="form-group">
          <label for="var-${v.env_variable}">${v.name}</label>
          <input type="text" id="var-${v.env_variable}" name="var_${v.env_variable}" 
                 class="input" value="${v.default_value || ''}" placeholder="${v.default_value || ''}"
                 ${v.user_editable === false ? 'readonly' : ''}>
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
      node_id: parseInt(form.node_id.value),
      egg_id: parseInt(form.egg_id.value),
      memory: parseInt(form.memory.value),
      disk: parseInt(form.disk.value),
      cpu: parseInt(form.cpu.value),
      docker_image: form.docker_image?.value || null,
      variables
    };

    try {
      const res = await api.post('/servers', data);
      toast.success('Server created successfully');
      router.navigate(`/server/${res.data.uuid}/console`);
    } catch (err) {
      toast.error(err.message || 'Failed to create server');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create Server';
    }
  });

  await loadInitialData();
}
