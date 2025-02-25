
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

// table_grow.wast:1
let $1 = instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x95\x80\x80\x80\x00\x04\x60\x01\x7f\x01\x6f\x60\x02\x7f\x6f\x00\x60\x02\x7f\x6f\x01\x7f\x60\x00\x01\x7f\x03\x85\x80\x80\x80\x00\x04\x00\x01\x02\x03\x04\x84\x80\x80\x80\x00\x01\x6f\x00\x00\x07\x9b\x80\x80\x80\x00\x04\x03\x67\x65\x74\x00\x00\x03\x73\x65\x74\x00\x01\x04\x67\x72\x6f\x77\x00\x02\x04\x73\x69\x7a\x65\x00\x03\x0a\xb1\x80\x80\x80\x00\x04\x86\x80\x80\x80\x00\x00\x20\x00\x25\x00\x0b\x88\x80\x80\x80\x00\x00\x20\x00\x20\x01\x26\x00\x0b\x89\x80\x80\x80\x00\x00\x20\x01\x20\x00\xfc\x0f\x00\x0b\x85\x80\x80\x80\x00\x00\xfc\x10\x00\x0b");

// table_grow.wast:13
assert_return(() => call($1, "size", []), 0);

// table_grow.wast:14
assert_trap(() => call($1, "set", [0, hostref(2)]));

// table_grow.wast:15
assert_trap(() => call($1, "get", [0]));

// table_grow.wast:17
assert_return(() => call($1, "grow", [1, null]), 0);

// table_grow.wast:18
assert_return(() => call($1, "size", []), 1);

// table_grow.wast:19
assert_return(() => call($1, "get", [0]), null);

// table_grow.wast:20
assert_return(() => call($1, "set", [0, hostref(2)]));

// table_grow.wast:21
assert_return(() => call($1, "get", [0]), hostref(2));

// table_grow.wast:22
assert_trap(() => call($1, "set", [1, hostref(2)]));

// table_grow.wast:23
assert_trap(() => call($1, "get", [1]));

// table_grow.wast:25
assert_return(() => call($1, "grow", [4, hostref(3)]), 1);

// table_grow.wast:26
assert_return(() => call($1, "size", []), 5);

// table_grow.wast:27
assert_return(() => call($1, "get", [0]), hostref(2));

// table_grow.wast:28
assert_return(() => call($1, "set", [0, hostref(2)]));

// table_grow.wast:29
assert_return(() => call($1, "get", [0]), hostref(2));

// table_grow.wast:30
assert_return(() => call($1, "get", [1]), hostref(3));

// table_grow.wast:31
assert_return(() => call($1, "get", [4]), hostref(3));

// table_grow.wast:32
assert_return(() => call($1, "set", [4, hostref(4)]));

// table_grow.wast:33
assert_return(() => call($1, "get", [4]), hostref(4));

// table_grow.wast:34
assert_trap(() => call($1, "set", [5, hostref(2)]));

// table_grow.wast:35
assert_trap(() => call($1, "get", [5]));

// table_grow.wast:39
let $2 = instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x85\x80\x80\x80\x00\x01\x60\x00\x01\x7f\x03\x82\x80\x80\x80\x00\x01\x00\x04\x84\x80\x80\x80\x00\x01\x6f\x00\x10\x07\x88\x80\x80\x80\x00\x01\x04\x67\x72\x6f\x77\x00\x00\x0a\x8f\x80\x80\x80\x00\x01\x89\x80\x80\x80\x00\x00\xd2\x00\x41\x70\xfc\x0f\x00\x0b");

// table_grow.wast:46
assert_return(() => call($2, "grow", []), -1);

// table_grow.wast:49
let $3 = instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x86\x80\x80\x80\x00\x01\x60\x01\x7f\x01\x7f\x03\x82\x80\x80\x80\x00\x01\x00\x04\x84\x80\x80\x80\x00\x01\x6f\x00\x00\x07\x88\x80\x80\x80\x00\x01\x04\x67\x72\x6f\x77\x00\x00\x0a\x8e\x80\x80\x80\x00\x01\x88\x80\x80\x80\x00\x00\xd0\x20\x00\xfc\x0f\x00\x0b");

// table_grow.wast:56
assert_return(() => call($3, "grow", [0]), 0);

// table_grow.wast:57
assert_return(() => call($3, "grow", [1]), 0);

// table_grow.wast:58
assert_return(() => call($3, "grow", [0]), 1);

// table_grow.wast:59
assert_return(() => call($3, "grow", [2]), 1);

// table_grow.wast:60
assert_return(() => call($3, "grow", [800]), 3);

// table_grow.wast:63
let $4 = instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x86\x80\x80\x80\x00\x01\x60\x01\x7f\x01\x7f\x03\x82\x80\x80\x80\x00\x01\x00\x04\x85\x80\x80\x80\x00\x01\x6f\x01\x00\x0a\x07\x88\x80\x80\x80\x00\x01\x04\x67\x72\x6f\x77\x00\x00\x0a\x8e\x80\x80\x80\x00\x01\x88\x80\x80\x80\x00\x00\xd0\x20\x00\xfc\x0f\x00\x0b");

// table_grow.wast:70
assert_return(() => call($4, "grow", [0]), 0);

// table_grow.wast:71
assert_return(() => call($4, "grow", [1]), 0);

// table_grow.wast:72
assert_return(() => call($4, "grow", [1]), 1);

// table_grow.wast:73
assert_return(() => call($4, "grow", [2]), 2);

// table_grow.wast:74
assert_return(() => call($4, "grow", [6]), 4);

// table_grow.wast:75
assert_return(() => call($4, "grow", [0]), 10);

// table_grow.wast:76
assert_return(() => call($4, "grow", [1]), -1);

// table_grow.wast:77
assert_return(() => call($4, "grow", [65536]), -1);

// table_grow.wast:80
let $5 = instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x8c\x80\x80\x80\x00\x02\x60\x01\x7f\x01\x7f\x60\x02\x7f\x7f\x01\x6f\x03\x83\x80\x80\x80\x00\x02\x00\x01\x04\x84\x80\x80\x80\x00\x01\x6f\x00\x0a\x07\x9b\x80\x80\x80\x00\x02\x04\x67\x72\x6f\x77\x00\x00\x10\x63\x68\x65\x63\x6b\x2d\x74\x61\x62\x6c\x65\x2d\x6e\x75\x6c\x6c\x00\x01\x0a\xc4\x80\x80\x80\x00\x02\x88\x80\x80\x80\x00\x00\xd0\x20\x00\xfc\x0f\x00\x0b\xb1\x80\x80\x80\x00\x01\x01\x6f\xd2\x01\x21\x02\x02\x40\x03\x40\x20\x00\x25\x00\x21\x02\x20\x02\xd1\x45\x0d\x01\x20\x00\x20\x01\x4f\x0d\x01\x20\x00\x41\x01\x6a\x21\x00\x20\x00\x20\x01\x4d\x0d\x00\x0b\x0b\x20\x02\x0b");

// table_grow.wast:101
assert_return(() => call($5, "check-table-null", [0, 9]), null);

// table_grow.wast:102
assert_return(() => call($5, "grow", [10]), 10);

// table_grow.wast:103
assert_return(() => call($5, "check-table-null", [0, 19]), null);

// table_grow.wast:108
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x85\x80\x80\x80\x00\x01\x60\x00\x01\x7f\x03\x82\x80\x80\x80\x00\x01\x00\x04\x84\x80\x80\x80\x00\x01\x6f\x00\x00\x0a\x8b\x80\x80\x80\x00\x01\x85\x80\x80\x80\x00\x00\xfc\x0f\x00\x0b");

// table_grow.wast:117
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x85\x80\x80\x80\x00\x01\x60\x00\x01\x7f\x03\x82\x80\x80\x80\x00\x01\x00\x04\x84\x80\x80\x80\x00\x01\x6f\x00\x00\x0a\x8c\x80\x80\x80\x00\x01\x86\x80\x80\x80\x00\x00\xd0\xfc\x0f\x00\x0b");

// table_grow.wast:126
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x85\x80\x80\x80\x00\x01\x60\x00\x01\x7f\x03\x82\x80\x80\x80\x00\x01\x00\x04\x84\x80\x80\x80\x00\x01\x6f\x00\x00\x0a\x8d\x80\x80\x80\x00\x01\x87\x80\x80\x80\x00\x00\x41\x01\xfc\x0f\x00\x0b");

// table_grow.wast:135
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x85\x80\x80\x80\x00\x01\x60\x00\x01\x7f\x03\x82\x80\x80\x80\x00\x01\x00\x04\x84\x80\x80\x80\x00\x01\x6f\x00\x00\x0a\x91\x80\x80\x80\x00\x01\x8b\x80\x80\x80\x00\x00\xd0\x43\x00\x00\x80\x3f\xfc\x0f\x00\x0b");

// table_grow.wast:144
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x86\x80\x80\x80\x00\x01\x60\x01\x6f\x01\x7f\x03\x82\x80\x80\x80\x00\x01\x00\x04\x84\x80\x80\x80\x00\x01\x70\x00\x00\x0a\x8f\x80\x80\x80\x00\x01\x89\x80\x80\x80\x00\x00\x20\x00\x41\x01\xfc\x0f\x00\x0b");

// table_grow.wast:154
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x84\x80\x80\x80\x00\x01\x60\x00\x00\x03\x82\x80\x80\x80\x00\x01\x00\x04\x84\x80\x80\x80\x00\x01\x6f\x00\x01\x0a\x8e\x80\x80\x80\x00\x01\x88\x80\x80\x80\x00\x00\xd0\x41\x00\xfc\x0f\x00\x0b");

// table_grow.wast:163
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x85\x80\x80\x80\x00\x01\x60\x00\x01\x7d\x03\x82\x80\x80\x80\x00\x01\x00\x04\x84\x80\x80\x80\x00\x01\x6f\x00\x01\x0a\x8e\x80\x80\x80\x00\x01\x88\x80\x80\x80\x00\x00\xd0\x41\x00\xfc\x0f\x00\x0b");
