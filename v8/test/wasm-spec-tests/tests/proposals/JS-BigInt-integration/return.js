'use strict';

let spectest = {
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


// return.wast:3
let $1 = instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\xa1\x80\x80\x80\x00\x07\x60\x03\x7f\x7f\x7f\x01\x7f\x60\x00\x00\x60\x00\x01\x7f\x60\x00\x01\x7e\x60\x00\x01\x7d\x60\x00\x01\x7c\x60\x02\x7f\x7f\x01\x7f\x03\xbc\x80\x80\x80\x00\x3b\x01\x01\x01\x01\x01\x02\x03\x04\x05\x01\x05\x02\x02\x01\x02\x01\x01\x01\x02\x02\x02\x02\x02\x01\x02\x02\x03\x02\x02\x03\x02\x06\x06\x06\x06\x02\x00\x02\x02\x02\x02\x02\x02\x02\x02\x04\x03\x02\x02\x02\x02\x04\x02\x03\x02\x02\x02\x02\x02\x04\x85\x80\x80\x80\x00\x01\x70\x01\x01\x01\x05\x83\x80\x80\x80\x00\x01\x00\x01\x07\xcd\x87\x80\x80\x00\x39\x08\x74\x79\x70\x65\x2d\x69\x33\x32\x00\x01\x08\x74\x79\x70\x65\x2d\x69\x36\x34\x00\x02\x08\x74\x79\x70\x65\x2d\x66\x33\x32\x00\x03\x08\x74\x79\x70\x65\x2d\x66\x36\x34\x00\x04\x0e\x74\x79\x70\x65\x2d\x69\x33\x32\x2d\x76\x61\x6c\x75\x65\x00\x05\x0e\x74\x79\x70\x65\x2d\x69\x36\x34\x2d\x76\x61\x6c\x75\x65\x00\x06\x0e\x74\x79\x70\x65\x2d\x66\x33\x32\x2d\x76\x61\x6c\x75\x65\x00\x07\x0e\x74\x79\x70\x65\x2d\x66\x36\x34\x2d\x76\x61\x6c\x75\x65\x00\x08\x07\x6e\x75\x6c\x6c\x61\x72\x79\x00\x09\x05\x75\x6e\x61\x72\x79\x00\x0a\x0d\x61\x73\x2d\x66\x75\x6e\x63\x2d\x66\x69\x72\x73\x74\x00\x0b\x0b\x61\x73\x2d\x66\x75\x6e\x63\x2d\x6d\x69\x64\x00\x0c\x0c\x61\x73\x2d\x66\x75\x6e\x63\x2d\x6c\x61\x73\x74\x00\x0d\x0d\x61\x73\x2d\x66\x75\x6e\x63\x2d\x76\x61\x6c\x75\x65\x00\x0e\x0e\x61\x73\x2d\x62\x6c\x6f\x63\x6b\x2d\x66\x69\x72\x73\x74\x00\x0f\x0c\x61\x73\x2d\x62\x6c\x6f\x63\x6b\x2d\x6d\x69\x64\x00\x10\x0d\x61\x73\x2d\x62\x6c\x6f\x63\x6b\x2d\x6c\x61\x73\x74\x00\x11\x0e\x61\x73\x2d\x62\x6c\x6f\x63\x6b\x2d\x76\x61\x6c\x75\x65\x00\x12\x0d\x61\x73\x2d\x6c\x6f\x6f\x70\x2d\x66\x69\x72\x73\x74\x00\x13\x0b\x61\x73\x2d\x6c\x6f\x6f\x70\x2d\x6d\x69\x64\x00\x14\x0c\x61\x73\x2d\x6c\x6f\x6f\x70\x2d\x6c\x61\x73\x74\x00\x15\x0b\x61\x73\x2d\x62\x72\x2d\x76\x61\x6c\x75\x65\x00\x16\x0d\x61\x73\x2d\x62\x72\x5f\x69\x66\x2d\x63\x6f\x6e\x64\x00\x17\x0e\x61\x73\x2d\x62\x72\x5f\x69\x66\x2d\x76\x61\x6c\x75\x65\x00\x18\x13\x61\x73\x2d\x62\x72\x5f\x69\x66\x2d\x76\x61\x6c\x75\x65\x2d\x63\x6f\x6e\x64\x00\x19\x11\x61\x73\x2d\x62\x72\x5f\x74\x61\x62\x6c\x65\x2d\x69\x6e\x64\x65\x78\x00\x1a\x11\x61\x73\x2d\x62\x72\x5f\x74\x61\x62\x6c\x65\x2d\x76\x61\x6c\x75\x65\x00\x1b\x17\x61\x73\x2d\x62\x72\x5f\x74\x61\x62\x6c\x65\x2d\x76\x61\x6c\x75\x65\x2d\x69\x6e\x64\x65\x78\x00\x1c\x0f\x61\x73\x2d\x72\x65\x74\x75\x72\x6e\x2d\x76\x61\x6c\x75\x65\x00\x1d\x0a\x61\x73\x2d\x69\x66\x2d\x63\x6f\x6e\x64\x00\x1e\x0a\x61\x73\x2d\x69\x66\x2d\x74\x68\x65\x6e\x00\x1f\x0a\x61\x73\x2d\x69\x66\x2d\x65\x6c\x73\x65\x00\x20\x0f\x61\x73\x2d\x73\x65\x6c\x65\x63\x74\x2d\x66\x69\x72\x73\x74\x00\x21\x10\x61\x73\x2d\x73\x65\x6c\x65\x63\x74\x2d\x73\x65\x63\x6f\x6e\x64\x00\x22\x0e\x61\x73\x2d\x73\x65\x6c\x65\x63\x74\x2d\x63\x6f\x6e\x64\x00\x23\x0d\x61\x73\x2d\x63\x61\x6c\x6c\x2d\x66\x69\x72\x73\x74\x00\x25\x0b\x61\x73\x2d\x63\x61\x6c\x6c\x2d\x6d\x69\x64\x00\x26\x0c\x61\x73\x2d\x63\x61\x6c\x6c\x2d\x6c\x61\x73\x74\x00\x27\x15\x61\x73\x2d\x63\x61\x6c\x6c\x5f\x69\x6e\x64\x69\x72\x65\x63\x74\x2d\x66\x75\x6e\x63\x00\x28\x16\x61\x73\x2d\x63\x61\x6c\x6c\x5f\x69\x6e\x64\x69\x72\x65\x63\x74\x2d\x66\x69\x72\x73\x74\x00\x29\x14\x61\x73\x2d\x63\x61\x6c\x6c\x5f\x69\x6e\x64\x69\x72\x65\x63\x74\x2d\x6d\x69\x64\x00\x2a\x15\x61\x73\x2d\x63\x61\x6c\x6c\x5f\x69\x6e\x64\x69\x72\x65\x63\x74\x2d\x6c\x61\x73\x74\x00\x2b\x12\x61\x73\x2d\x73\x65\x74\x5f\x6c\x6f\x63\x61\x6c\x2d\x76\x61\x6c\x75\x65\x00\x2c\x0f\x61\x73\x2d\x6c\x6f\x61\x64\x2d\x61\x64\x64\x72\x65\x73\x73\x00\x2d\x10\x61\x73\x2d\x6c\x6f\x61\x64\x4e\x2d\x61\x64\x64\x72\x65\x73\x73\x00\x2e\x10\x61\x73\x2d\x73\x74\x6f\x72\x65\x2d\x61\x64\x64\x72\x65\x73\x73\x00\x2f\x0e\x61\x73\x2d\x73\x74\x6f\x72\x65\x2d\x76\x61\x6c\x75\x65\x00\x30\x11\x61\x73\x2d\x73\x74\x6f\x72\x65\x4e\x2d\x61\x64\x64\x72\x65\x73\x73\x00\x31\x0f\x61\x73\x2d\x73\x74\x6f\x72\x65\x4e\x2d\x76\x61\x6c\x75\x65\x00\x32\x10\x61\x73\x2d\x75\x6e\x61\x72\x79\x2d\x6f\x70\x65\x72\x61\x6e\x64\x00\x33\x0e\x61\x73\x2d\x62\x69\x6e\x61\x72\x79\x2d\x6c\x65\x66\x74\x00\x34\x0f\x61\x73\x2d\x62\x69\x6e\x61\x72\x79\x2d\x72\x69\x67\x68\x74\x00\x35\x0f\x61\x73\x2d\x74\x65\x73\x74\x2d\x6f\x70\x65\x72\x61\x6e\x64\x00\x36\x0f\x61\x73\x2d\x63\x6f\x6d\x70\x61\x72\x65\x2d\x6c\x65\x66\x74\x00\x37\x10\x61\x73\x2d\x63\x6f\x6d\x70\x61\x72\x65\x2d\x72\x69\x67\x68\x74\x00\x38\x12\x61\x73\x2d\x63\x6f\x6e\x76\x65\x72\x74\x2d\x6f\x70\x65\x72\x61\x6e\x64\x00\x39\x13\x61\x73\x2d\x6d\x65\x6d\x6f\x72\x79\x2e\x67\x72\x6f\x77\x2d\x73\x69\x7a\x65\x00\x3a\x09\x87\x80\x80\x80\x00\x01\x00\x41\x00\x0b\x01\x24\x0a\x83\x87\x80\x80\x00\x3b\x82\x80\x80\x80\x00\x00\x0b\x85\x80\x80\x80\x00\x00\x0f\x68\x1a\x0b\x85\x80\x80\x80\x00\x00\x0f\x7a\x1a\x0b\x85\x80\x80\x80\x00\x00\x0f\x8c\x1a\x0b\x85\x80\x80\x80\x00\x00\x0f\x9a\x1a\x0b\x89\x80\x80\x80\x00\x00\x02\x7f\x41\x01\x0f\x68\x0b\x0b\x89\x80\x80\x80\x00\x00\x02\x7e\x42\x02\x0f\x7a\x0b\x0b\x8c\x80\x80\x80\x00\x00\x02\x7d\x43\x00\x00\x40\x40\x0f\x8c\x0b\x0b\x90\x80\x80\x80\x00\x00\x02\x7c\x44\x00\x00\x00\x00\x00\x00\x10\x40\x0f\x9a\x0b\x0b\x83\x80\x80\x80\x00\x00\x0f\x0b\x8c\x80\x80\x80\x00\x00\x44\x00\x00\x00\x00\x00\x00\x08\x40\x0f\x0b\x87\x80\x80\x80\x00\x00\x41\x01\x0f\x41\x02\x0b\x89\x80\x80\x80\x00\x00\x10\x00\x41\x02\x0f\x41\x03\x0b\x86\x80\x80\x80\x00\x00\x01\x10\x00\x0f\x0b\x88\x80\x80\x80\x00\x00\x01\x10\x00\x41\x03\x0f\x0b\x88\x80\x80\x80\x00\x00\x02\x40\x0f\x10\x00\x0b\x0b\x8a\x80\x80\x80\x00\x00\x02\x40\x10\x00\x0f\x10\x00\x0b\x0b\x89\x80\x80\x80\x00\x00\x02\x40\x01\x10\x00\x0f\x0b\x0b\x8b\x80\x80\x80\x00\x00\x02\x7f\x01\x10\x00\x41\x02\x0f\x0b\x0b\x8a\x80\x80\x80\x00\x00\x03\x7f\x41\x03\x0f\x41\x02\x0b\x0b\x8c\x80\x80\x80\x00\x00\x03\x7f\x10\x00\x41\x04\x0f\x41\x02\x0b\x0b\x8b\x80\x80\x80\x00\x00\x03\x7f\x01\x10\x00\x41\x05\x0f\x0b\x0b\x8a\x80\x80\x80\x00\x00\x02\x7f\x41\x09\x0f\x0c\x00\x0b\x0b\x88\x80\x80\x80\x00\x00\x02\x40\x0f\x0d\x00\x0b\x0b\x8f\x80\x80\x80\x00\x00\x02\x7f\x41\x08\x0f\x41\x01\x0d\x00\x1a\x41\x07\x0b\x0b\x8f\x80\x80\x80\x00\x00\x02\x7f\x41\x06\x41\x09\x0f\x0d\x00\x1a\x41\x07\x0b\x0b\x8f\x80\x80\x80\x00\x00\x02\x40\x42\x09\x0f\x0e\x02\x00\x00\x00\x0b\x42\x7f\x0b\x91\x80\x80\x80\x00\x00\x02\x7f\x41\x0a\x0f\x41\x01\x0e\x02\x00\x00\x00\x41\x07\x0b\x0b\x90\x80\x80\x80\x00\x00\x02\x7f\x41\x06\x41\x0b\x0f\x0e\x01\x00\x00\x41\x07\x0b\x0b\x86\x80\x80\x80\x00\x00\x42\x07\x0f\x0f\x0b\x8d\x80\x80\x80\x00\x00\x41\x02\x0f\x04\x7f\x41\x00\x05\x41\x01\x0b\x0b\x8d\x80\x80\x80\x00\x00\x20\x00\x04\x7f\x41\x03\x0f\x05\x20\x01\x0b\x0b\x8d\x80\x80\x80\x00\x00\x20\x00\x04\x7f\x20\x01\x05\x41\x04\x0f\x0b\x0b\x8a\x80\x80\x80\x00\x00\x41\x05\x0f\x20\x00\x20\x01\x1b\x0b\x8a\x80\x80\x80\x00\x00\x20\x00\x41\x06\x0f\x20\x01\x1b\x0b\x8a\x80\x80\x80\x00\x00\x41\x00\x41\x01\x41\x07\x0f\x1b\x0b\x84\x80\x80\x80\x00\x00\x41\x7f\x0b\x8b\x80\x80\x80\x00\x00\x41\x0c\x0f\x41\x02\x41\x03\x10\x24\x0b\x8b\x80\x80\x80\x00\x00\x41\x01\x41\x0d\x0f\x41\x03\x10\x24\x0b\x8b\x80\x80\x80\x00\x00\x41\x01\x41\x02\x41\x0e\x0f\x10\x24\x0b\x8e\x80\x80\x80\x00\x00\x41\x14\x0f\x41\x01\x41\x02\x41\x03\x11\x00\x00\x0b\x8e\x80\x80\x80\x00\x00\x41\x00\x41\x15\x0f\x41\x02\x41\x03\x11\x00\x00\x0b\x8e\x80\x80\x80\x00\x00\x41\x00\x41\x01\x41\x16\x0f\x41\x03\x11\x00\x00\x0b\x8e\x80\x80\x80\x00\x00\x41\x00\x41\x01\x41\x02\x41\x17\x0f\x11\x00\x00\x0b\x8b\x80\x80\x80\x00\x01\x01\x7d\x41\x11\x0f\x21\x00\x41\x7f\x0b\x8b\x80\x80\x80\x00\x00\x43\x9a\x99\xd9\x3f\x0f\x2a\x02\x00\x0b\x88\x80\x80\x80\x00\x00\x42\x1e\x0f\x30\x00\x00\x0b\x93\x80\x80\x80\x00\x00\x41\x1e\x0f\x44\x00\x00\x00\x00\x00\x00\x1c\x40\x39\x03\x00\x41\x7f\x0b\x8c\x80\x80\x80\x00\x00\x41\x02\x41\x1f\x0f\x37\x03\x00\x41\x7f\x0b\x8c\x80\x80\x80\x00\x00\x41\x20\x0f\x41\x07\x3a\x00\x00\x41\x7f\x0b\x8c\x80\x80\x80\x00\x00\x41\x02\x41\x21\x0f\x3d\x01\x00\x41\x7f\x0b\x89\x80\x80\x80\x00\x00\x43\x9a\x99\x59\x40\x0f\x8c\x0b\x88\x80\x80\x80\x00\x00\x41\x03\x0f\x41\x0a\x6a\x0b\x88\x80\x80\x80\x00\x00\x42\x0a\x42\x2d\x0f\x7d\x0b\x86\x80\x80\x80\x00\x00\x41\x2c\x0f\x45\x0b\x8f\x80\x80\x80\x00\x00\x41\x2b\x0f\x44\x00\x00\x00\x00\x00\x00\x24\x40\x65\x0b\x8b\x80\x80\x80\x00\x00\x43\x00\x00\x20\x41\x41\x2a\x0f\x5c\x0b\x86\x80\x80\x80\x00\x00\x41\x29\x0f\xa7\x0b\x87\x80\x80\x80\x00\x00\x41\x28\x0f\x40\x00\x0b");

// return.wast:217
assert_return(() => call($1, "type-i32", []));

// return.wast:218
assert_return(() => call($1, "type-i64", []));

// return.wast:219
assert_return(() => call($1, "type-f32", []));

// return.wast:220
assert_return(() => call($1, "type-f64", []));

// return.wast:222
assert_return(() => call($1, "type-i32-value", []), 1);

// return.wast:223
run(() => call(instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x88\x80\x80\x80\x00\x02\x60\x00\x00\x60\x00\x01\x7e\x02\x95\x80\x80\x80\x00\x01\x02\x24\x31\x0e\x74\x79\x70\x65\x2d\x69\x36\x34\x2d\x76\x61\x6c\x75\x65\x00\x01\x03\x82\x80\x80\x80\x00\x01\x00\x07\x87\x80\x80\x80\x00\x01\x03\x72\x75\x6e\x00\x01\x0a\x97\x80\x80\x80\x00\x01\x91\x80\x80\x80\x00\x00\x02\x40\x10\x00\x01\x42\x02\x01\x51\x45\x0d\x00\x0f\x0b\x00\x0b", exports("$1", $1)),  "run", []));  // assert_return(() => call($1, "type-i64-value", []), int64("2"))

// return.wast:224
run(() => call(instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x88\x80\x80\x80\x00\x02\x60\x00\x00\x60\x00\x01\x7d\x02\x95\x80\x80\x80\x00\x01\x02\x24\x31\x0e\x74\x79\x70\x65\x2d\x66\x33\x32\x2d\x76\x61\x6c\x75\x65\x00\x01\x03\x82\x80\x80\x80\x00\x01\x00\x07\x87\x80\x80\x80\x00\x01\x03\x72\x75\x6e\x00\x01\x0a\x9a\x80\x80\x80\x00\x01\x94\x80\x80\x80\x00\x00\x02\x40\x10\x00\xbc\x43\x00\x00\x40\x40\xbc\x46\x45\x0d\x00\x0f\x0b\x00\x0b", exports("$1", $1)),  "run", []));  // assert_return(() => call($1, "type-f32-value", []), 3.)

// return.wast:225
run(() => call(instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x88\x80\x80\x80\x00\x02\x60\x00\x00\x60\x00\x01\x7c\x02\x95\x80\x80\x80\x00\x01\x02\x24\x31\x0e\x74\x79\x70\x65\x2d\x66\x36\x34\x2d\x76\x61\x6c\x75\x65\x00\x01\x03\x82\x80\x80\x80\x00\x01\x00\x07\x87\x80\x80\x80\x00\x01\x03\x72\x75\x6e\x00\x01\x0a\x9e\x80\x80\x80\x00\x01\x98\x80\x80\x80\x00\x00\x02\x40\x10\x00\xbd\x44\x00\x00\x00\x00\x00\x00\x10\x40\xbd\x51\x45\x0d\x00\x0f\x0b\x00\x0b", exports("$1", $1)),  "run", []));  // assert_return(() => call($1, "type-f64-value", []), 4.)

// return.wast:227
assert_return(() => call($1, "nullary", []));

// return.wast:228
run(() => call(instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x88\x80\x80\x80\x00\x02\x60\x00\x00\x60\x00\x01\x7c\x02\x8c\x80\x80\x80\x00\x01\x02\x24\x31\x05\x75\x6e\x61\x72\x79\x00\x01\x03\x82\x80\x80\x80\x00\x01\x00\x07\x87\x80\x80\x80\x00\x01\x03\x72\x75\x6e\x00\x01\x0a\x9e\x80\x80\x80\x00\x01\x98\x80\x80\x80\x00\x00\x02\x40\x10\x00\xbd\x44\x00\x00\x00\x00\x00\x00\x08\x40\xbd\x51\x45\x0d\x00\x0f\x0b\x00\x0b", exports("$1", $1)),  "run", []));  // assert_return(() => call($1, "unary", []), 3.)

// return.wast:230
assert_return(() => call($1, "as-func-first", []), 1);

// return.wast:231
assert_return(() => call($1, "as-func-mid", []), 2);

// return.wast:232
assert_return(() => call($1, "as-func-last", []));

// return.wast:233
assert_return(() => call($1, "as-func-value", []), 3);

// return.wast:235
assert_return(() => call($1, "as-block-first", []));

// return.wast:236
assert_return(() => call($1, "as-block-mid", []));

// return.wast:237
assert_return(() => call($1, "as-block-last", []));

// return.wast:238
assert_return(() => call($1, "as-block-value", []), 2);

// return.wast:240
assert_return(() => call($1, "as-loop-first", []), 3);

// return.wast:241
assert_return(() => call($1, "as-loop-mid", []), 4);

// return.wast:242
assert_return(() => call($1, "as-loop-last", []), 5);

// return.wast:244
assert_return(() => call($1, "as-br-value", []), 9);

// return.wast:246
assert_return(() => call($1, "as-br_if-cond", []));

// return.wast:247
assert_return(() => call($1, "as-br_if-value", []), 8);

// return.wast:248
assert_return(() => call($1, "as-br_if-value-cond", []), 9);

// return.wast:250
run(() => call(instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x88\x80\x80\x80\x00\x02\x60\x00\x00\x60\x00\x01\x7e\x02\x98\x80\x80\x80\x00\x01\x02\x24\x31\x11\x61\x73\x2d\x62\x72\x5f\x74\x61\x62\x6c\x65\x2d\x69\x6e\x64\x65\x78\x00\x01\x03\x82\x80\x80\x80\x00\x01\x00\x07\x87\x80\x80\x80\x00\x01\x03\x72\x75\x6e\x00\x01\x0a\x97\x80\x80\x80\x00\x01\x91\x80\x80\x80\x00\x00\x02\x40\x10\x00\x01\x42\x09\x01\x51\x45\x0d\x00\x0f\x0b\x00\x0b", exports("$1", $1)),  "run", []));  // assert_return(() => call($1, "as-br_table-index", []), int64("9"))

// return.wast:251
assert_return(() => call($1, "as-br_table-value", []), 10);

// return.wast:252
assert_return(() => call($1, "as-br_table-value-index", []), 11);

// return.wast:254
run(() => call(instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x88\x80\x80\x80\x00\x02\x60\x00\x00\x60\x00\x01\x7e\x02\x96\x80\x80\x80\x00\x01\x02\x24\x31\x0f\x61\x73\x2d\x72\x65\x74\x75\x72\x6e\x2d\x76\x61\x6c\x75\x65\x00\x01\x03\x82\x80\x80\x80\x00\x01\x00\x07\x87\x80\x80\x80\x00\x01\x03\x72\x75\x6e\x00\x01\x0a\x97\x80\x80\x80\x00\x01\x91\x80\x80\x80\x00\x00\x02\x40\x10\x00\x01\x42\x07\x01\x51\x45\x0d\x00\x0f\x0b\x00\x0b", exports("$1", $1)),  "run", []));  // assert_return(() => call($1, "as-return-value", []), int64("7"))

// return.wast:256
assert_return(() => call($1, "as-if-cond", []), 2);

// return.wast:257
assert_return(() => call($1, "as-if-then", [1, 6]), 3);

// return.wast:258
assert_return(() => call($1, "as-if-then", [0, 6]), 6);

// return.wast:259
assert_return(() => call($1, "as-if-else", [0, 6]), 4);

// return.wast:260
assert_return(() => call($1, "as-if-else", [1, 6]), 6);

// return.wast:262
assert_return(() => call($1, "as-select-first", [0, 6]), 5);

// return.wast:263
assert_return(() => call($1, "as-select-first", [1, 6]), 5);

// return.wast:264
assert_return(() => call($1, "as-select-second", [0, 6]), 6);

// return.wast:265
assert_return(() => call($1, "as-select-second", [1, 6]), 6);

// return.wast:266
assert_return(() => call($1, "as-select-cond", []), 7);

// return.wast:268
assert_return(() => call($1, "as-call-first", []), 12);

// return.wast:269
assert_return(() => call($1, "as-call-mid", []), 13);

// return.wast:270
assert_return(() => call($1, "as-call-last", []), 14);

// return.wast:272
assert_return(() => call($1, "as-call_indirect-func", []), 20);

// return.wast:273
assert_return(() => call($1, "as-call_indirect-first", []), 21);

// return.wast:274
assert_return(() => call($1, "as-call_indirect-mid", []), 22);

// return.wast:275
assert_return(() => call($1, "as-call_indirect-last", []), 23);

// return.wast:277
assert_return(() => call($1, "as-set_local-value", []), 17);

// return.wast:279
run(() => call(instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x88\x80\x80\x80\x00\x02\x60\x00\x00\x60\x00\x01\x7d\x02\x96\x80\x80\x80\x00\x01\x02\x24\x31\x0f\x61\x73\x2d\x6c\x6f\x61\x64\x2d\x61\x64\x64\x72\x65\x73\x73\x00\x01\x03\x82\x80\x80\x80\x00\x01\x00\x07\x87\x80\x80\x80\x00\x01\x03\x72\x75\x6e\x00\x01\x0a\x9a\x80\x80\x80\x00\x01\x94\x80\x80\x80\x00\x00\x02\x40\x10\x00\xbc\x43\x9a\x99\xd9\x3f\xbc\x46\x45\x0d\x00\x0f\x0b\x00\x0b", exports("$1", $1)),  "run", []));  // assert_return(() => call($1, "as-load-address", []), 1.70000004768)

// return.wast:280
run(() => call(instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x88\x80\x80\x80\x00\x02\x60\x00\x00\x60\x00\x01\x7e\x02\x97\x80\x80\x80\x00\x01\x02\x24\x31\x10\x61\x73\x2d\x6c\x6f\x61\x64\x4e\x2d\x61\x64\x64\x72\x65\x73\x73\x00\x01\x03\x82\x80\x80\x80\x00\x01\x00\x07\x87\x80\x80\x80\x00\x01\x03\x72\x75\x6e\x00\x01\x0a\x97\x80\x80\x80\x00\x01\x91\x80\x80\x80\x00\x00\x02\x40\x10\x00\x01\x42\x1e\x01\x51\x45\x0d\x00\x0f\x0b\x00\x0b", exports("$1", $1)),  "run", []));  // assert_return(() => call($1, "as-loadN-address", []), int64("30"))

// return.wast:282
assert_return(() => call($1, "as-store-address", []), 30);

// return.wast:283
assert_return(() => call($1, "as-store-value", []), 31);

// return.wast:284
assert_return(() => call($1, "as-storeN-address", []), 32);

// return.wast:285
assert_return(() => call($1, "as-storeN-value", []), 33);

// return.wast:287
run(() => call(instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x88\x80\x80\x80\x00\x02\x60\x00\x00\x60\x00\x01\x7d\x02\x97\x80\x80\x80\x00\x01\x02\x24\x31\x10\x61\x73\x2d\x75\x6e\x61\x72\x79\x2d\x6f\x70\x65\x72\x61\x6e\x64\x00\x01\x03\x82\x80\x80\x80\x00\x01\x00\x07\x87\x80\x80\x80\x00\x01\x03\x72\x75\x6e\x00\x01\x0a\x9a\x80\x80\x80\x00\x01\x94\x80\x80\x80\x00\x00\x02\x40\x10\x00\xbc\x43\x9a\x99\x59\x40\xbc\x46\x45\x0d\x00\x0f\x0b\x00\x0b", exports("$1", $1)),  "run", []));  // assert_return(() => call($1, "as-unary-operand", []), 3.40000009537)

// return.wast:289
assert_return(() => call($1, "as-binary-left", []), 3);

// return.wast:290
run(() => call(instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x88\x80\x80\x80\x00\x02\x60\x00\x00\x60\x00\x01\x7e\x02\x96\x80\x80\x80\x00\x01\x02\x24\x31\x0f\x61\x73\x2d\x62\x69\x6e\x61\x72\x79\x2d\x72\x69\x67\x68\x74\x00\x01\x03\x82\x80\x80\x80\x00\x01\x00\x07\x87\x80\x80\x80\x00\x01\x03\x72\x75\x6e\x00\x01\x0a\x97\x80\x80\x80\x00\x01\x91\x80\x80\x80\x00\x00\x02\x40\x10\x00\x01\x42\x2d\x01\x51\x45\x0d\x00\x0f\x0b\x00\x0b", exports("$1", $1)),  "run", []));  // assert_return(() => call($1, "as-binary-right", []), int64("45"))

// return.wast:292
assert_return(() => call($1, "as-test-operand", []), 44);

// return.wast:294
assert_return(() => call($1, "as-compare-left", []), 43);

// return.wast:295
assert_return(() => call($1, "as-compare-right", []), 42);

// return.wast:297
assert_return(() => call($1, "as-convert-operand", []), 41);

// return.wast:299
assert_return(() => call($1, "as-memory.grow-size", []), 40);

// return.wast:301
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x85\x80\x80\x80\x00\x01\x60\x00\x01\x7c\x03\x82\x80\x80\x80\x00\x01\x00\x0a\x89\x80\x80\x80\x00\x01\x83\x80\x80\x80\x00\x00\x0f\x0b");

// return.wast:305
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x85\x80\x80\x80\x00\x01\x60\x00\x01\x7c\x03\x82\x80\x80\x80\x00\x01\x00\x0a\x8a\x80\x80\x80\x00\x01\x84\x80\x80\x80\x00\x00\x01\x0f\x0b");

// return.wast:309
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x85\x80\x80\x80\x00\x01\x60\x00\x01\x7c\x03\x82\x80\x80\x80\x00\x01\x00\x0a\x8b\x80\x80\x80\x00\x01\x85\x80\x80\x80\x00\x00\x42\x01\x0f\x0b");
