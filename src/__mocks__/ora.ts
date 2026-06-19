// Mock de ora para ambiente Jest (ora v8 é ESM-only)
const ora = (_text?: string) => ({
  start: function () { return this; },
  succeed: function () { return this; },
  fail: function () { return this; },
  warn: function () { return this; },
  info: function () { return this; },
  stop: function () { return this; },
  text: '',
});

export default ora;
