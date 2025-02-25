
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

// globals.wast:3
let $1 = instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\xb3\x80\x80\x80\x00\x0c\x60\x02\x7f\x7f\x01\x7f\x60\x00\x01\x7f\x60\x00\x01\x7e\x60\x00\x01\x6f\x60\x01\x7f\x00\x60\x01\x7e\x00\x60\x00\x01\x7d\x60\x00\x01\x7c\x60\x01\x7d\x00\x60\x01\x7c\x00\x60\x00\x00\x60\x01\x7f\x01\x7f\x03\xaf\x80\x80\x80\x00\x2e\x01\x02\x03\x01\x02\x04\x05\x06\x07\x06\x07\x08\x09\x0a\x01\x01\x01\x01\x01\x01\x01\x01\x01\x01\x01\x01\x01\x00\x01\x01\x01\x0a\x0a\x01\x01\x0b\x01\x01\x0a\x01\x0b\x0b\x01\x01\x01\x01\x04\x85\x80\x80\x80\x00\x01\x70\x01\x01\x01\x05\x83\x80\x80\x80\x00\x01\x00\x01\x06\xc5\x80\x80\x80\x00\x0a\x7f\x00\x41\x7e\x0b\x7d\x00\x43\x00\x00\x40\xc0\x0b\x7c\x00\x44\x00\x00\x00\x00\x00\x00\x10\xc0\x0b\x7e\x00\x42\x7b\x0b\x7f\x01\x41\x74\x0b\x7d\x01\x43\x00\x00\x50\xc1\x0b\x7c\x01\x44\x00\x00\x00\x00\x00\x00\x2c\xc0\x0b\x7e\x01\x42\x71\x0b\x6f\x00\xd0\x0b\x70\x00\xd0\x0b\x07\x8d\x85\x80\x80\x00\x2b\x05\x67\x65\x74\x2d\x61\x00\x00\x05\x67\x65\x74\x2d\x62\x00\x01\x05\x67\x65\x74\x2d\x72\x00\x02\x05\x67\x65\x74\x2d\x78\x00\x03\x05\x67\x65\x74\x2d\x79\x00\x04\x05\x73\x65\x74\x2d\x78\x00\x05\x05\x73\x65\x74\x2d\x79\x00\x06\x05\x67\x65\x74\x2d\x31\x00\x07\x05\x67\x65\x74\x2d\x32\x00\x08\x05\x67\x65\x74\x2d\x35\x00\x09\x05\x67\x65\x74\x2d\x36\x00\x0a\x05\x73\x65\x74\x2d\x35\x00\x0b\x05\x73\x65\x74\x2d\x36\x00\x0c\x0f\x61\x73\x2d\x73\x65\x6c\x65\x63\x74\x2d\x66\x69\x72\x73\x74\x00\x0e\x0d\x61\x73\x2d\x73\x65\x6c\x65\x63\x74\x2d\x6d\x69\x64\x00\x0f\x0e\x61\x73\x2d\x73\x65\x6c\x65\x63\x74\x2d\x6c\x61\x73\x74\x00\x10\x0d\x61\x73\x2d\x6c\x6f\x6f\x70\x2d\x66\x69\x72\x73\x74\x00\x11\x0b\x61\x73\x2d\x6c\x6f\x6f\x70\x2d\x6d\x69\x64\x00\x12\x0c\x61\x73\x2d\x6c\x6f\x6f\x70\x2d\x6c\x61\x73\x74\x00\x13\x0f\x61\x73\x2d\x69\x66\x2d\x63\x6f\x6e\x64\x69\x74\x69\x6f\x6e\x00\x14\x0a\x61\x73\x2d\x69\x66\x2d\x74\x68\x65\x6e\x00\x15\x0a\x61\x73\x2d\x69\x66\x2d\x65\x6c\x73\x65\x00\x16\x0e\x61\x73\x2d\x62\x72\x5f\x69\x66\x2d\x66\x69\x72\x73\x74\x00\x17\x0d\x61\x73\x2d\x62\x72\x5f\x69\x66\x2d\x6c\x61\x73\x74\x00\x18\x11\x61\x73\x2d\x62\x72\x5f\x74\x61\x62\x6c\x65\x2d\x66\x69\x72\x73\x74\x00\x19\x10\x61\x73\x2d\x62\x72\x5f\x74\x61\x62\x6c\x65\x2d\x6c\x61\x73\x74\x00\x1a\x16\x61\x73\x2d\x63\x61\x6c\x6c\x5f\x69\x6e\x64\x69\x72\x65\x63\x74\x2d\x66\x69\x72\x73\x74\x00\x1c\x14\x61\x73\x2d\x63\x61\x6c\x6c\x5f\x69\x6e\x64\x69\x72\x65\x63\x74\x2d\x6d\x69\x64\x00\x1d\x15\x61\x73\x2d\x63\x61\x6c\x6c\x5f\x69\x6e\x64\x69\x72\x65\x63\x74\x2d\x6c\x61\x73\x74\x00\x1e\x0e\x61\x73\x2d\x73\x74\x6f\x72\x65\x2d\x66\x69\x72\x73\x74\x00\x1f\x0d\x61\x73\x2d\x73\x74\x6f\x72\x65\x2d\x6c\x61\x73\x74\x00\x20\x0f\x61\x73\x2d\x6c\x6f\x61\x64\x2d\x6f\x70\x65\x72\x61\x6e\x64\x00\x21\x14\x61\x73\x2d\x6d\x65\x6d\x6f\x72\x79\x2e\x67\x72\x6f\x77\x2d\x76\x61\x6c\x75\x65\x00\x22\x0d\x61\x73\x2d\x63\x61\x6c\x6c\x2d\x76\x61\x6c\x75\x65\x00\x24\x0f\x61\x73\x2d\x72\x65\x74\x75\x72\x6e\x2d\x76\x61\x6c\x75\x65\x00\x25\x0f\x61\x73\x2d\x64\x72\x6f\x70\x2d\x6f\x70\x65\x72\x61\x6e\x64\x00\x26\x0b\x61\x73\x2d\x62\x72\x2d\x76\x61\x6c\x75\x65\x00\x27\x12\x61\x73\x2d\x6c\x6f\x63\x61\x6c\x2e\x73\x65\x74\x2d\x76\x61\x6c\x75\x65\x00\x28\x12\x61\x73\x2d\x6c\x6f\x63\x61\x6c\x2e\x74\x65\x65\x2d\x76\x61\x6c\x75\x65\x00\x29\x13\x61\x73\x2d\x67\x6c\x6f\x62\x61\x6c\x2e\x73\x65\x74\x2d\x76\x61\x6c\x75\x65\x00\x2a\x10\x61\x73\x2d\x75\x6e\x61\x72\x79\x2d\x6f\x70\x65\x72\x61\x6e\x64\x00\x2b\x11\x61\x73\x2d\x62\x69\x6e\x61\x72\x79\x2d\x6f\x70\x65\x72\x61\x6e\x64\x00\x2c\x12\x61\x73\x2d\x63\x6f\x6d\x70\x61\x72\x65\x2d\x6f\x70\x65\x72\x61\x6e\x64\x00\x2d\x09\x87\x80\x80\x80\x00\x01\x00\x41\x00\x0b\x01\x1b\x0a\xd2\x84\x80\x80\x00\x2e\x84\x80\x80\x80\x00\x00\x23\x00\x0b\x84\x80\x80\x80\x00\x00\x23\x03\x0b\x84\x80\x80\x80\x00\x00\x23\x08\x0b\x84\x80\x80\x80\x00\x00\x23\x04\x0b\x84\x80\x80\x80\x00\x00\x23\x07\x0b\x86\x80\x80\x80\x00\x00\x20\x00\x24\x04\x0b\x86\x80\x80\x80\x00\x00\x20\x00\x24\x07\x0b\x84\x80\x80\x80\x00\x00\x23\x01\x0b\x84\x80\x80\x80\x00\x00\x23\x02\x0b\x84\x80\x80\x80\x00\x00\x23\x05\x0b\x84\x80\x80\x80\x00\x00\x23\x06\x0b\x86\x80\x80\x80\x00\x00\x20\x00\x24\x05\x0b\x86\x80\x80\x80\x00\x00\x20\x00\x24\x06\x0b\x82\x80\x80\x80\x00\x00\x0b\x89\x80\x80\x80\x00\x00\x23\x04\x41\x02\x41\x03\x1b\x0b\x89\x80\x80\x80\x00\x00\x41\x02\x23\x04\x41\x03\x1b\x0b\x89\x80\x80\x80\x00\x00\x41\x02\x41\x03\x23\x04\x1b\x0b\x8b\x80\x80\x80\x00\x00\x03\x7f\x23\x04\x10\x0d\x10\x0d\x0b\x0b\x8b\x80\x80\x80\x00\x00\x03\x7f\x10\x0d\x23\x04\x10\x0d\x0b\x0b\x8b\x80\x80\x80\x00\x00\x03\x7f\x10\x0d\x10\x0d\x23\x04\x0b\x0b\x90\x80\x80\x80\x00\x00\x23\x04\x04\x7f\x10\x0d\x41\x02\x05\x10\x0d\x41\x03\x0b\x0b\x8c\x80\x80\x80\x00\x00\x41\x01\x04\x7f\x23\x04\x05\x41\x02\x0b\x0b\x8c\x80\x80\x80\x00\x00\x41\x00\x04\x7f\x41\x02\x05\x23\x04\x0b\x0b\x8e\x80\x80\x80\x00\x00\x02\x7f\x23\x04\x41\x02\x0d\x00\x41\x03\x0f\x0b\x0b\x8e\x80\x80\x80\x00\x00\x02\x7f\x41\x02\x23\x04\x0d\x00\x41\x03\x0f\x0b\x0b\x8d\x80\x80\x80\x00\x00\x02\x7f\x23\x04\x41\x02\x0e\x01\x00\x00\x0b\x0b\x8d\x80\x80\x80\x00\x00\x02\x7f\x41\x02\x23\x04\x0e\x01\x00\x00\x0b\x0b\x84\x80\x80\x80\x00\x00\x20\x00\x0b\x8e\x80\x80\x80\x00\x00\x02\x7f\x23\x04\x41\x02\x41\x00\x11\x00\x00\x0b\x0b\x8e\x80\x80\x80\x00\x00\x02\x7f\x41\x02\x23\x04\x41\x00\x11\x00\x00\x0b\x0b\x8e\x80\x80\x80\x00\x00\x02\x7f\x41\x02\x41\x00\x23\x04\x11\x00\x00\x0b\x0b\x89\x80\x80\x80\x00\x00\x23\x04\x41\x01\x36\x02\x00\x0b\x89\x80\x80\x80\x00\x00\x41\x00\x23\x04\x36\x02\x00\x0b\x87\x80\x80\x80\x00\x00\x23\x04\x28\x02\x00\x0b\x86\x80\x80\x80\x00\x00\x23\x04\x40\x00\x0b\x84\x80\x80\x80\x00\x00\x20\x00\x0b\x86\x80\x80\x80\x00\x00\x23\x04\x10\x23\x0b\x85\x80\x80\x80\x00\x00\x23\x04\x0f\x0b\x85\x80\x80\x80\x00\x00\x23\x04\x1a\x0b\x89\x80\x80\x80\x00\x00\x02\x7f\x23\x04\x0c\x00\x0b\x0b\x88\x80\x80\x80\x00\x00\x23\x04\x21\x00\x20\x00\x0b\x86\x80\x80\x80\x00\x00\x23\x04\x22\x00\x0b\x88\x80\x80\x80\x00\x00\x23\x04\x24\x04\x23\x04\x0b\x85\x80\x80\x80\x00\x00\x23\x04\x45\x0b\x87\x80\x80\x80\x00\x00\x23\x04\x23\x04\x6c\x0b\x87\x80\x80\x80\x00\x00\x23\x00\x41\x01\x4b\x0b");

// globals.wast:185
assert_return(() => call($1, "get-a", []), -2);

// globals.wast:186
run(() => call(instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x9d\x80\x80\x80\x00\x06\x60\x00\x00\x60\x01\x7f\x01\x6f\x60\x01\x6f\x01\x7f\x60\x01\x6f\x01\x7f\x60\x02\x6f\x6f\x01\x7f\x60\x00\x01\x7e\x02\xe1\x80\x80\x80\x00\x05\x06\x6d\x6f\x64\x75\x6c\x65\x05\x67\x65\x74\x2d\x62\x00\x05\x08\x73\x70\x65\x63\x74\x65\x73\x74\x07\x68\x6f\x73\x74\x72\x65\x66\x00\x01\x08\x73\x70\x65\x63\x74\x65\x73\x74\x0a\x69\x73\x5f\x68\x6f\x73\x74\x72\x65\x66\x00\x02\x08\x73\x70\x65\x63\x74\x65\x73\x74\x0a\x69\x73\x5f\x66\x75\x6e\x63\x72\x65\x66\x00\x03\x08\x73\x70\x65\x63\x74\x65\x73\x74\x06\x65\x71\x5f\x72\x65\x66\x00\x04\x03\x82\x80\x80\x80\x00\x01\x00\x07\x87\x80\x80\x80\x00\x01\x03\x72\x75\x6e\x00\x05\x0a\x97\x80\x80\x80\x00\x01\x91\x80\x80\x80\x00\x00\x02\x40\x10\x00\x01\x42\x7b\x01\x51\x45\x0d\x00\x0f\x0b\x00\x0b", exports($1)),  "run", []));  // assert_return(() => call($1, "get-b", []), int64("-5"))

// globals.wast:187
assert_return(() => call($1, "get-r", []), null);

// globals.wast:188
assert_return(() => call($1, "get-x", []), -12);

// globals.wast:189
run(() => call(instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x9d\x80\x80\x80\x00\x06\x60\x00\x00\x60\x01\x7f\x01\x6f\x60\x01\x6f\x01\x7f\x60\x01\x6f\x01\x7f\x60\x02\x6f\x6f\x01\x7f\x60\x00\x01\x7e\x02\xe1\x80\x80\x80\x00\x05\x06\x6d\x6f\x64\x75\x6c\x65\x05\x67\x65\x74\x2d\x79\x00\x05\x08\x73\x70\x65\x63\x74\x65\x73\x74\x07\x68\x6f\x73\x74\x72\x65\x66\x00\x01\x08\x73\x70\x65\x63\x74\x65\x73\x74\x0a\x69\x73\x5f\x68\x6f\x73\x74\x72\x65\x66\x00\x02\x08\x73\x70\x65\x63\x74\x65\x73\x74\x0a\x69\x73\x5f\x66\x75\x6e\x63\x72\x65\x66\x00\x03\x08\x73\x70\x65\x63\x74\x65\x73\x74\x06\x65\x71\x5f\x72\x65\x66\x00\x04\x03\x82\x80\x80\x80\x00\x01\x00\x07\x87\x80\x80\x80\x00\x01\x03\x72\x75\x6e\x00\x05\x0a\x97\x80\x80\x80\x00\x01\x91\x80\x80\x80\x00\x00\x02\x40\x10\x00\x01\x42\x71\x01\x51\x45\x0d\x00\x0f\x0b\x00\x0b", exports($1)),  "run", []));  // assert_return(() => call($1, "get-y", []), int64("-15"))

// globals.wast:191
run(() => call(instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x9d\x80\x80\x80\x00\x06\x60\x00\x00\x60\x01\x7f\x01\x6f\x60\x01\x6f\x01\x7f\x60\x01\x6f\x01\x7f\x60\x02\x6f\x6f\x01\x7f\x60\x00\x01\x7d\x02\xe1\x80\x80\x80\x00\x05\x06\x6d\x6f\x64\x75\x6c\x65\x05\x67\x65\x74\x2d\x31\x00\x05\x08\x73\x70\x65\x63\x74\x65\x73\x74\x07\x68\x6f\x73\x74\x72\x65\x66\x00\x01\x08\x73\x70\x65\x63\x74\x65\x73\x74\x0a\x69\x73\x5f\x68\x6f\x73\x74\x72\x65\x66\x00\x02\x08\x73\x70\x65\x63\x74\x65\x73\x74\x0a\x69\x73\x5f\x66\x75\x6e\x63\x72\x65\x66\x00\x03\x08\x73\x70\x65\x63\x74\x65\x73\x74\x06\x65\x71\x5f\x72\x65\x66\x00\x04\x03\x82\x80\x80\x80\x00\x01\x00\x07\x87\x80\x80\x80\x00\x01\x03\x72\x75\x6e\x00\x05\x0a\x9a\x80\x80\x80\x00\x01\x94\x80\x80\x80\x00\x00\x02\x40\x10\x00\xbc\x43\x00\x00\x40\xc0\xbc\x46\x45\x0d\x00\x0f\x0b\x00\x0b", exports($1)),  "run", []));  // assert_return(() => call($1, "get-1", []), -3.)

// globals.wast:192
run(() => call(instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x9d\x80\x80\x80\x00\x06\x60\x00\x00\x60\x01\x7f\x01\x6f\x60\x01\x6f\x01\x7f\x60\x01\x6f\x01\x7f\x60\x02\x6f\x6f\x01\x7f\x60\x00\x01\x7c\x02\xe1\x80\x80\x80\x00\x05\x06\x6d\x6f\x64\x75\x6c\x65\x05\x67\x65\x74\x2d\x32\x00\x05\x08\x73\x70\x65\x63\x74\x65\x73\x74\x07\x68\x6f\x73\x74\x72\x65\x66\x00\x01\x08\x73\x70\x65\x63\x74\x65\x73\x74\x0a\x69\x73\x5f\x68\x6f\x73\x74\x72\x65\x66\x00\x02\x08\x73\x70\x65\x63\x74\x65\x73\x74\x0a\x69\x73\x5f\x66\x75\x6e\x63\x72\x65\x66\x00\x03\x08\x73\x70\x65\x63\x74\x65\x73\x74\x06\x65\x71\x5f\x72\x65\x66\x00\x04\x03\x82\x80\x80\x80\x00\x01\x00\x07\x87\x80\x80\x80\x00\x01\x03\x72\x75\x6e\x00\x05\x0a\x9e\x80\x80\x80\x00\x01\x98\x80\x80\x80\x00\x00\x02\x40\x10\x00\xbd\x44\x00\x00\x00\x00\x00\x00\x10\xc0\xbd\x51\x45\x0d\x00\x0f\x0b\x00\x0b", exports($1)),  "run", []));  // assert_return(() => call($1, "get-2", []), -4.)

// globals.wast:193
run(() => call(instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x9d\x80\x80\x80\x00\x06\x60\x00\x00\x60\x01\x7f\x01\x6f\x60\x01\x6f\x01\x7f\x60\x01\x6f\x01\x7f\x60\x02\x6f\x6f\x01\x7f\x60\x00\x01\x7d\x02\xe1\x80\x80\x80\x00\x05\x06\x6d\x6f\x64\x75\x6c\x65\x05\x67\x65\x74\x2d\x35\x00\x05\x08\x73\x70\x65\x63\x74\x65\x73\x74\x07\x68\x6f\x73\x74\x72\x65\x66\x00\x01\x08\x73\x70\x65\x63\x74\x65\x73\x74\x0a\x69\x73\x5f\x68\x6f\x73\x74\x72\x65\x66\x00\x02\x08\x73\x70\x65\x63\x74\x65\x73\x74\x0a\x69\x73\x5f\x66\x75\x6e\x63\x72\x65\x66\x00\x03\x08\x73\x70\x65\x63\x74\x65\x73\x74\x06\x65\x71\x5f\x72\x65\x66\x00\x04\x03\x82\x80\x80\x80\x00\x01\x00\x07\x87\x80\x80\x80\x00\x01\x03\x72\x75\x6e\x00\x05\x0a\x9a\x80\x80\x80\x00\x01\x94\x80\x80\x80\x00\x00\x02\x40\x10\x00\xbc\x43\x00\x00\x50\xc1\xbc\x46\x45\x0d\x00\x0f\x0b\x00\x0b", exports($1)),  "run", []));  // assert_return(() => call($1, "get-5", []), -13.)

// globals.wast:194
run(() => call(instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x9d\x80\x80\x80\x00\x06\x60\x00\x00\x60\x01\x7f\x01\x6f\x60\x01\x6f\x01\x7f\x60\x01\x6f\x01\x7f\x60\x02\x6f\x6f\x01\x7f\x60\x00\x01\x7c\x02\xe1\x80\x80\x80\x00\x05\x06\x6d\x6f\x64\x75\x6c\x65\x05\x67\x65\x74\x2d\x36\x00\x05\x08\x73\x70\x65\x63\x74\x65\x73\x74\x07\x68\x6f\x73\x74\x72\x65\x66\x00\x01\x08\x73\x70\x65\x63\x74\x65\x73\x74\x0a\x69\x73\x5f\x68\x6f\x73\x74\x72\x65\x66\x00\x02\x08\x73\x70\x65\x63\x74\x65\x73\x74\x0a\x69\x73\x5f\x66\x75\x6e\x63\x72\x65\x66\x00\x03\x08\x73\x70\x65\x63\x74\x65\x73\x74\x06\x65\x71\x5f\x72\x65\x66\x00\x04\x03\x82\x80\x80\x80\x00\x01\x00\x07\x87\x80\x80\x80\x00\x01\x03\x72\x75\x6e\x00\x05\x0a\x9e\x80\x80\x80\x00\x01\x98\x80\x80\x80\x00\x00\x02\x40\x10\x00\xbd\x44\x00\x00\x00\x00\x00\x00\x2c\xc0\xbd\x51\x45\x0d\x00\x0f\x0b\x00\x0b", exports($1)),  "run", []));  // assert_return(() => call($1, "get-6", []), -14.)

// globals.wast:196
assert_return(() => call($1, "set-x", [6]));

// globals.wast:197
run(() => call(instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x9d\x80\x80\x80\x00\x06\x60\x00\x00\x60\x01\x7f\x01\x6f\x60\x01\x6f\x01\x7f\x60\x01\x6f\x01\x7f\x60\x02\x6f\x6f\x01\x7f\x60\x01\x7e\x00\x02\xe1\x80\x80\x80\x00\x05\x06\x6d\x6f\x64\x75\x6c\x65\x05\x73\x65\x74\x2d\x79\x00\x05\x08\x73\x70\x65\x63\x74\x65\x73\x74\x07\x68\x6f\x73\x74\x72\x65\x66\x00\x01\x08\x73\x70\x65\x63\x74\x65\x73\x74\x0a\x69\x73\x5f\x68\x6f\x73\x74\x72\x65\x66\x00\x02\x08\x73\x70\x65\x63\x74\x65\x73\x74\x0a\x69\x73\x5f\x66\x75\x6e\x63\x72\x65\x66\x00\x03\x08\x73\x70\x65\x63\x74\x65\x73\x74\x06\x65\x71\x5f\x72\x65\x66\x00\x04\x03\x82\x80\x80\x80\x00\x01\x00\x07\x87\x80\x80\x80\x00\x01\x03\x72\x75\x6e\x00\x05\x0a\x91\x80\x80\x80\x00\x01\x8b\x80\x80\x80\x00\x00\x02\x40\x42\x07\x10\x00\x0f\x0b\x00\x0b", exports($1)),  "run", []));  // assert_return(() => call($1, "set-y", [int64("7")]))

// globals.wast:198
run(() => call(instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x9d\x80\x80\x80\x00\x06\x60\x00\x00\x60\x01\x7f\x01\x6f\x60\x01\x6f\x01\x7f\x60\x01\x6f\x01\x7f\x60\x02\x6f\x6f\x01\x7f\x60\x01\x7d\x00\x02\xe1\x80\x80\x80\x00\x05\x06\x6d\x6f\x64\x75\x6c\x65\x05\x73\x65\x74\x2d\x35\x00\x05\x08\x73\x70\x65\x63\x74\x65\x73\x74\x07\x68\x6f\x73\x74\x72\x65\x66\x00\x01\x08\x73\x70\x65\x63\x74\x65\x73\x74\x0a\x69\x73\x5f\x68\x6f\x73\x74\x72\x65\x66\x00\x02\x08\x73\x70\x65\x63\x74\x65\x73\x74\x0a\x69\x73\x5f\x66\x75\x6e\x63\x72\x65\x66\x00\x03\x08\x73\x70\x65\x63\x74\x65\x73\x74\x06\x65\x71\x5f\x72\x65\x66\x00\x04\x03\x82\x80\x80\x80\x00\x01\x00\x07\x87\x80\x80\x80\x00\x01\x03\x72\x75\x6e\x00\x05\x0a\x94\x80\x80\x80\x00\x01\x8e\x80\x80\x80\x00\x00\x02\x40\x43\x00\x00\x00\x41\x10\x00\x0f\x0b\x00\x0b", exports($1)),  "run", []));  // assert_return(() => call($1, "set-5", [8.]))

// globals.wast:199
run(() => call(instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x9d\x80\x80\x80\x00\x06\x60\x00\x00\x60\x01\x7f\x01\x6f\x60\x01\x6f\x01\x7f\x60\x01\x6f\x01\x7f\x60\x02\x6f\x6f\x01\x7f\x60\x01\x7c\x00\x02\xe1\x80\x80\x80\x00\x05\x06\x6d\x6f\x64\x75\x6c\x65\x05\x73\x65\x74\x2d\x36\x00\x05\x08\x73\x70\x65\x63\x74\x65\x73\x74\x07\x68\x6f\x73\x74\x72\x65\x66\x00\x01\x08\x73\x70\x65\x63\x74\x65\x73\x74\x0a\x69\x73\x5f\x68\x6f\x73\x74\x72\x65\x66\x00\x02\x08\x73\x70\x65\x63\x74\x65\x73\x74\x0a\x69\x73\x5f\x66\x75\x6e\x63\x72\x65\x66\x00\x03\x08\x73\x70\x65\x63\x74\x65\x73\x74\x06\x65\x71\x5f\x72\x65\x66\x00\x04\x03\x82\x80\x80\x80\x00\x01\x00\x07\x87\x80\x80\x80\x00\x01\x03\x72\x75\x6e\x00\x05\x0a\x98\x80\x80\x80\x00\x01\x92\x80\x80\x80\x00\x00\x02\x40\x44\x00\x00\x00\x00\x00\x00\x22\x40\x10\x00\x0f\x0b\x00\x0b", exports($1)),  "run", []));  // assert_return(() => call($1, "set-6", [9.]))

// globals.wast:201
assert_return(() => call($1, "get-x", []), 6);

// globals.wast:202
run(() => call(instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x9d\x80\x80\x80\x00\x06\x60\x00\x00\x60\x01\x7f\x01\x6f\x60\x01\x6f\x01\x7f\x60\x01\x6f\x01\x7f\x60\x02\x6f\x6f\x01\x7f\x60\x00\x01\x7e\x02\xe1\x80\x80\x80\x00\x05\x06\x6d\x6f\x64\x75\x6c\x65\x05\x67\x65\x74\x2d\x79\x00\x05\x08\x73\x70\x65\x63\x74\x65\x73\x74\x07\x68\x6f\x73\x74\x72\x65\x66\x00\x01\x08\x73\x70\x65\x63\x74\x65\x73\x74\x0a\x69\x73\x5f\x68\x6f\x73\x74\x72\x65\x66\x00\x02\x08\x73\x70\x65\x63\x74\x65\x73\x74\x0a\x69\x73\x5f\x66\x75\x6e\x63\x72\x65\x66\x00\x03\x08\x73\x70\x65\x63\x74\x65\x73\x74\x06\x65\x71\x5f\x72\x65\x66\x00\x04\x03\x82\x80\x80\x80\x00\x01\x00\x07\x87\x80\x80\x80\x00\x01\x03\x72\x75\x6e\x00\x05\x0a\x97\x80\x80\x80\x00\x01\x91\x80\x80\x80\x00\x00\x02\x40\x10\x00\x01\x42\x07\x01\x51\x45\x0d\x00\x0f\x0b\x00\x0b", exports($1)),  "run", []));  // assert_return(() => call($1, "get-y", []), int64("7"))

// globals.wast:203
run(() => call(instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x9d\x80\x80\x80\x00\x06\x60\x00\x00\x60\x01\x7f\x01\x6f\x60\x01\x6f\x01\x7f\x60\x01\x6f\x01\x7f\x60\x02\x6f\x6f\x01\x7f\x60\x00\x01\x7d\x02\xe1\x80\x80\x80\x00\x05\x06\x6d\x6f\x64\x75\x6c\x65\x05\x67\x65\x74\x2d\x35\x00\x05\x08\x73\x70\x65\x63\x74\x65\x73\x74\x07\x68\x6f\x73\x74\x72\x65\x66\x00\x01\x08\x73\x70\x65\x63\x74\x65\x73\x74\x0a\x69\x73\x5f\x68\x6f\x73\x74\x72\x65\x66\x00\x02\x08\x73\x70\x65\x63\x74\x65\x73\x74\x0a\x69\x73\x5f\x66\x75\x6e\x63\x72\x65\x66\x00\x03\x08\x73\x70\x65\x63\x74\x65\x73\x74\x06\x65\x71\x5f\x72\x65\x66\x00\x04\x03\x82\x80\x80\x80\x00\x01\x00\x07\x87\x80\x80\x80\x00\x01\x03\x72\x75\x6e\x00\x05\x0a\x9a\x80\x80\x80\x00\x01\x94\x80\x80\x80\x00\x00\x02\x40\x10\x00\xbc\x43\x00\x00\x00\x41\xbc\x46\x45\x0d\x00\x0f\x0b\x00\x0b", exports($1)),  "run", []));  // assert_return(() => call($1, "get-5", []), 8.)

// globals.wast:204
run(() => call(instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x9d\x80\x80\x80\x00\x06\x60\x00\x00\x60\x01\x7f\x01\x6f\x60\x01\x6f\x01\x7f\x60\x01\x6f\x01\x7f\x60\x02\x6f\x6f\x01\x7f\x60\x00\x01\x7c\x02\xe1\x80\x80\x80\x00\x05\x06\x6d\x6f\x64\x75\x6c\x65\x05\x67\x65\x74\x2d\x36\x00\x05\x08\x73\x70\x65\x63\x74\x65\x73\x74\x07\x68\x6f\x73\x74\x72\x65\x66\x00\x01\x08\x73\x70\x65\x63\x74\x65\x73\x74\x0a\x69\x73\x5f\x68\x6f\x73\x74\x72\x65\x66\x00\x02\x08\x73\x70\x65\x63\x74\x65\x73\x74\x0a\x69\x73\x5f\x66\x75\x6e\x63\x72\x65\x66\x00\x03\x08\x73\x70\x65\x63\x74\x65\x73\x74\x06\x65\x71\x5f\x72\x65\x66\x00\x04\x03\x82\x80\x80\x80\x00\x01\x00\x07\x87\x80\x80\x80\x00\x01\x03\x72\x75\x6e\x00\x05\x0a\x9e\x80\x80\x80\x00\x01\x98\x80\x80\x80\x00\x00\x02\x40\x10\x00\xbd\x44\x00\x00\x00\x00\x00\x00\x22\x40\xbd\x51\x45\x0d\x00\x0f\x0b\x00\x0b", exports($1)),  "run", []));  // assert_return(() => call($1, "get-6", []), 9.)

// globals.wast:206
assert_return(() => call($1, "as-select-first", []), 6);

// globals.wast:207
assert_return(() => call($1, "as-select-mid", []), 2);

// globals.wast:208
assert_return(() => call($1, "as-select-last", []), 2);

// globals.wast:210
assert_return(() => call($1, "as-loop-first", []), 6);

// globals.wast:211
assert_return(() => call($1, "as-loop-mid", []), 6);

// globals.wast:212
assert_return(() => call($1, "as-loop-last", []), 6);

// globals.wast:214
assert_return(() => call($1, "as-if-condition", []), 2);

// globals.wast:215
assert_return(() => call($1, "as-if-then", []), 6);

// globals.wast:216
assert_return(() => call($1, "as-if-else", []), 6);

// globals.wast:218
assert_return(() => call($1, "as-br_if-first", []), 6);

// globals.wast:219
assert_return(() => call($1, "as-br_if-last", []), 2);

// globals.wast:221
assert_return(() => call($1, "as-br_table-first", []), 6);

// globals.wast:222
assert_return(() => call($1, "as-br_table-last", []), 2);

// globals.wast:224
assert_return(() => call($1, "as-call_indirect-first", []), 6);

// globals.wast:225
assert_return(() => call($1, "as-call_indirect-mid", []), 2);

// globals.wast:226
assert_trap(() => call($1, "as-call_indirect-last", []));

// globals.wast:228
assert_return(() => call($1, "as-store-first", []));

// globals.wast:229
assert_return(() => call($1, "as-store-last", []));

// globals.wast:230
assert_return(() => call($1, "as-load-operand", []), 1);

// globals.wast:231
assert_return(() => call($1, "as-memory.grow-value", []), 1);

// globals.wast:233
assert_return(() => call($1, "as-call-value", []), 6);

// globals.wast:235
assert_return(() => call($1, "as-return-value", []), 6);

// globals.wast:236
assert_return(() => call($1, "as-drop-operand", []));

// globals.wast:237
assert_return(() => call($1, "as-br-value", []), 6);

// globals.wast:239
assert_return(() => call($1, "as-local.set-value", [1]), 6);

// globals.wast:240
assert_return(() => call($1, "as-local.tee-value", [1]), 6);

// globals.wast:241
assert_return(() => call($1, "as-global.set-value", []), 6);

// globals.wast:243
assert_return(() => call($1, "as-unary-operand", []), 0);

// globals.wast:244
assert_return(() => call($1, "as-binary-operand", []), 36);

// globals.wast:245
assert_return(() => call($1, "as-compare-operand", []), 1);

// globals.wast:247
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x84\x80\x80\x80\x00\x01\x60\x00\x00\x03\x82\x80\x80\x80\x00\x01\x00\x06\x89\x80\x80\x80\x00\x01\x7d\x00\x43\x00\x00\x00\x00\x0b\x0a\x8c\x80\x80\x80\x00\x01\x86\x80\x80\x80\x00\x00\x41\x01\x24\x00\x0b");

// globals.wast:253
let $2 = instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x06\x89\x80\x80\x80\x00\x01\x7d\x01\x43\x00\x00\x00\x00\x0b\x07\x85\x80\x80\x80\x00\x01\x01\x61\x03\x00");

// globals.wast:254
let $3 = instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x06\x89\x80\x80\x80\x00\x01\x7d\x01\x43\x00\x00\x00\x00\x0b\x07\x85\x80\x80\x80\x00\x01\x01\x61\x03\x00");

// globals.wast:256
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x06\x8a\x80\x80\x80\x00\x01\x7d\x00\x43\x00\x00\x00\x00\x8c\x0b");

// globals.wast:261
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x06\x86\x80\x80\x80\x00\x01\x7d\x00\x20\x00\x0b");

// globals.wast:266
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x06\x8a\x80\x80\x80\x00\x01\x7d\x00\x43\x00\x00\x80\x3f\x8c\x0b");

// globals.wast:271
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x06\x87\x80\x80\x80\x00\x01\x7f\x00\x41\x00\x01\x0b");

// globals.wast:276
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x06\x85\x80\x80\x80\x00\x01\x7f\x00\x01\x0b");

// globals.wast:281
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x06\x89\x80\x80\x80\x00\x01\x7f\x00\x43\x00\x00\x00\x00\x0b");

// globals.wast:286
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x06\x88\x80\x80\x80\x00\x01\x7f\x00\x41\x00\x41\x00\x0b");

// globals.wast:291
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x06\x84\x80\x80\x80\x00\x01\x7f\x00\x0b");

// globals.wast:296
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x02\x86\x80\x80\x80\x00\x01\x00\x00\x03\x6f\x00\x06\x86\x80\x80\x80\x00\x01\x70\x00\x23\x00\x0b");

// globals.wast:301
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x06\x86\x80\x80\x80\x00\x01\x7f\x00\x23\x00\x0b");

// globals.wast:306
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x06\x8b\x80\x80\x80\x00\x02\x7f\x00\x23\x01\x0b\x7f\x00\x41\x00\x0b");

// globals.wast:311
let $4 = instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x02\x98\x80\x80\x80\x00\x01\x08\x73\x70\x65\x63\x74\x65\x73\x74\x0a\x67\x6c\x6f\x62\x61\x6c\x5f\x69\x33\x32\x03\x7f\x00");

// globals.wast:314
assert_malformed("\x00\x61\x73\x6d\x01\x00\x00\x00\x02\x94\x80\x80\x80\x00\x01\x08\x73\x70\x65\x63\x74\x65\x73\x74\x0a\x67\x6c\x6f\x62\x61\x6c\x5f\x69\x33\x32\x03\x7f\x02");

// globals.wast:327
assert_malformed("\x00\x61\x73\x6d\x01\x00\x00\x00\x02\x94\x80\x80\x80\x00\x01\x08\x73\x70\x65\x63\x74\x65\x73\x74\x0a\x67\x6c\x6f\x62\x61\x6c\x5f\x69\x33\x32\x03\x7f\xff");

// globals.wast:341
let $5 = instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x06\x86\x80\x80\x80\x00\x01\x7f\x00\x41\x00\x0b");

// globals.wast:344
assert_malformed("\x00\x61\x73\x6d\x01\x00\x00\x00\x06\x86\x80\x80\x80\x00\x01\x7f\x02\x41\x00\x0b");

// globals.wast:356
assert_malformed("\x00\x61\x73\x6d\x01\x00\x00\x00\x06\x86\x80\x80\x80\x00\x01\x7f\xff\x41\x00\x0b");

// globals.wast:370
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x84\x80\x80\x80\x00\x01\x60\x00\x00\x03\x82\x80\x80\x80\x00\x01\x00\x06\x86\x80\x80\x80\x00\x01\x7f\x01\x41\x00\x0b\x0a\x8a\x80\x80\x80\x00\x01\x84\x80\x80\x80\x00\x00\x24\x00\x0b");

// globals.wast:379
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x84\x80\x80\x80\x00\x01\x60\x00\x00\x03\x82\x80\x80\x80\x00\x01\x00\x06\x86\x80\x80\x80\x00\x01\x7f\x01\x41\x00\x0b\x0a\x8f\x80\x80\x80\x00\x01\x89\x80\x80\x80\x00\x00\x41\x00\x02\x40\x24\x00\x0b\x0b");

// globals.wast:389
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x84\x80\x80\x80\x00\x01\x60\x00\x00\x03\x82\x80\x80\x80\x00\x01\x00\x06\x86\x80\x80\x80\x00\x01\x7f\x01\x41\x00\x0b\x0a\x8f\x80\x80\x80\x00\x01\x89\x80\x80\x80\x00\x00\x41\x00\x03\x40\x24\x00\x0b\x0b");

// globals.wast:399
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x84\x80\x80\x80\x00\x01\x60\x00\x00\x03\x82\x80\x80\x80\x00\x01\x00\x06\x86\x80\x80\x80\x00\x01\x7f\x01\x41\x00\x0b\x0a\x91\x80\x80\x80\x00\x01\x8b\x80\x80\x80\x00\x00\x41\x00\x41\x00\x04\x40\x24\x00\x0b\x0b");

// globals.wast:409
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x84\x80\x80\x80\x00\x01\x60\x00\x00\x03\x82\x80\x80\x80\x00\x01\x00\x06\x86\x80\x80\x80\x00\x01\x7f\x01\x41\x00\x0b\x0a\x94\x80\x80\x80\x00\x01\x8e\x80\x80\x80\x00\x00\x41\x00\x41\x00\x04\x7f\x41\x00\x05\x24\x00\x0b\x0b");

// globals.wast:419
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x84\x80\x80\x80\x00\x01\x60\x00\x00\x03\x82\x80\x80\x80\x00\x01\x00\x06\x86\x80\x80\x80\x00\x01\x7f\x01\x41\x00\x0b\x0a\x91\x80\x80\x80\x00\x01\x8b\x80\x80\x80\x00\x00\x41\x00\x02\x40\x24\x00\x0c\x00\x0b\x0b");

// globals.wast:429
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x84\x80\x80\x80\x00\x01\x60\x00\x00\x03\x82\x80\x80\x80\x00\x01\x00\x06\x86\x80\x80\x80\x00\x01\x7f\x01\x41\x00\x0b\x0a\x91\x80\x80\x80\x00\x01\x8b\x80\x80\x80\x00\x00\x41\x00\x02\x40\x24\x00\x0d\x00\x0b\x0b");

// globals.wast:439
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x84\x80\x80\x80\x00\x01\x60\x00\x00\x03\x82\x80\x80\x80\x00\x01\x00\x06\x86\x80\x80\x80\x00\x01\x7f\x01\x41\x00\x0b\x0a\x92\x80\x80\x80\x00\x01\x8c\x80\x80\x80\x00\x00\x41\x00\x02\x40\x24\x00\x0e\x00\x00\x0b\x0b");

// globals.wast:449
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x84\x80\x80\x80\x00\x01\x60\x00\x00\x03\x82\x80\x80\x80\x00\x01\x00\x06\x86\x80\x80\x80\x00\x01\x7f\x01\x41\x00\x0b\x0a\x8b\x80\x80\x80\x00\x01\x85\x80\x80\x80\x00\x00\x24\x00\x0f\x0b");

// globals.wast:458
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x84\x80\x80\x80\x00\x01\x60\x00\x00\x03\x82\x80\x80\x80\x00\x01\x00\x06\x86\x80\x80\x80\x00\x01\x7f\x01\x41\x00\x0b\x0a\x8f\x80\x80\x80\x00\x01\x89\x80\x80\x80\x00\x00\x24\x00\x41\x01\x41\x02\x1b\x0b");

// globals.wast:467
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x89\x80\x80\x80\x00\x02\x60\x00\x00\x60\x01\x7f\x01\x7f\x03\x83\x80\x80\x80\x00\x02\x00\x01\x06\x86\x80\x80\x80\x00\x01\x7f\x01\x41\x00\x0b\x0a\x95\x80\x80\x80\x00\x02\x86\x80\x80\x80\x00\x00\x24\x00\x10\x01\x0b\x84\x80\x80\x80\x00\x00\x20\x00\x0b");

// globals.wast:477
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x89\x80\x80\x80\x00\x02\x60\x01\x7f\x01\x7f\x60\x00\x00\x03\x83\x80\x80\x80\x00\x02\x00\x01\x04\x85\x80\x80\x80\x00\x01\x70\x01\x01\x01\x06\x86\x80\x80\x80\x00\x01\x7f\x01\x41\x00\x0b\x09\x87\x80\x80\x80\x00\x01\x00\x41\x00\x0b\x01\x00\x0a\x9b\x80\x80\x80\x00\x02\x84\x80\x80\x80\x00\x00\x20\x00\x0b\x8c\x80\x80\x80\x00\x00\x02\x7f\x24\x00\x41\x00\x11\x00\x00\x0b\x0b");
