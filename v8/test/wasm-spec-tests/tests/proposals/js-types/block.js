'use strict';

let spectest = {
  print: print || ((...xs) => console.log(...xs)),
  global: 666,
  table: new WebAssembly.Table({initial: 10, maximum: 20, element: 'anyfunc'}),  memory: new WebAssembly.Memory({initial: 1, maximum: 2}),};

let registry = {spectest};

function register(name, instance) {
  registry[name] = instance.exports;
}

function module(bytes, valid = true) {
  let buffer = new ArrayBuffer(bytes.length);
  let view = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; ++i) {
    view[i] = bytes.charCodeAt(i);
  }
  let validated;
  try {
    validated = WebAssembly.validate(buffer);
  } catch (e) {
    throw new Error("Wasm validate throws");
  }
  if (validated !== valid) {
    throw new Error("Wasm validate failure" + (valid ? "" : " expected"));
  }
  return new WebAssembly.Module(buffer);
}

function instance(bytes, imports = registry) {
  return new WebAssembly.Instance(module(bytes), imports);
}

function call(instance, name, args) {
  return instance.exports[name](...args);
}

function get(instance, name) {
  return instance.exports[name];
}

function exports(name, instance) {
  return {[name]: instance.exports};
}

function run(action) {
  action();
}

function assert_malformed(bytes) {
  try { module(bytes, false) } catch (e) {
    if (e instanceof WebAssembly.CompileError) return;
  }
  throw new Error("Wasm decoding failure expected");
}

function assert_invalid(bytes) {
  try { module(bytes, false) } catch (e) {
    if (e instanceof WebAssembly.CompileError) return;
  }
  throw new Error("Wasm validation failure expected");
}

function assert_unlinkable(bytes) {
  let mod = module(bytes);
  try { new WebAssembly.Instance(mod, registry) } catch (e) {
    if (e instanceof WebAssembly.LinkError) return;
  }
  throw new Error("Wasm linking failure expected");
}

function assert_uninstantiable(bytes) {
  let mod = module(bytes);
  try { new WebAssembly.Instance(mod, registry) } catch (e) {
    if (e instanceof WebAssembly.RuntimeError) return;
  }
  throw new Error("Wasm trap expected");
}

function assert_trap(action) {
  try { action() } catch (e) {
    if (e instanceof WebAssembly.RuntimeError) return;
  }
  throw new Error("Wasm trap expected");
}

let StackOverflow;
try { (function f() { 1 + f() })() } catch (e) { StackOverflow = e.constructor }

function assert_exhaustion(action) {
  try { action() } catch (e) {
    if (e instanceof StackOverflow) return;
  }
  throw new Error("Wasm resource exhaustion expected");
}

function assert_return(action, expected) {
  let actual = action();
  if (!Object.is(actual, expected)) {
    throw new Error("Wasm return value " + expected + " expected, got " + actual);
  };
}

function assert_return_canonical_nan(action) {
  let actual = action();
  // Note that JS can't reliably distinguish different NaN values,
  // so there's no good way to test that it's a canonical NaN.
  if (!Number.isNaN(actual)) {
    throw new Error("Wasm return value NaN expected, got " + actual);
  };
}

function assert_return_arithmetic_nan(action) {
  // Note that JS can't reliably distinguish different NaN values,
  // so there's no good way to test for specific bitpatterns here.
  let actual = action();
  if (!Number.isNaN(actual)) {
    throw new Error("Wasm return value NaN expected, got " + actual);
  };
}


// block.wast:3
let $1 = instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x88\x80\x80\x80\x00\x02\x60\x00\x00\x60\x00\x01\x7f\x03\x90\x80\x80\x80\x00\x0f\x00\x00\x01\x01\x01\x01\x01\x01\x01\x01\x01\x01\x01\x01\x01\x07\xbe\x81\x80\x80\x00\x0e\x05\x65\x6d\x70\x74\x79\x00\x01\x08\x73\x69\x6e\x67\x75\x6c\x61\x72\x00\x02\x05\x6d\x75\x6c\x74\x69\x00\x03\x06\x6e\x65\x73\x74\x65\x64\x00\x04\x04\x64\x65\x65\x70\x00\x05\x10\x61\x73\x2d\x75\x6e\x61\x72\x79\x2d\x6f\x70\x65\x72\x61\x6e\x64\x00\x06\x11\x61\x73\x2d\x62\x69\x6e\x61\x72\x79\x2d\x6f\x70\x65\x72\x61\x6e\x64\x00\x07\x0f\x61\x73\x2d\x74\x65\x73\x74\x2d\x6f\x70\x65\x72\x61\x6e\x64\x00\x08\x12\x61\x73\x2d\x63\x6f\x6d\x70\x61\x72\x65\x2d\x6f\x70\x65\x72\x61\x6e\x64\x00\x09\x0a\x62\x72\x65\x61\x6b\x2d\x62\x61\x72\x65\x00\x0a\x0b\x62\x72\x65\x61\x6b\x2d\x76\x61\x6c\x75\x65\x00\x0b\x0e\x62\x72\x65\x61\x6b\x2d\x72\x65\x70\x65\x61\x74\x65\x64\x00\x0c\x0b\x62\x72\x65\x61\x6b\x2d\x69\x6e\x6e\x65\x72\x00\x0d\x07\x65\x66\x66\x65\x63\x74\x73\x00\x0e\x0a\x99\x84\x80\x80\x00\x0f\x82\x80\x80\x80\x00\x00\x0b\x88\x80\x80\x80\x00\x00\x02\x40\x0b\x02\x40\x0b\x0b\x8b\x80\x80\x80\x00\x00\x02\x40\x01\x0b\x02\x7f\x41\x07\x0b\x0b\x98\x80\x80\x80\x00\x00\x02\x40\x10\x00\x10\x00\x10\x00\x10\x00\x0b\x02\x7f\x10\x00\x10\x00\x10\x00\x41\x08\x0b\x0b\x95\x80\x80\x80\x00\x00\x02\x7f\x02\x40\x10\x00\x02\x40\x0b\x01\x0b\x02\x7f\x10\x00\x41\x09\x0b\x0b\x0b\xf9\x80\x80\x80\x00\x00\x02\x7f\x02\x7f\x02\x7f\x02\x7f\x02\x7f\x02\x7f\x02\x7f\x02\x7f\x02\x7f\x02\x7f\x02\x7f\x02\x7f\x02\x7f\x02\x7f\x02\x7f\x02\x7f\x02\x7f\x02\x7f\x02\x7f\x02\x7f\x02\x7f\x02\x7f\x02\x7f\x02\x7f\x02\x7f\x02\x7f\x02\x7f\x02\x7f\x02\x7f\x02\x7f\x02\x7f\x02\x7f\x02\x7f\x02\x7f\x02\x7f\x02\x7f\x02\x7f\x02\x7f\x10\x00\x41\x96\x01\x0b\x0b\x0b\x0b\x0b\x0b\x0b\x0b\x0b\x0b\x0b\x0b\x0b\x0b\x0b\x0b\x0b\x0b\x0b\x0b\x0b\x0b\x0b\x0b\x0b\x0b\x0b\x0b\x0b\x0b\x0b\x0b\x0b\x0b\x0b\x0b\x0b\x0b\x0b\x8a\x80\x80\x80\x00\x00\x02\x7f\x10\x00\x41\x0d\x0b\x68\x0b\x91\x80\x80\x80\x00\x00\x02\x7f\x10\x00\x41\x03\x0b\x02\x7f\x10\x00\x41\x04\x0b\x6c\x0b\x8a\x80\x80\x80\x00\x00\x02\x7f\x10\x00\x41\x0d\x0b\x45\x0b\x97\x80\x80\x80\x00\x00\x02\x7d\x10\x00\x43\x00\x00\x40\x40\x0b\x02\x7d\x10\x00\x43\x00\x00\x40\x40\x0b\x5e\x0b\xa6\x80\x80\x80\x00\x00\x02\x40\x0c\x00\x00\x0b\x02\x40\x41\x01\x0d\x00\x00\x0b\x02\x40\x41\x00\x0e\x00\x00\x00\x0b\x02\x40\x41\x01\x0e\x02\x00\x00\x00\x00\x0b\x41\x13\x0b\x8b\x80\x80\x80\x00\x00\x02\x7f\x41\x12\x0c\x00\x41\x13\x0b\x0b\xb1\x80\x80\x80\x00\x00\x02\x7f\x41\x12\x0c\x00\x41\x13\x0c\x00\x41\x14\x41\x00\x0d\x00\x1a\x41\x14\x41\x01\x0d\x00\x1a\x41\x15\x0c\x00\x41\x16\x41\x04\x0e\x00\x00\x41\x17\x41\x01\x0e\x02\x00\x00\x00\x41\x15\x0b\x0b\xc5\x80\x80\x80\x00\x01\x01\x7f\x41\x00\x21\x00\x20\x00\x02\x7f\x02\x7f\x41\x01\x0c\x01\x0b\x0b\x6a\x21\x00\x20\x00\x02\x7f\x02\x40\x0c\x00\x0b\x41\x02\x0b\x6a\x21\x00\x20\x00\x02\x7f\x41\x04\x0c\x00\x68\x0b\x6a\x21\x00\x20\x00\x02\x7f\x02\x7f\x41\x08\x0c\x01\x0b\x68\x0b\x6a\x21\x00\x20\x00\x0b\xaf\x80\x80\x80\x00\x01\x01\x7f\x02\x40\x41\x01\x21\x00\x20\x00\x41\x03\x6c\x21\x00\x20\x00\x41\x05\x6b\x21\x00\x20\x00\x41\x07\x6c\x21\x00\x0c\x00\x20\x00\x41\xe4\x00\x6c\x21\x00\x0b\x20\x00\x41\x72\x46\x0b");

// block.wast:140
assert_return(() => call($1, "empty", []));

// block.wast:141
assert_return(() => call($1, "singular", []), 7);

// block.wast:142
assert_return(() => call($1, "multi", []), 8);

// block.wast:143
assert_return(() => call($1, "nested", []), 9);

// block.wast:144
assert_return(() => call($1, "deep", []), 150);

// block.wast:146
assert_return(() => call($1, "as-unary-operand", []), 0);

// block.wast:147
assert_return(() => call($1, "as-binary-operand", []), 12);

// block.wast:148
assert_return(() => call($1, "as-test-operand", []), 0);

// block.wast:149
assert_return(() => call($1, "as-compare-operand", []), 0);

// block.wast:151
assert_return(() => call($1, "break-bare", []), 19);

// block.wast:152
assert_return(() => call($1, "break-value", []), 18);

// block.wast:153
assert_return(() => call($1, "break-repeated", []), 18);

// block.wast:154
assert_return(() => call($1, "break-inner", []), 15);

// block.wast:156
assert_return(() => call($1, "effects", []), 1);

// block.wast:158
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x85\x80\x80\x80\x00\x01\x60\x00\x01\x7f\x03\x82\x80\x80\x80\x00\x01\x00\x0a\x8b\x80\x80\x80\x00\x01\x85\x80\x80\x80\x00\x00\x02\x40\x0b\x0b");

// block.wast:162
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x85\x80\x80\x80\x00\x01\x60\x00\x01\x7e\x03\x82\x80\x80\x80\x00\x01\x00\x0a\x8b\x80\x80\x80\x00\x01\x85\x80\x80\x80\x00\x00\x02\x40\x0b\x0b");

// block.wast:166
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x85\x80\x80\x80\x00\x01\x60\x00\x01\x7d\x03\x82\x80\x80\x80\x00\x01\x00\x0a\x8b\x80\x80\x80\x00\x01\x85\x80\x80\x80\x00\x00\x02\x40\x0b\x0b");

// block.wast:170
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x85\x80\x80\x80\x00\x01\x60\x00\x01\x7c\x03\x82\x80\x80\x80\x00\x01\x00\x0a\x8b\x80\x80\x80\x00\x01\x85\x80\x80\x80\x00\x00\x02\x40\x0b\x0b");

// block.wast:175
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x84\x80\x80\x80\x00\x01\x60\x00\x00\x03\x82\x80\x80\x80\x00\x01\x00\x0a\x8d\x80\x80\x80\x00\x01\x87\x80\x80\x80\x00\x00\x02\x40\x41\x01\x0b\x0b");

// block.wast:181
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x85\x80\x80\x80\x00\x01\x60\x00\x01\x7f\x03\x82\x80\x80\x80\x00\x01\x00\x0a\x8b\x80\x80\x80\x00\x01\x85\x80\x80\x80\x00\x00\x02\x7f\x0b\x0b");

// block.wast:187
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x85\x80\x80\x80\x00\x01\x60\x00\x01\x7f\x03\x82\x80\x80\x80\x00\x01\x00\x0a\x8c\x80\x80\x80\x00\x01\x86\x80\x80\x80\x00\x00\x02\x7f\x01\x0b\x0b");

// block.wast:193
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x85\x80\x80\x80\x00\x01\x60\x00\x01\x7f\x03\x82\x80\x80\x80\x00\x01\x00\x0a\x90\x80\x80\x80\x00\x01\x8a\x80\x80\x80\x00\x00\x02\x7f\x43\x00\x00\x00\x00\x0b\x0b");

// block.wast:199
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x85\x80\x80\x80\x00\x01\x60\x00\x01\x7f\x03\x82\x80\x80\x80\x00\x01\x00\x0a\x8f\x80\x80\x80\x00\x01\x89\x80\x80\x80\x00\x00\x02\x7e\x00\x00\x00\x1b\x0b\x0b");

// block.wast:206
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x85\x80\x80\x80\x00\x01\x60\x00\x01\x7f\x03\x82\x80\x80\x80\x00\x01\x00\x0a\x8d\x80\x80\x80\x00\x01\x87\x80\x80\x80\x00\x00\x02\x7f\x0c\x00\x0b\x0b");

// block.wast:212
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x85\x80\x80\x80\x00\x01\x60\x00\x01\x7f\x03\x82\x80\x80\x80\x00\x01\x00\x0a\x8f\x80\x80\x80\x00\x01\x89\x80\x80\x80\x00\x00\x02\x7f\x0c\x00\x41\x01\x0b\x0b");

// block.wast:219
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x85\x80\x80\x80\x00\x01\x60\x00\x01\x7f\x03\x82\x80\x80\x80\x00\x01\x00\x0a\x90\x80\x80\x80\x00\x01\x8a\x80\x80\x80\x00\x00\x02\x7f\x01\x0c\x00\x41\x01\x0b\x0b");

// block.wast:225
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x85\x80\x80\x80\x00\x01\x60\x00\x01\x7f\x03\x82\x80\x80\x80\x00\x01\x00\x0a\x91\x80\x80\x80\x00\x01\x8b\x80\x80\x80\x00\x00\x02\x7f\x42\x01\x0c\x00\x41\x01\x0b\x0b");

// block.wast:231
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x85\x80\x80\x80\x00\x01\x60\x00\x01\x7f\x03\x82\x80\x80\x80\x00\x01\x00\x0a\x92\x80\x80\x80\x00\x01\x8c\x80\x80\x80\x00\x00\x02\x7f\x01\x0c\x00\x41\x01\x0c\x00\x0b\x0b");

// block.wast:237
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x85\x80\x80\x80\x00\x01\x60\x00\x01\x7f\x03\x82\x80\x80\x80\x00\x01\x00\x0a\x93\x80\x80\x80\x00\x01\x8d\x80\x80\x80\x00\x00\x02\x7f\x42\x01\x0c\x00\x41\x01\x0c\x00\x0b\x0b");

// block.wast:244
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x84\x80\x80\x80\x00\x01\x60\x00\x00\x03\x82\x80\x80\x80\x00\x01\x00\x0a\x94\x80\x80\x80\x00\x01\x8e\x80\x80\x80\x00\x00\x02\x7f\x02\x7f\x41\x01\x0c\x01\x0b\x0c\x00\x0b\x0b");

// block.wast:250
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x85\x80\x80\x80\x00\x01\x60\x00\x01\x7f\x03\x82\x80\x80\x80\x00\x01\x00\x0a\x94\x80\x80\x80\x00\x01\x8e\x80\x80\x80\x00\x00\x02\x7f\x02\x40\x0c\x01\x0b\x41\x01\x0c\x00\x0b\x0b");

// block.wast:257
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x85\x80\x80\x80\x00\x01\x60\x00\x01\x7f\x03\x82\x80\x80\x80\x00\x01\x00\x0a\x95\x80\x80\x80\x00\x01\x8f\x80\x80\x80\x00\x00\x02\x7f\x02\x7f\x01\x0c\x01\x0b\x41\x01\x0c\x00\x0b\x0b");

// block.wast:263
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x85\x80\x80\x80\x00\x01\x60\x00\x01\x7f\x03\x82\x80\x80\x80\x00\x01\x00\x0a\x96\x80\x80\x80\x00\x01\x90\x80\x80\x80\x00\x00\x02\x7f\x02\x7f\x42\x01\x0c\x01\x0b\x41\x01\x0c\x00\x0b\x0b");

// block.wast:272
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x85\x80\x80\x80\x00\x01\x60\x00\x01\x7f\x03\x82\x80\x80\x80\x00\x01\x00\x0a\x8e\x80\x80\x80\x00\x01\x88\x80\x80\x80\x00\x00\x02\x40\x0c\x00\x0b\x68\x0b");

// block.wast:278
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x85\x80\x80\x80\x00\x01\x60\x00\x01\x7f\x03\x82\x80\x80\x80\x00\x01\x00\x0a\x8f\x80\x80\x80\x00\x01\x89\x80\x80\x80\x00\x00\x02\x40\x01\x0c\x00\x0b\x7a\x0b");

// block.wast:284
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x85\x80\x80\x80\x00\x01\x60\x00\x01\x7f\x03\x82\x80\x80\x80\x00\x01\x00\x0a\x90\x80\x80\x80\x00\x01\x8a\x80\x80\x80\x00\x00\x02\x40\x42\x09\x0c\x00\x0b\x7a\x0b");

// block.wast:292
assert_malformed("\x3c\x6d\x61\x6c\x66\x6f\x72\x6d\x65\x64\x20\x71\x75\x6f\x74\x65\x3e");

// block.wast:296
assert_malformed("\x3c\x6d\x61\x6c\x66\x6f\x72\x6d\x65\x64\x20\x71\x75\x6f\x74\x65\x3e");
