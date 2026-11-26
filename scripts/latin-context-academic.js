import { completeLatinSelection, fullWords } from './latin-context-edit.js';
import { openContextPanel } from './latin-context-menu.js';

function element(tag, label = '') {
  const node = document.createElement(tag);
  node.textContent = label;
  return node;
}

function control(form, label, value, maxLength) {
  const caption = element('label', label);
  const input = element('input');
  input.value = value ?? '';
  input.maxLength = maxLength;
  caption.append(input);
  form.append(caption);
  return input;
}

function submit(form, label, apply, panel, report) {
  const button = element('button', label);
  button.type = 'submit';
  form.append(button);
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (button.disabled) return;
    button.disabled = true;
    try {
      if (await apply() !== false) panel.close();
    } catch (error) {
      report(error.message, true);
    } finally {
      button.disabled = false;
    }
  });
}

export function academicActions(field, text, range, point, config) {
  const selected = text.slice(range.start, range.end);
  if (!/[\p{L}\p{M}]/u.test(selected)) return [];
  const single = !/\s/u.test(selected) && fullWords(text, range);
  const menu = [];
  const check = () => {
    if (!field.isConnected || !config.current())
      throw new Error('El texto ha cambiado. Vuelve a seleccionar el fragmento.');
  };
  if (config.consult) menu.push(['Consultar Collatinus', () => config.consult(range, point)]);
  if (single && config.propose && config.saveVocabulary) menu.push(['Añadir al vocabulario', async () => {
    const panel = openContextPanel(field, range, point, 'Añadir al vocabulario');
    const pending = element('p', 'Consultando el vocabulario local…');
    panel.body.append(pending);
    let proposal;
    try { proposal = await config.propose(range); }
    catch (error) { config.report(error.message, true); }
    if (!panel.body.isConnected) return;
    check();
    const form = element('form');
    const word = element('blockquote', selected);
    word.lang = 'la';
    form.append(word);
    const head = control(form, 'Enunciado latino', proposal?.headword ?? selected, 500);
    const gloss = control(form, 'Significado en español', proposal?.meaning, 1000);
    head.required = true;
    submit(form, 'Incorporar al vocabulario', () => {
      check();
      return config.saveVocabulary({ ...proposal, selected, headword: head.value.trim(), meaning: gloss.value.trim() || null });
    }, panel, config.report);
    panel.body.replaceChildren(form);
    panel.layout();
    head.focus({ preventScroll: true });
  }]);
  if (config.grammar) menu.push(['Etiquetar gramaticalmente', () => {
    const panel = openContextPanel(field, range, point, 'Etiquetar gramaticalmente');
    const form = element('form');
    const word = element('blockquote', selected);
    word.lang = 'la';
    form.append(word);
    const label = element('label', 'Etiqueta gramatical');
    const select = element('select');
    select.required = true;
    select.append(new Option('Seleccionar etiqueta', ''));
    for (const { label, tags } of config.grammar.groups) {
      const group = element('optgroup');
      group.label = label;
      for (const tag of tags) group.append(new Option(tag.label, tag.id));
      select.append(group);
    }
    label.append(select);
    form.append(label);
    submit(form, 'Asignar al fragmento', () => {
      check();
      return config.grammar.apply(select.value);
    }, panel, config.report);
    panel.body.append(form);
    panel.layout();
    select.focus({ preventScroll: true });
  }]);
  if (config.exercises && completeLatinSelection(text, range)) menu.push(['Añadir a pregunta o ejercicio', async () => {
    const panel = openContextPanel(field, range, point, 'Añadir a pregunta o ejercicio');
    panel.body.append(element('p', 'Comprobando las opciones del banco docente…'));
    const choices = await config.exercises(range);
    if (!panel.body.isConnected) return;
    check();
    panel.body.replaceChildren();
    if (!choices.length) panel.body.append(element('p', 'La selección no tiene opciones compatibles disponibles.'));
    for (const [title, apply] of choices) {
      const button = element('button', title);
      button.className = 'atl-context-option';
      button.type = 'button';
      button.onclick = async () => {
        try {
          check();
          button.disabled = true;
          if (await apply() !== false) panel.close();
        } catch (error) { config.report(error.message, true); }
        finally { button.disabled = false; }
      };
      panel.body.append(button);
    }
    panel.layout();
    panel.body.querySelector('button')?.focus({ preventScroll: true });
  }]);
  return menu;
}

export function selectedTokens(tokens, text, range) {
  return tokens.filter(token => token.s >= range.start && token.e <= range.end &&
    text.slice(token.s, token.e) === token.w);
}
