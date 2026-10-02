const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

for (const [file, route, delay] of [
  ['progression.js', '/profile/', 500],
]) {
  for (const readyState of ['loading', 'interactive', 'complete']) {
    test(`${file} starts when loaded at ${readyState}`, () => {
      const timers = [];
      const events = new Map();
      const storage = {getItem: () => null};
      const context = {
        location: {pathname: route, hostname: 'basedmoer.com', search: ''},
        URLSearchParams,
        sessionStorage: storage,
        localStorage: storage,
        document: {
          readyState,
          getElementById: () => null,
          querySelector: () => null,
          addEventListener: (name, callback, options) => events.set(name, {callback, options}),
        },
        window: {addEventListener() {}, MoerAcademyState: {read:()=>({completed:{},scores:{}})}},
        setTimeout: (callback, ms) => timers.push({callback, ms}),
      };
      vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), context);
      if (readyState === 'loading') {
        assert.equal(timers.length, 0, 'must wait for page markup');
        assert.equal(events.get('DOMContentLoaded').options.once, true);
        events.get('DOMContentLoaded').callback();
      } else {
        assert.equal(events.has('DOMContentLoaded'), false, 'must not wait for an event already fired');
      }
      assert.equal(timers.length, 1);
      assert.equal(timers[0].ms, delay);
    });
  }
}
