import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitNote } from '../../lib/workflow/notes.mjs';

// The be: and fe: prefixes of a request (human-loop spec 4.4).
test('each prefix starts the part of its role, up to the next prefix, over several lines', () => {
  assert.deepEqual(splitNote('be: API trả thêm trường updatedAt\nfe: hiện updatedAt dưới tiêu đề,\ndạng "2 phút trước"'), {
    parts: { 'be-dev': 'API trả thêm trường updatedAt', 'fe-dev': 'hiện updatedAt dưới tiêu đề,\ndạng "2 phút trước"' },
    prefixed: true,
  });
});

test('the prefix is read in any case, with or without a space, and the parts of one role are joined', () => {
  assert.deepEqual(splitNote('FE:nút xanh hơn\r\nBe: thêm trường\nfe: chữ to hơn'), { parts: { 'fe-dev': 'nút xanh hơn\nchữ to hơn', 'be-dev': 'thêm trường' }, prefixed: true });
});

test('one side only, and text before the first prefix goes to every part', () => {
  assert.deepEqual(splitNote('fe: đổi màu nút'), { parts: { 'fe-dev': 'đổi màu nút' }, prefixed: true });
  assert.deepEqual(splitNote('Theo ảnh S1-desktop.png:\nbe: sắp xếp mới nhất trước\nfe: thêm nhãn "Mới"'), {
    parts: { 'be-dev': 'Theo ảnh S1-desktop.png:\n\nsắp xếp mới nhất trước', 'fe-dev': 'Theo ảnh S1-desktop.png:\n\nthêm nhãn "Mới"' },
    prefixed: true,
  });
});

test('no prefix, or a prefix inside a line, is a note with no side', () => {
  assert.deepEqual(splitNote('đổi màu nút sang xanh'), { parts: {}, prefixed: false, text: 'đổi màu nút sang xanh' });
  assert.deepEqual(splitNote('sửa lỗi be: và fe: đều sai'), { parts: {}, prefixed: false, text: 'sửa lỗi be: và fe: đều sai' });
  assert.deepEqual(splitNote('xem lại: be-dev hay fe-dev?'), { parts: {}, prefixed: false, text: 'xem lại: be-dev hay fe-dev?' });
});
