import { editorialChange, validRange, wordAt } from './latin-context-edit.js';

const editors = new WeakMap();
const fine = matchMedia('(pointer: fine)');
let openMenu, touchButton, touchTarget, pressed;

function node(tag, label, className) {
  const element = document.createElement(tag);
  if (label) element.textContent = label;
  if (className) element.className = className;
  if (tag === 'button') element.type = 'button';
  return element;
}

function selection(field) {
  if (field instanceof HTMLTextAreaElement) {
    const start = field.selectionStart, end = field.selectionEnd;
    return end > start ? { start, end } : null;
  }
  const selected = window.getSelection();
  if (!selected?.rangeCount || selected.isCollapsed) return null;
  const range = selected.getRangeAt(0);
  if (!field.contains(range.startContainer) || !field.contains(range.endContainer)) return null;
  const prefix = document.createRange();
  prefix.selectNodeContents(field);
  prefix.setEnd(range.startContainer, range.startOffset);
  const start = prefix.toString().length;
  return { start, end: start + range.toString().length, rect: range.getBoundingClientRect() };
}

function offsetAt(field, x, y) {
  const hitOffset = element => {
    const hit = document.caretPositionFromPoint?.(x, y);
    const range = hit ?? document.caretRangeFromPoint?.(x, y);
    const target = range?.offsetNode ?? range?.startContainer;
    if (!target || !element.contains(target)) return null;
    const prefix = document.createRange();
    prefix.selectNodeContents(element);
    prefix.setEnd(target, range.offset ?? range.startOffset);
    return prefix.toString().length;
  };
  if (!(field instanceof HTMLTextAreaElement)) return hitOffset(field);
  // Textarea does not expose its character boxes. Mirror its wrapping,
  // typography and scroll position for the duration of this hit test.
  const props = ['font', 'fontKerning', 'fontFeatureSettings', 'letterSpacing', 'wordSpacing',
    'lineHeight', 'textAlign', 'textIndent', 'direction', 'padding', 'tabSize',
    'whiteSpace', 'overflowWrap', 'wordBreak', 'textTransform'];
  const css = getComputedStyle(field), box = field.getBoundingClientRect();
  const mirror = node('div');
  const contents = document.createTextNode(field.value + '\n');
  mirror.append(contents);
  for (const prop of props) mirror.style[prop] = css[prop];
  const scaleX = box.width / field.offsetWidth || 1, scaleY = box.height / field.offsetHeight || 1;
  Object.assign(mirror.style, {
    position: 'fixed', boxSizing: 'border-box', margin: '0', border: '0',
    left: box.left + field.clientLeft * scaleX + 'px', top: box.top + field.clientTop * scaleY + 'px',
    width: field.clientWidth + 'px', height: field.clientHeight + 'px',
    overflow: 'hidden', opacity: '0', zIndex: '2147483647', transformOrigin: 'top left',
    transform: 'scale(' + scaleX + ',' + scaleY + ')'
  });
  (field.closest('dialog[open]') ?? document.body).append(mirror);
  try {
    mirror.scrollTop = field.scrollTop;
    mirror.scrollLeft = field.scrollLeft;
    const offset = hitOffset(mirror);
    if (offset === null) return null;
    const word = wordAt(field.value, offset);
    if (!word) return null;
    const range = document.createRange();
    range.setStart(contents, word.start);
    range.setEnd(contents, word.end);
    return [...range.getClientRects()].some(rect => x >= rect.left && x <= rect.right &&
      y >= rect.top && y <= rect.bottom) ? offset : null;
  } finally {
    mirror.remove();
  }
}

function viewport() {
  const view = window.visualViewport;
  return { left: view?.offsetLeft ?? 0, top: view?.offsetTop ?? 0,
    width: view?.width ?? innerWidth, height: view?.height ?? innerHeight };
}

function position(element, x, y) {
  const view = viewport(), margin = 8;
  element.style.maxWidth = Math.max(1, view.width - margin * 2) + 'px';
  element.style.maxHeight = Math.max(1, view.height - margin * 2) + 'px';
  const { width, height } = element.getBoundingClientRect();
  element.style.left = Math.max(view.left + margin, Math.min(x, view.left + view.width - width - margin)) + 'px';
  const below = y + height <= view.top + view.height - margin;
  element.style.top = Math.max(view.top + margin, below ? y : Math.min(y - height, view.top + view.height - height - margin)) + 'px';
}

function removeTouch() {
  touchButton?.remove();
  touchButton = touchTarget = null;
}

function close(restore = false) {
  if (!openMenu) return;
  const { field, element, range } = openMenu;
  openMenu = null;
  element.remove();
  if (restore && field.isConnected) {
    field.focus({ preventScroll: true });
    if (field instanceof HTMLTextAreaElement && range) field.setSelectionRange(range.start, range.end);
  }
}

function announce(config, error) {
  config.report?.(error instanceof Error ? error.message : String(error), true);
}

function run(field, config, range, text, task) {
  try {
    if (!field.isConnected || config.text() !== text) throw new Error('El texto ha cambiado. Vuelve a seleccionarlo.');
    const result = task();
    const restore = changed => {
      if (changed && range && field.isConnected && field instanceof HTMLTextAreaElement)
        field.setSelectionRange(changed.start, changed.end);
    };
    if (result?.then) result.then(restore, error => announce(config, error));
    else restore(result);
  } catch (error) { announce(config, error); }
}

function display(field, config, range, x, y, fromTouch, fromKeyboard = false) {
  close();
  removeTouch();
  const text = config.text();
  if (range && !validRange(text, range)) return false;
  const groups = [];
  const editable = config.edit && !field.readOnly && !field.disabled;
  if (editable && range) {
    const edit = (key, value) => {
      const change = editorialChange(text, range, key, value);
      return change && config.edit(change, range, key);
    };
    const typography = [];
    const available = config.underlines?.(range) ?? {};
    if (available.add) typography.push(['Subrayar', () => config.edit(null, range, 'underline')]);
    if (available.remove) typography.push(['Quitar subrayado', () => config.edit(null, range, 'ununderline')]);
    if (editorialChange(text, range, 'ligate')) typography.push(['Formar ligaduras æ/œ', () => edit('ligate')]);
    if (editorialChange(text, range, 'expand')) typography.push(['Deshacer ligaduras æ/œ', () => edit('expand')]);
    groups.push(['Edición tipográfica', typography]);
    const editorial = [];
    if (editorialChange(text, range, 'omit')) editorial.push(['Omitir fragmento […]', () => edit('omit')]);
    if (editorialChange(text, range, 'bracket')) editorial.push(['Encerrar entre corchetes', () => edit('bracket')]);
    if (editorialChange(text, range, 'unbracket')) editorial.push(['Quitar corchetes', () => edit('unbracket')]);
    editorial.push(['Sustituir fragmento…', () => {}, true]);
    groups.push(['Edición textual', editorial]);
  }
  if (range && config.academic) groups.push(['Herramientas académicas', config.academic(range, { x, y })]);
  const history = editable && config.history?.();
  if (history) groups.push(['Historial', [
    ...(history.undo ? [['Deshacer', history.undo]] : []),
    ...(history.redo ? [['Rehacer', history.redo]] : [])
  ]]);
  if (!groups.some(([, items]) => items.length)) return false;

  const menu = node('div', '', 'atl-latin-context');
  menu.setAttribute('role', 'menu');
  menu.setAttribute('aria-label', 'Menú contextual del texto latino');
  for (const [title, items] of groups) {
    if (!items.length) continue;
    const group = node('div', '', 'atl-latin-context-group');
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', title);
    const heading = node('div', title, 'atl-latin-context-heading');
    heading.setAttribute('aria-hidden', 'true');
    group.append(heading);
    for (const [label, action, substitute] of items) {
      const button = node('button', label);
      button.setAttribute('role', 'menuitem');
      button.tabIndex = -1;
      button.addEventListener('pointerdown', event => event.preventDefault());
      button.addEventListener('click', () => {
        if (substitute) {
          menu.setAttribute('role', 'dialog');
          menu.setAttribute('aria-label', label);
          const form = node('form');
          const caption = node('label', 'Texto sustitutivo');
          const area = node('textarea');
          area.rows = 3;
          area.value = text.slice(range.start, range.end);
          caption.append(area);
          const original = node('blockquote', area.value);
          original.lang = 'la';
          const apply = node('button', 'Aplicar');
          apply.type = 'submit';
          const cancel = node('button', 'Cancelar');
          cancel.onclick = () => close(!fromTouch);
          form.append(original, caption, cancel, apply);
          form.onsubmit = event => {
            event.preventDefault();
            close(!fromTouch);
            run(field, config, range, text, () => {
              const change = editorialChange(text, range, 'replace', area.value);
              return change && config.edit(change, range, 'replace');
            });
          };
          menu.replaceChildren(form);
          position(menu, x, y);
          area.focus({ preventScroll: true });
          area.select();
          return;
        }
        close(!fromTouch);
        run(field, config, range, text, action);
      });
      group.append(button);
    }
    menu.append(group);
  }
  (field.closest('dialog[open]') ?? document.body).append(menu);
  position(menu, x, y);
  openMenu = { field, element: menu, range, fromTouch, x, y };
  if (fromKeyboard) menu.querySelector('button').focus({ preventScroll: true });
  return true;
}

function updateTouch() {
  if (openMenu || !touchTarget?.isConnected) { removeTouch(); return; }
  const field = touchTarget, config = editors.get(field), range = selection(field);
  if (!range) { touchButton?.remove(); touchButton = null; return; }
  if (!touchButton) {
    touchButton = node('button', '⋯', 'atl-latin-touch');
    touchButton.setAttribute('aria-label', 'Abrir menú del texto latino');
    touchButton.addEventListener('pointerdown', event => event.preventDefault());
    touchButton.addEventListener('click', () => {
      const selected = selection(field);
      if (!selected) return;
      const anchor = touchButton.getBoundingClientRect();
      display(field, config, selected, anchor.left, anchor.bottom + 4, true);
    });
    (field.closest('dialog[open]') ?? document.body).append(touchButton);
  }
  const box = field.getBoundingClientRect(), view = viewport();
  if (box.bottom < view.top || box.top > view.top + view.height) {
    touchButton.remove(); touchButton = null; return;
  }
  position(touchButton, box.right - 46, Math.min(box.bottom + 4, view.top + view.height - 8));
}

document.addEventListener('pointerdown', event => {
  if (openMenu && !openMenu.element.contains(event.target)) close();
  const field = event.target.closest?.('[data-latin-context]');
  if (event.button === 2 || event.ctrlKey && event.button === 0) {
    pressed = field && { field, range: selection(field), x: event.clientX, y: event.clientY };
  }
  if (field && (event.pointerType === 'touch' || event.pointerType === 'pen')) {
    touchTarget = field;
    requestAnimationFrame(updateTouch);
  }
  else if (!touchButton?.contains(event.target)) removeTouch();
}, true);
document.addEventListener('pointerup', () => requestAnimationFrame(updateTouch));
document.addEventListener('selectionchange', () => { if (touchTarget) updateTouch(); }, true);
document.addEventListener('select', () => { if (touchTarget) updateTouch(); }, true);
document.addEventListener('mousedown', event => {
  if (pressed?.range && pressed.field === event.target && (event.button === 2 || event.ctrlKey && event.button === 0))
    event.preventDefault();
}, true);
document.addEventListener('contextmenu', event => {
  const field = event.target.closest?.('[data-latin-context]'), config = editors.get(field);
  if (!config || event.pointerType === 'touch' || event.pointerType === 'pen' ||
      touchTarget === field && !fine.matches && event.button !== 2) return;
  const samePress = pressed?.field === field && Math.abs(pressed.x - event.clientX) < 4 &&
    Math.abs(pressed.y - event.clientY) < 4;
  const text = config.text();
  const range = (samePress && pressed.range) || selection(field) ||
    wordAt(text, offsetAt(field, event.clientX, event.clientY) ?? -1);
  if (range && field instanceof HTMLTextAreaElement && document.activeElement === field)
    field.setSelectionRange(range.start, range.end);
  pressed = null;
  if (display(field, config, range, event.clientX, event.clientY, false)) event.preventDefault();
});
document.addEventListener('keydown', event => {
  if (openMenu) {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopImmediatePropagation();
      close(!openMenu.fromTouch);
      return;
    }
    const { element } = openMenu;
    if (element.getAttribute('role') === 'menu' && ['ArrowDown', 'ArrowUp', 'Home', 'End', 'Tab'].includes(event.key)) {
      if (event.key === 'Tab') { close(true); return; }
      const buttons = [...element.querySelectorAll('[role="menuitem"]')];
      const index = buttons.indexOf(document.activeElement);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 :
        (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
      event.preventDefault();
      buttons[next].focus({ preventScroll: true });
      buttons[next].scrollIntoView({ block: 'nearest' });
    }
    return;
  }
  if (event.key !== 'ContextMenu' && !(event.shiftKey && event.key === 'F10')) return;
  const field = event.target.closest?.('[data-latin-context]'), config = editors.get(field);
  if (!config) return;
  const box = field.getBoundingClientRect();
  const range = selection(field) ?? wordAt(config.text(), field.selectionStart ?? -1);
  if (display(field, config, range, box.left, box.bottom, false, true)) event.preventDefault();
}, true);
function reposition(event) {
  if (openMenu && (!(event?.target instanceof Node) || !openMenu.element.contains(event.target))) {
    if (!openMenu.field.isConnected) close();
    else position(openMenu.element, openMenu.x, openMenu.y);
  }
  if (touchTarget) updateTouch();
}
window.addEventListener('scroll', reposition, true);
window.addEventListener('resize', reposition);
window.visualViewport?.addEventListener('resize', reposition);
window.visualViewport?.addEventListener('scroll', reposition);

export function bindLatinContext(field, config) {
  field.dataset.latinContext = '';
  if (field instanceof HTMLTextAreaElement) field.setAttribute('aria-keyshortcuts', 'Shift+F10');
  editors.set(field, config);
}

export function showLatinField(field, value, range) {
  if (!field.isConnected) return;
  const scroll = field.scrollTop;
  if (field.value !== value) field.value = value;
  if (range) field.setSelectionRange(range.start, range.end);
  field.scrollTop = scroll;
}

export function createContextHistory(equivalent = (left, right) => JSON.stringify(left) === JSON.stringify(right)) {
  let undo = [], redo = [];
  const reset = () => { undo = []; redo = []; };
  return {
    reset,
    record(before, after) {
      if (equivalent(before, after)) return;
      if (undo.length && !equivalent(before, undo.at(-1).after)) reset();
      undo.push({ before, after });
      if (undo.length > 40) undo.shift();
      redo = [];
    },
    actions(read, write) {
      const action = (from, to, expected, target) => {
        const entry = from.at(-1);
        if (!entry || !equivalent(entry[expected], read())) return;
        const result = write(entry[target]);
        if (result === false) return;
        from.pop(); to.push(entry);
        return result;
      };
      const value = read();
      return {
        undo: undo.length && equivalent(undo.at(-1).after, value) ? () => action(undo, redo, 'after', 'before') : null,
        redo: redo.length && equivalent(redo.at(-1).before, value) ? () => action(redo, undo, 'before', 'after') : null
      };
    }
  };
}

export function openContextPanel(field, range, { x, y }, title) {
  close();
  const element = node('section', '', 'atl-latin-context atl-latin-context-panel');
  element.setAttribute('role', 'dialog');
  element.setAttribute('aria-label', title);
  const body = node('div');
  const cancel = node('button', 'Cerrar');
  cancel.onclick = () => close(true);
  element.append(body, cancel);
  (field.closest('dialog[open]') ?? document.body).append(element);
  openMenu = { field, element, range, x, y };
  const layout = () => position(element, x, y);
  layout();
  cancel.focus({ preventScroll: true });
  return { body, layout, close: () => { if (openMenu?.element === element) close(true); } };
}
