import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { oneDark } from '@codemirror/theme-one-dark';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { python } from '@codemirror/lang-python';
import { java } from '@codemirror/lang-java';
import { php } from '@codemirror/lang-php';
import { xml } from '@codemirror/lang-xml';
import { yaml } from '@codemirror/lang-yaml';
import { markdown } from '@codemirror/lang-markdown';
import { keymap } from '@codemirror/view';

const languageMap = {
  'js': javascript,
  'jsx': () => javascript({ jsx: true }),
  'ts': () => javascript({ typescript: true }),
  'tsx': () => javascript({ jsx: true, typescript: true }),
  'mjs': javascript,
  'cjs': javascript,
  'json': json,
  'html': html,
  'htm': html,
  'css': css,
  'scss': css,
  'less': css,
  'py': python,
  'python': python,
  'java': java,
  'php': php,
  'xml': xml,
  'svg': xml,
  'yaml': yaml,
  'yml': yaml,
  'md': markdown,
  'markdown': markdown
};

function getLanguage(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  const langFn = languageMap[ext];
  if (langFn) {
    return langFn();
  }
  return [];
}

export function createEditor(container, content, filename, onSave) {
  const saveKeymap = keymap.of([{
    key: 'Mod-s',
    run: () => {
      if (onSave) onSave();
      return true;
    }
  }]);

  const state = EditorState.create({
    doc: content || '',
    extensions: [
      basicSetup,
      oneDark,
      saveKeymap,
      getLanguage(filename),
      EditorView.theme({
        '&': {
          height: '100%',
          fontSize: '13px'
        },
        '.cm-scroller': {
          fontFamily: '"JetBrains Mono", "Fira Code", "Monaco", monospace',
          lineHeight: '1.5'
        },
        '.cm-gutters': {
          backgroundColor: '#0d1117',
          borderRight: '1px solid #21262d'
        },
        '.cm-activeLineGutter': {
          backgroundColor: '#161b22'
        },
        '.cm-activeLine': {
          backgroundColor: '#161b2280'
        }
      }),
      EditorView.lineWrapping
    ]
  });

  const view = new EditorView({
    state,
    parent: container
  });

  return {
    getValue: () => view.state.doc.toString(),
    setValue: (value) => {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: value }
      });
    },
    destroy: () => view.destroy(),
    focus: () => view.focus()
  };
}
