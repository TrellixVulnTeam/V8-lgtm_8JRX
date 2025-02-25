
'use strict';

let hostrefs = {};
let hostsym = Symbol("hostref");
function hostref(s) {
  if (! (s in hostrefs)) hostrefs[s] = {[hostsym]: s};
  return hostrefs[s];
}
function is_hostref(x) {
  return (x !== null && hostsym in x) ? 1 : 0;
}
function is_funcref(x) {
  return typeof x === "function" ? 1 : 0;
}
function eq_ref(x, y) {
  return x === y ? 1 : 0;
}

let spectest = {
  hostref: hostref,
  is_hostref: is_hostref,
  is_funcref: is_funcref,
  eq_ref: eq_ref,
  print: console.log.bind(console),
  print_i32: console.log.bind(console),
  print_i32_f32: console.log.bind(console),
  print_f64_f64: console.log.bind(console),
  print_f32: console.log.bind(console),
  print_f64: console.log.bind(console),
  global_i32: 666,
  global_f32: 666,
  global_f64: 666,
  table: new WebAssembly.Table({initial: 10, maximum: 20, element: 'anyfunc'}),
  memory: new WebAssembly.Memory({initial: 1, maximum: 2})
};

let handler = {
  get(target, prop) {
    return (prop in target) ?  target[prop] : {};
  }
};
let registry = new Proxy({spectest}, handler);

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
  let v = instance.exports[name];
  return (v instanceof WebAssembly.Global) ? v.value : v;
}

function exports(instance) {
  return {module: instance.exports, spectest: spectest};
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

function assert_return_ref(action) {
  let actual = action();
  if (actual === null || typeof actual !== "object" && typeof actual !== "function") {
    throw new Error("Wasm reference return value expected, got " + actual);
  };
}

function assert_return_func(action) {
  let actual = action();
  if (typeof actual !== "function") {
    throw new Error("Wasm function return value expected, got " + actual);
  };
}

// table_set.wast:1
let $1 = instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\xa2\x80\x80\x80\x00\x07\x60\x00\x00\x60\x01\x7f\x01\x6f\x60\x01\x7f\x01\x70\x60\x02\x7f\x6f\x00\x60\x02\x7f\x70\x00\x60\x02\x7f\x7f\x00\x60\x01\x7f\x01\x7f\x03\x88\x80\x80\x80\x00\x07\x00\x01\x02\x03\x04\x05\x06\x04\x87\x80\x80\x80\x00\x02\x6f\x00\x01\x70\x00\x02\x07\xdc\x80\x80\x80\x00\x06\x0a\x67\x65\x74\x2d\x61\x6e\x79\x72\x65\x66\x00\x01\x0b\x67\x65\x74\x2d\x66\x75\x6e\x63\x72\x65\x66\x00\x02\x0a\x73\x65\x74\x2d\x61\x6e\x79\x72\x65\x66\x00\x03\x0b\x73\x65\x74\x2d\x66\x75\x6e\x63\x72\x65\x66\x00\x04\x10\x73\x65\x74\x2d\x66\x75\x6e\x63\x72\x65\x66\x2d\x66\x72\x6f\x6d\x00\x05\x0f\x69\x73\x5f\x6e\x75\x6c\x6c\x2d\x66\x75\x6e\x63\x72\x65\x66\x00\x06\x09\x89\x80\x80\x80\x00\x01\x02\x01\x41\x01\x0b\x00\x01\x00\x0a\xd3\x80\x80\x80\x00\x07\x82\x80\x80\x80\x00\x00\x0b\x86\x80\x80\x80\x00\x00\x20\x00\x25\x00\x0b\x86\x80\x80\x80\x00\x00\x20\x00\x25\x01\x0b\x88\x80\x80\x80\x00\x00\x20\x00\x20\x01\x26\x00\x0b\x88\x80\x80\x80\x00\x00\x20\x00\x20\x01\x26\x01\x0b\x8a\x80\x80\x80\x00\x00\x20\x00\x20\x01\x25\x01\x26\x01\x0b\x87\x80\x80\x80\x00\x00\x20\x00\x10\x02\xd1\x0b");

// table_set.wast:28
assert_return(() => call($1, "get-anyref", [0]), null);

// table_set.wast:29
assert_return(() => call($1, "set-anyref", [0, hostref(1)]));

// table_set.wast:30
assert_return(() => call($1, "get-anyref", [0]), hostref(1));

// table_set.wast:31
assert_return(() => call($1, "set-anyref", [0, null]));

// table_set.wast:32
assert_return(() => call($1, "get-anyref", [0]), null);

// table_set.wast:34
assert_return(() => call($1, "get-funcref", [0]), null);

// table_set.wast:35
assert_return(() => call($1, "set-funcref-from", [0, 1]));

// table_set.wast:36
assert_return(() => call($1, "is_null-funcref", [0]), 0);

// table_set.wast:37
assert_return(() => call($1, "set-funcref", [0, null]));

// table_set.wast:38
assert_return(() => call($1, "get-funcref", [0]), null);

// table_set.wast:40
assert_trap(() => call($1, "set-anyref", [2, null]));

// table_set.wast:41
assert_trap(() => call($1, "set-funcref", [3, null]));

// table_set.wast:42
assert_trap(() => call($1, "set-anyref", [-1, null]));

// table_set.wast:43
assert_trap(() => call($1, "set-funcref", [-1, null]));

// table_set.wast:45
assert_trap(() => call($1, "set-anyref", [2, hostref(0)]));

// table_set.wast:46
assert_trap(() => call($1, "set-funcref-from", [3, 1]));

// table_set.wast:47
assert_trap(() => call($1, "set-anyref", [-1, hostref(0)]));

// table_set.wast:48
assert_trap(() => call($1, "set-funcref-from", [-1, 1]));

// table_set.wast:53
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x84\x80\x80\x80\x00\x01\x60\x00\x00\x03\x82\x80\x80\x80\x00\x01\x00\x04\x84\x80\x80\x80\x00\x01\x6f\x00\x0a\x0a\x8a\x80\x80\x80\x00\x01\x84\x80\x80\x80\x00\x00\x26\x00\x0b");

// table_set.wast:62
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x84\x80\x80\x80\x00\x01\x60\x00\x00\x03\x82\x80\x80\x80\x00\x01\x00\x04\x84\x80\x80\x80\x00\x01\x6f\x00\x0a\x0a\x8b\x80\x80\x80\x00\x01\x85\x80\x80\x80\x00\x00\xd0\x26\x00\x0b");

// table_set.wast:71
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x84\x80\x80\x80\x00\x01\x60\x00\x00\x03\x82\x80\x80\x80\x00\x01\x00\x04\x84\x80\x80\x80\x00\x01\x6f\x00\x0a\x0a\x8c\x80\x80\x80\x00\x01\x86\x80\x80\x80\x00\x00\x41\x01\x26\x00\x0b");

// table_set.wast:80
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x84\x80\x80\x80\x00\x01\x60\x00\x00\x03\x82\x80\x80\x80\x00\x01\x00\x04\x84\x80\x80\x80\x00\x01\x6f\x00\x0a\x0a\x90\x80\x80\x80\x00\x01\x8a\x80\x80\x80\x00\x00\x43\x00\x00\x80\x3f\xd0\x26\x00\x0b");

// table_set.wast:89
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x85\x80\x80\x80\x00\x01\x60\x01\x6f\x00\x03\x82\x80\x80\x80\x00\x01\x00\x04\x84\x80\x80\x80\x00\x01\x70\x00\x0a\x0a\x8e\x80\x80\x80\x00\x01\x88\x80\x80\x80\x00\x00\x41\x01\x20\x00\x26\x00\x0b");

// table_set.wast:99
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x85\x80\x80\x80\x00\x01\x60\x01\x6f\x00\x03\x82\x80\x80\x80\x00\x01\x00\x04\x87\x80\x80\x80\x00\x02\x6f\x00\x01\x70\x00\x01\x0a\x8e\x80\x80\x80\x00\x01\x88\x80\x80\x80\x00\x00\x41\x00\x20\x00\x26\x01\x0b");

// table_set.wast:110
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x85\x80\x80\x80\x00\x01\x60\x00\x01\x7f\x03\x82\x80\x80\x80\x00\x01\x00\x04\x84\x80\x80\x80\x00\x01\x6f\x00\x0a\x0a\x8d\x80\x80\x80\x00\x01\x87\x80\x80\x80\x00\x00\x41\x00\xd0\x26\x00\x0b");
