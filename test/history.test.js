import test from 'node:test';
import assert from 'node:assert/strict';
import { CheckHistory } from '../src/history.js';

test('mantém os registros mais recentes dentro do limite', () => {
  const history = new CheckHistory(2);
  history.add({ id: '1' });
  history.add({ id: '2' });
  history.add({ id: '3' });
  assert.deepEqual(history.list().map((item) => item.id), ['3', '2']);
});

test('clear remove todo o histórico', () => {
  const history = new CheckHistory();
  history.add({ id: '1' });
  history.clear();
  assert.deepEqual(history.list(), []);
});
