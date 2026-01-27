export function confirm(message, options = {}) {
  return new Promise((resolve) => {
    const { title = 'Confirm', confirmText = 'Confirm', cancelText = 'Cancel', danger = false } = options;
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal modal-confirm">
        <div class="modal-header">
          <h3>${title}</h3>
        </div>
        <div class="modal-body">
          <p>${message}</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" id="modal-cancel">${cancelText}</button>
          <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="modal-confirm">${confirmText}</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add('show'));
    
    const close = (result) => {
      modal.classList.remove('show');
      setTimeout(() => modal.remove(), 150);
      resolve(result);
    };
    
    modal.querySelector('#modal-cancel').onclick = () => close(false);
    modal.querySelector('#modal-confirm').onclick = () => close(true);
    modal.onclick = (e) => { if (e.target === modal) close(false); };
    
    document.addEventListener('keydown', function handler(e) {
      if (e.key === 'Escape') {
        close(false);
        document.removeEventListener('keydown', handler);
      } else if (e.key === 'Enter') {
        close(true);
        document.removeEventListener('keydown', handler);
      }
    });
    
    modal.querySelector('#modal-confirm').focus();
  });
}

export function prompt(message, options = {}) {
  return new Promise((resolve) => {
    const { title = 'Input', placeholder = '', defaultValue = '', confirmText = 'OK', cancelText = 'Cancel' } = options;
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal modal-prompt">
        <div class="modal-header">
          <h3>${title}</h3>
        </div>
        <div class="modal-body">
          <p>${message}</p>
          <input type="text" class="input" id="modal-input" placeholder="${placeholder}" value="${defaultValue}">
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" id="modal-cancel">${cancelText}</button>
          <button class="btn btn-primary" id="modal-confirm">${confirmText}</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add('show'));
    
    const input = modal.querySelector('#modal-input');
    input.focus();
    input.select();
    
    const close = (result) => {
      modal.classList.remove('show');
      setTimeout(() => modal.remove(), 150);
      resolve(result);
    };
    
    modal.querySelector('#modal-cancel').onclick = () => close(null);
    modal.querySelector('#modal-confirm').onclick = () => close(input.value);
    modal.onclick = (e) => { if (e.target === modal) close(null); };
    
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        close(input.value);
      } else if (e.key === 'Escape') {
        close(null);
      }
    });
  });
}

export function alert(message, options = {}) {
  return new Promise((resolve) => {
    const { title = 'Alert', confirmText = 'OK' } = options;
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal modal-alert">
        <div class="modal-header">
          <h3>${title}</h3>
        </div>
        <div class="modal-body">
          <p>${message}</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-primary" id="modal-confirm">${confirmText}</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add('show'));
    
    const close = () => {
      modal.classList.remove('show');
      setTimeout(() => modal.remove(), 150);
      resolve();
    };
    
    modal.querySelector('#modal-confirm').onclick = close;
    modal.onclick = (e) => { if (e.target === modal) close(); };
    
    document.addEventListener('keydown', function handler(e) {
      if (e.key === 'Escape' || e.key === 'Enter') {
        close();
        document.removeEventListener('keydown', handler);
      }
    });
    
    modal.querySelector('#modal-confirm').focus();
  });
}
