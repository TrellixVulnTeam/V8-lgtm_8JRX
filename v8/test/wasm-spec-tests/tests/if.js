
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

// if.wast:3
let $1 = instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x97\x80\x80\x80\x00\x05\x60\x02\x7f\x7f\x01\x7f\x60\x00\x00\x60\x01\x7f\x00\x60\x01\x7f\x01\x7f\x60\x00\x01\x7f\x03\xa8\x80\x80\x80\x00\x27\x01\x02\x03\x03\x00\x03\x03\x03\x03\x03\x03\x03\x03\x03\x03\x03\x00\x03\x03\x03\x02\x02\x03\x03\x03\x03\x02\x03\x03\x03\x03\x03\x03\x00\x03\x00\x04\x03\x03\x04\x85\x80\x80\x80\x00\x01\x70\x01\x01\x01\x05\x83\x80\x80\x80\x00\x01\x00\x01\x06\x86\x80\x80\x80\x00\x01\x7f\x01\x41\x0a\x0b\x07\xe6\x84\x80\x80\x00\x24\x05\x65\x6d\x70\x74\x79\x00\x01\x08\x73\x69\x6e\x67\x75\x6c\x61\x72\x00\x02\x05\x6d\x75\x6c\x74\x69\x00\x03\x06\x6e\x65\x73\x74\x65\x64\x00\x04\x0f\x61\x73\x2d\x73\x65\x6c\x65\x63\x74\x2d\x66\x69\x72\x73\x74\x00\x05\x0d\x61\x73\x2d\x73\x65\x6c\x65\x63\x74\x2d\x6d\x69\x64\x00\x06\x0e\x61\x73\x2d\x73\x65\x6c\x65\x63\x74\x2d\x6c\x61\x73\x74\x00\x07\x0d\x61\x73\x2d\x6c\x6f\x6f\x70\x2d\x66\x69\x72\x73\x74\x00\x08\x0b\x61\x73\x2d\x6c\x6f\x6f\x70\x2d\x6d\x69\x64\x00\x09\x0c\x61\x73\x2d\x6c\x6f\x6f\x70\x2d\x6c\x61\x73\x74\x00\x0a\x0f\x61\x73\x2d\x69\x66\x2d\x63\x6f\x6e\x64\x69\x74\x69\x6f\x6e\x00\x0b\x0e\x61\x73\x2d\x62\x72\x5f\x69\x66\x2d\x66\x69\x72\x73\x74\x00\x0c\x0d\x61\x73\x2d\x62\x72\x5f\x69\x66\x2d\x6c\x61\x73\x74\x00\x0d\x11\x61\x73\x2d\x62\x72\x5f\x74\x61\x62\x6c\x65\x2d\x66\x69\x72\x73\x74\x00\x0e\x10\x61\x73\x2d\x62\x72\x5f\x74\x61\x62\x6c\x65\x2d\x6c\x61\x73\x74\x00\x0f\x16\x61\x73\x2d\x63\x61\x6c\x6c\x5f\x69\x6e\x64\x69\x72\x65\x63\x74\x2d\x66\x69\x72\x73\x74\x00\x11\x14\x61\x73\x2d\x63\x61\x6c\x6c\x5f\x69\x6e\x64\x69\x72\x65\x63\x74\x2d\x6d\x69\x64\x00\x12\x15\x61\x73\x2d\x63\x61\x6c\x6c\x5f\x69\x6e\x64\x69\x72\x65\x63\x74\x2d\x6c\x61\x73\x74\x00\x13\x0e\x61\x73\x2d\x73\x74\x6f\x72\x65\x2d\x66\x69\x72\x73\x74\x00\x14\x0d\x61\x73\x2d\x73\x74\x6f\x72\x65\x2d\x6c\x61\x73\x74\x00\x15\x14\x61\x73\x2d\x6d\x65\x6d\x6f\x72\x79\x2e\x67\x72\x6f\x77\x2d\x76\x61\x6c\x75\x65\x00\x16\x0d\x61\x73\x2d\x63\x61\x6c\x6c\x2d\x76\x61\x6c\x75\x65\x00\x18\x0f\x61\x73\x2d\x72\x65\x74\x75\x72\x6e\x2d\x76\x61\x6c\x75\x65\x00\x19\x0f\x61\x73\x2d\x64\x72\x6f\x70\x2d\x6f\x70\x65\x72\x61\x6e\x64\x00\x1a\x0b\x61\x73\x2d\x62\x72\x2d\x76\x61\x6c\x75\x65\x00\x1b\x12\x61\x73\x2d\x6c\x6f\x63\x61\x6c\x2e\x73\x65\x74\x2d\x76\x61\x6c\x75\x65\x00\x1c\x12\x61\x73\x2d\x6c\x6f\x63\x61\x6c\x2e\x74\x65\x65\x2d\x76\x61\x6c\x75\x65\x00\x1d\x13\x61\x73\x2d\x67\x6c\x6f\x62\x61\x6c\x2e\x73\x65\x74\x2d\x76\x61\x6c\x75\x65\x00\x1e\x0f\x61\x73\x2d\x6c\x6f\x61\x64\x2d\x6f\x70\x65\x72\x61\x6e\x64\x00\x1f\x10\x61\x73\x2d\x75\x6e\x61\x72\x79\x2d\x6f\x70\x65\x72\x61\x6e\x64\x00\x20\x11\x61\x73\x2d\x62\x69\x6e\x61\x72\x79\x2d\x6f\x70\x65\x72\x61\x6e\x64\x00\x21\x0f\x61\x73\x2d\x74\x65\x73\x74\x2d\x6f\x70\x65\x72\x61\x6e\x64\x00\x22\x12\x61\x73\x2d\x63\x6f\x6d\x70\x61\x72\x65\x2d\x6f\x70\x65\x72\x61\x6e\x64\x00\x23\x0a\x62\x72\x65\x61\x6b\x2d\x62\x61\x72\x65\x00\x24\x0b\x62\x72\x65\x61\x6b\x2d\x76\x61\x6c\x75\x65\x00\x25\x07\x65\x66\x66\x65\x63\x74\x73\x00\x26\x09\x87\x80\x80\x80\x00\x01\x00\x41\x00\x0b\x01\x10\x0a\xb3\x89\x80\x80\x00\x27\x82\x80\x80\x80\x00\x00\x0b\x96\x80\x80\x80\x00\x00\x20\x00\x04\x40\x0b\x20\x00\x04\x40\x0b\x20\x00\x04\x40\x0b\x20\x00\x04\x40\x0b\x0b\x9a\x80\x80\x80\x00\x00\x20\x00\x04\x40\x01\x0b\x20\x00\x04\x40\x01\x05\x01\x0b\x20\x00\x04\x7f\x41\x07\x05\x41\x08\x0b\x0b\xab\x80\x80\x80\x00\x00\x20\x00\x04\x40\x10\x00\x10\x00\x10\x00\x0b\x20\x00\x04\x40\x05\x10\x00\x10\x00\x10\x00\x0b\x20\x00\x04\x7f\x10\x00\x10\x00\x41\x08\x05\x10\x00\x10\x00\x41\x09\x0b\x0b\xd2\x80\x80\x80\x00\x00\x20\x00\x04\x7f\x20\x01\x04\x40\x10\x00\x02\x40\x0b\x01\x0b\x20\x01\x04\x40\x05\x10\x00\x02\x40\x0b\x01\x0b\x20\x01\x04\x7f\x10\x00\x41\x09\x05\x10\x00\x41\x0a\x0b\x05\x20\x01\x04\x40\x10\x00\x02\x40\x0b\x01\x0b\x20\x01\x04\x40\x05\x10\x00\x02\x40\x0b\x01\x0b\x20\x01\x04\x7f\x10\x00\x41\x0a\x05\x10\x00\x41\x0b\x0b\x0b\x0b\x95\x80\x80\x80\x00\x00\x20\x00\x04\x7f\x10\x00\x41\x01\x05\x10\x00\x41\x00\x0b\x41\x02\x41\x03\x1b\x0b\x95\x80\x80\x80\x00\x00\x41\x02\x20\x00\x04\x7f\x10\x00\x41\x01\x05\x10\x00\x41\x00\x0b\x41\x03\x1b\x0b\x95\x80\x80\x80\x00\x00\x41\x02\x41\x03\x20\x00\x04\x7f\x10\x00\x41\x01\x05\x10\x00\x41\x00\x0b\x1b\x0b\x97\x80\x80\x80\x00\x00\x03\x7f\x20\x00\x04\x7f\x10\x00\x41\x01\x05\x10\x00\x41\x00\x0b\x10\x00\x10\x00\x0b\x0b\x97\x80\x80\x80\x00\x00\x03\x7f\x10\x00\x20\x00\x04\x7f\x10\x00\x41\x01\x05\x10\x00\x41\x00\x0b\x10\x00\x0b\x0b\x97\x80\x80\x80\x00\x00\x03\x7f\x10\x00\x10\x00\x20\x00\x04\x7f\x10\x00\x41\x01\x05\x10\x00\x41\x00\x0b\x0b\x0b\x98\x80\x80\x80\x00\x00\x20\x00\x04\x7f\x41\x01\x05\x41\x00\x0b\x04\x7f\x10\x00\x41\x02\x05\x10\x00\x41\x03\x0b\x0b\x9a\x80\x80\x80\x00\x00\x02\x7f\x20\x00\x04\x7f\x10\x00\x41\x01\x05\x10\x00\x41\x00\x0b\x41\x02\x0d\x00\x41\x03\x0f\x0b\x0b\x9a\x80\x80\x80\x00\x00\x02\x7f\x41\x02\x20\x00\x04\x7f\x10\x00\x41\x01\x05\x10\x00\x41\x00\x0b\x0d\x00\x41\x03\x0f\x0b\x0b\x99\x80\x80\x80\x00\x00\x02\x7f\x20\x00\x04\x7f\x10\x00\x41\x01\x05\x10\x00\x41\x00\x0b\x41\x02\x0e\x01\x00\x00\x0b\x0b\x99\x80\x80\x80\x00\x00\x02\x7f\x41\x02\x20\x00\x04\x7f\x10\x00\x41\x01\x05\x10\x00\x41\x00\x0b\x0e\x01\x00\x00\x0b\x0b\x84\x80\x80\x80\x00\x00\x20\x00\x0b\x9a\x80\x80\x80\x00\x00\x02\x7f\x20\x00\x04\x7f\x10\x00\x41\x01\x05\x10\x00\x41\x00\x0b\x41\x02\x41\x00\x11\x00\x00\x0b\x0b\x9a\x80\x80\x80\x00\x00\x02\x7f\x41\x02\x20\x00\x04\x7f\x10\x00\x41\x01\x05\x10\x00\x41\x00\x0b\x41\x00\x11\x00\x00\x0b\x0b\x9a\x80\x80\x80\x00\x00\x02\x7f\x41\x02\x41\x00\x20\x00\x04\x7f\x10\x00\x41\x01\x05\x10\x00\x41\x00\x0b\x11\x00\x00\x0b\x0b\x95\x80\x80\x80\x00\x00\x20\x00\x04\x7f\x10\x00\x41\x01\x05\x10\x00\x41\x00\x0b\x41\x02\x36\x02\x00\x0b\x95\x80\x80\x80\x00\x00\x41\x02\x20\x00\x04\x7f\x10\x00\x41\x01\x05\x10\x00\x41\x00\x0b\x36\x02\x00\x0b\x8e\x80\x80\x80\x00\x00\x20\x00\x04\x7f\x41\x01\x05\x41\x00\x0b\x40\x00\x0b\x84\x80\x80\x80\x00\x00\x20\x00\x0b\x8e\x80\x80\x80\x00\x00\x20\x00\x04\x7f\x41\x01\x05\x41\x00\x0b\x10\x17\x0b\x8d\x80\x80\x80\x00\x00\x20\x00\x04\x7f\x41\x01\x05\x41\x00\x0b\x0f\x0b\x8d\x80\x80\x80\x00\x00\x20\x00\x04\x7f\x41\x01\x05\x41\x00\x0b\x1a\x0b\x91\x80\x80\x80\x00\x00\x02\x7f\x20\x00\x04\x7f\x41\x01\x05\x41\x00\x0b\x0c\x00\x0b\x0b\x92\x80\x80\x80\x00\x01\x01\x7f\x20\x00\x04\x7f\x41\x01\x05\x41\x00\x0b\x21\x00\x20\x00\x0b\x8e\x80\x80\x80\x00\x00\x20\x00\x04\x7f\x41\x01\x05\x41\x00\x0b\x22\x00\x0b\x90\x80\x80\x80\x00\x00\x20\x00\x04\x7f\x41\x01\x05\x41\x00\x0b\x24\x00\x23\x00\x0b\x8f\x80\x80\x80\x00\x00\x20\x00\x04\x7f\x41\x0b\x05\x41\x0a\x0b\x28\x02\x00\x0b\x91\x80\x80\x80\x00\x00\x20\x00\x04\x7f\x10\x00\x41\x0d\x05\x10\x00\x41\x73\x0b\x68\x0b\x9f\x80\x80\x80\x00\x00\x20\x00\x04\x7f\x10\x00\x41\x03\x05\x10\x00\x41\x7d\x0b\x20\x01\x04\x7f\x10\x00\x41\x04\x05\x10\x00\x41\x7b\x0b\x6c\x0b\x91\x80\x80\x80\x00\x00\x20\x00\x04\x7f\x10\x00\x41\x0d\x05\x10\x00\x41\x00\x0b\x45\x0b\xab\x80\x80\x80\x00\x00\x20\x00\x04\x7d\x10\x00\x43\x00\x00\x40\x40\x05\x10\x00\x43\x00\x00\x40\xc0\x0b\x20\x01\x04\x7d\x10\x00\x43\x00\x00\x80\x40\x05\x10\x00\x43\x00\x00\x80\xc0\x0b\x5e\x0b\xe7\x80\x80\x80\x00\x00\x41\x01\x04\x40\x0c\x00\x00\x0b\x41\x01\x04\x40\x0c\x00\x00\x05\x00\x0b\x41\x00\x04\x40\x00\x05\x0c\x00\x00\x0b\x41\x01\x04\x40\x41\x01\x0d\x00\x00\x0b\x41\x01\x04\x40\x41\x01\x0d\x00\x00\x05\x00\x0b\x41\x00\x04\x40\x00\x05\x41\x01\x0d\x00\x00\x0b\x41\x01\x04\x40\x41\x00\x0e\x00\x00\x00\x0b\x41\x01\x04\x40\x41\x00\x0e\x00\x00\x00\x05\x00\x0b\x41\x00\x04\x40\x00\x05\x41\x00\x0e\x00\x00\x00\x0b\x41\x13\x0b\x94\x80\x80\x80\x00\x00\x20\x00\x04\x7f\x41\x12\x0c\x00\x41\x13\x05\x41\x15\x0c\x00\x41\x14\x0b\x0b\xd1\x80\x80\x80\x00\x01\x01\x7f\x02\x7f\x41\x01\x21\x01\x20\x00\x0b\x04\x40\x20\x01\x41\x03\x6c\x21\x01\x20\x01\x41\x05\x6b\x21\x01\x20\x01\x41\x07\x6c\x21\x01\x0c\x00\x20\x01\x41\xe4\x00\x6c\x21\x01\x05\x20\x01\x41\x05\x6c\x21\x01\x20\x01\x41\x07\x6b\x21\x01\x20\x01\x41\x03\x6c\x21\x01\x0c\x00\x20\x01\x41\xe8\x07\x6c\x21\x01\x0b\x20\x01\x0b");

// if.wast:384
assert_return(() => call($1, "empty", [0]));

// if.wast:385
assert_return(() => call($1, "empty", [1]));

// if.wast:386
assert_return(() => call($1, "empty", [100]));

// if.wast:387
assert_return(() => call($1, "empty", [-2]));

// if.wast:389
assert_return(() => call($1, "singular", [0]), 8);

// if.wast:390
assert_return(() => call($1, "singular", [1]), 7);

// if.wast:391
assert_return(() => call($1, "singular", [10]), 7);

// if.wast:392
assert_return(() => call($1, "singular", [-10]), 7);

// if.wast:394
assert_return(() => call($1, "multi", [0]), 9);

// if.wast:395
assert_return(() => call($1, "multi", [1]), 8);

// if.wast:396
assert_return(() => call($1, "multi", [13]), 8);

// if.wast:397
assert_return(() => call($1, "multi", [-5]), 8);

// if.wast:399
assert_return(() => call($1, "nested", [0, 0]), 11);

// if.wast:400
assert_return(() => call($1, "nested", [1, 0]), 10);

// if.wast:401
assert_return(() => call($1, "nested", [0, 1]), 10);

// if.wast:402
assert_return(() => call($1, "nested", [3, 2]), 9);

// if.wast:403
assert_return(() => call($1, "nested", [0, -100]), 10);

// if.wast:404
assert_return(() => call($1, "nested", [10, 10]), 9);

// if.wast:405
assert_return(() => call($1, "nested", [0, -1]), 10);

// if.wast:406
assert_return(() => call($1, "nested", [-111, -2]), 9);

// if.wast:408
assert_return(() => call($1, "as-select-first", [0]), 0);

// if.wast:409
assert_return(() => call($1, "as-select-first", [1]), 1);

// if.wast:410
assert_return(() => call($1, "as-select-mid", [0]), 2);

// if.wast:411
assert_return(() => call($1, "as-select-mid", [1]), 2);

// if.wast:412
assert_return(() => call($1, "as-select-last", [0]), 3);

// if.wast:413
assert_return(() => call($1, "as-select-last", [1]), 2);

// if.wast:415
assert_return(() => call($1, "as-loop-first", [0]), 0);

// if.wast:416
assert_return(() => call($1, "as-loop-first", [1]), 1);

// if.wast:417
assert_return(() => call($1, "as-loop-mid", [0]), 0);

// if.wast:418
assert_return(() => call($1, "as-loop-mid", [1]), 1);

// if.wast:419
assert_return(() => call($1, "as-loop-last", [0]), 0);

// if.wast:420
assert_return(() => call($1, "as-loop-last", [1]), 1);

// if.wast:422
assert_return(() => call($1, "as-if-condition", [0]), 3);

// if.wast:423
assert_return(() => call($1, "as-if-condition", [1]), 2);

// if.wast:425
assert_return(() => call($1, "as-br_if-first", [0]), 0);

// if.wast:426
assert_return(() => call($1, "as-br_if-first", [1]), 1);

// if.wast:427
assert_return(() => call($1, "as-br_if-last", [0]), 3);

// if.wast:428
assert_return(() => call($1, "as-br_if-last", [1]), 2);

// if.wast:430
assert_return(() => call($1, "as-br_table-first", [0]), 0);

// if.wast:431
assert_return(() => call($1, "as-br_table-first", [1]), 1);

// if.wast:432
assert_return(() => call($1, "as-br_table-last", [0]), 2);

// if.wast:433
assert_return(() => call($1, "as-br_table-last", [1]), 2);

// if.wast:435
assert_return(() => call($1, "as-call_indirect-first", [0]), 0);

// if.wast:436
assert_return(() => call($1, "as-call_indirect-first", [1]), 1);

// if.wast:437
assert_return(() => call($1, "as-call_indirect-mid", [0]), 2);

// if.wast:438
assert_return(() => call($1, "as-call_indirect-mid", [1]), 2);

// if.wast:439
assert_return(() => call($1, "as-call_indirect-last", [0]), 2);

// if.wast:440
assert_trap(() => call($1, "as-call_indirect-last", [1]));

// if.wast:442
assert_return(() => call($1, "as-store-first", [0]));

// if.wast:443
assert_return(() => call($1, "as-store-first", [1]));

// if.wast:444
assert_return(() => call($1, "as-store-last", [0]));

// if.wast:445
assert_return(() => call($1, "as-store-last", [1]));

// if.wast:447
assert_return(() => call($1, "as-memory.grow-value", [0]), 1);

// if.wast:448
assert_return(() => call($1, "as-memory.grow-value", [1]), 1);

// if.wast:450
assert_return(() => call($1, "as-call-value", [0]), 0);

// if.wast:451
assert_return(() => call($1, "as-call-value", [1]), 1);

// if.wast:453
assert_return(() => call($1, "as-return-value", [0]), 0);

// if.wast:454
assert_return(() => call($1, "as-return-value", [1]), 1);

// if.wast:456
assert_return(() => call($1, "as-drop-operand", [0]));

// if.wast:457
assert_return(() => call($1, "as-drop-operand", [1]));

// if.wast:459
assert_return(() => call($1, "as-br-value", [0]), 0);

// if.wast:460
assert_return(() => call($1, "as-br-value", [1]), 1);

// if.wast:462
assert_return(() => call($1, "as-local.set-value", [0]), 0);

// if.wast:463
assert_return(() => call($1, "as-local.set-value", [1]), 1);

// if.wast:465
assert_return(() => call($1, "as-local.tee-value", [0]), 0);

// if.wast:466
assert_return(() => call($1, "as-local.tee-value", [1]), 1);

// if.wast:468
assert_return(() => call($1, "as-global.set-value", [0]), 0);

// if.wast:469
assert_return(() => call($1, "as-global.set-value", [1]), 1);

// if.wast:471
assert_return(() => call($1, "as-load-operand", [0]), 0);

// if.wast:472
assert_return(() => call($1, "as-load-operand", [1]), 0);

// if.wast:474
assert_return(() => call($1, "as-unary-operand", [0]), 0);

// if.wast:475
assert_return(() => call($1, "as-unary-operand", [1]), 0);

// if.wast:476
assert_return(() => call($1, "as-unary-operand", [-1]), 0);

// if.wast:478
assert_return(() => call($1, "as-binary-operand", [0, 0]), 15);

// if.wast:479
assert_return(() => call($1, "as-binary-operand", [0, 1]), -12);

// if.wast:480
assert_return(() => call($1, "as-binary-operand", [1, 0]), -15);

// if.wast:481
assert_return(() => call($1, "as-binary-operand", [1, 1]), 12);

// if.wast:483
assert_return(() => call($1, "as-test-operand", [0]), 1);

// if.wast:484
assert_return(() => call($1, "as-test-operand", [1]), 0);

// if.wast:486
assert_return(() => call($1, "as-compare-operand", [0, 0]), 1);

// if.wast:487
assert_return(() => call($1, "as-compare-operand", [0, 1]), 0);

// if.wast:488
assert_return(() => call($1, "as-compare-operand", [1, 0]), 1);

// if.wast:489
assert_return(() => call($1, "as-compare-operand", [1, 1]), 0);

// if.wast:491
assert_return(() => call($1, "break-bare", []), 19);

// if.wast:492
assert_return(() => call($1, "break-value", [1]), 18);

// if.wast:493
assert_return(() => call($1, "break-value", [0]), 21);

// if.wast:495
assert_return(() => call($1, "effects", [1]), -14);

// if.wast:496
assert_return(() => call($1, "effects", [0]), -6);

// if.wast:498
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x85\x80\x80\x80\x00\x01\x60\x00\x01\x7f\x03\x82\x80\x80\x80\x00\x01\x00\x0a\x8d\x80\x80\x80\x00\x01\x87\x80\x80\x80\x00\x00\x41\x00\x04\x40\x0b\x0b");

// if.wast:502
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x85\x80\x80\x80\x00\x01\x60\x00\x01\x7e\x03\x82\x80\x80\x80\x00\x01\x00\x0a\x8d\x80\x80\x80\x00\x01\x87\x80\x80\x80\x00\x00\x41\x00\x04\x40\x0b\x0b");

// if.wast:506
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x85\x80\x80\x80\x00\x01\x60\x00\x01\x7d\x03\x82\x80\x80\x80\x00\x01\x00\x0a\x8d\x80\x80\x80\x00\x01\x87\x80\x80\x80\x00\x00\x41\x00\x04\x40\x0b\x0b");

// if.wast:510
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x85\x80\x80\x80\x00\x01\x60\x00\x01\x7c\x03\x82\x80\x80\x80\x00\x01\x00\x0a\x8d\x80\x80\x80\x00\x01\x87\x80\x80\x80\x00\x00\x41\x00\x04\x40\x0b\x0b");

// if.wast:515
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x85\x80\x80\x80\x00\x01\x60\x00\x01\x7f\x03\x82\x80\x80\x80\x00\x01\x00\x0a\x8d\x80\x80\x80\x00\x01\x87\x80\x80\x80\x00\x00\x41\x00\x04\x40\x0b\x0b");

// if.wast:519
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x85\x80\x80\x80\x00\x01\x60\x00\x01\x7e\x03\x82\x80\x80\x80\x00\x01\x00\x0a\x8d\x80\x80\x80\x00\x01\x87\x80\x80\x80\x00\x00\x41\x00\x04\x40\x0b\x0b");

// if.wast:523
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x85\x80\x80\x80\x00\x01\x60\x00\x01\x7d\x03\x82\x80\x80\x80\x00\x01\x00\x0a\x8d\x80\x80\x80\x00\x01\x87\x80\x80\x80\x00\x00\x41\x00\x04\x40\x0b\x0b");

// if.wast:527
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x85\x80\x80\x80\x00\x01\x60\x00\x01\x7c\x03\x82\x80\x80\x80\x00\x01\x00\x0a\x8d\x80\x80\x80\x00\x01\x87\x80\x80\x80\x00\x00\x41\x00\x04\x40\x0b\x0b");

// if.wast:532
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x84\x80\x80\x80\x00\x01\x60\x00\x00\x03\x82\x80\x80\x80\x00\x01\x00\x0a\x8f\x80\x80\x80\x00\x01\x89\x80\x80\x80\x00\x00\x41\x01\x04\x40\x41\x01\x0b\x0b");

// if.wast:538
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x84\x80\x80\x80\x00\x01\x60\x00\x00\x03\x82\x80\x80\x80\x00\x01\x00\x0a\x8f\x80\x80\x80\x00\x01\x89\x80\x80\x80\x00\x00\x41\x01\x04\x40\x41\x01\x0b\x0b");

// if.wast:544
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x84\x80\x80\x80\x00\x01\x60\x00\x00\x03\x82\x80\x80\x80\x00\x01\x00\x0a\x90\x80\x80\x80\x00\x01\x8a\x80\x80\x80\x00\x00\x41\x01\x04\x40\x05\x41\x01\x0b\x0b");

// if.wast:550
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x84\x80\x80\x80\x00\x01\x60\x00\x00\x03\x82\x80\x80\x80\x00\x01\x00\x0a\x92\x80\x80\x80\x00\x01\x8c\x80\x80\x80\x00\x00\x41\x01\x04\x40\x41\x01\x05\x41\x01\x0b\x0b");

// if.wast:557
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x85\x80\x80\x80\x00\x01\x60\x00\x01\x7f\x03\x82\x80\x80\x80\x00\x01\x00\x0a\x90\x80\x80\x80\x00\x01\x8a\x80\x80\x80\x00\x00\x41\x01\x04\x7f\x05\x41\x00\x0b\x0b");

// if.wast:563
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x85\x80\x80\x80\x00\x01\x60\x00\x01\x7f\x03\x82\x80\x80\x80\x00\x01\x00\x0a\x8f\x80\x80\x80\x00\x01\x89\x80\x80\x80\x00\x00\x41\x01\x04\x7f\x41\x00\x0b\x0b");

// if.wast:569
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x85\x80\x80\x80\x00\x01\x60\x00\x01\x7f\x03\x82\x80\x80\x80\x00\x01\x00\x0a\x8d\x80\x80\x80\x00\x01\x87\x80\x80\x80\x00\x00\x41\x01\x04\x7f\x0b\x0b");

// if.wast:575
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x85\x80\x80\x80\x00\x01\x60\x00\x01\x7f\x03\x82\x80\x80\x80\x00\x01\x00\x0a\x8f\x80\x80\x80\x00\x01\x89\x80\x80\x80\x00\x00\x41\x01\x04\x7f\x41\x01\x0b\x0b");

// if.wast:582
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x85\x80\x80\x80\x00\x01\x60\x00\x01\x7f\x03\x82\x80\x80\x80\x00\x01\x00\x0a\x91\x80\x80\x80\x00\x01\x8b\x80\x80\x80\x00\x00\x41\x01\x04\x7f\x01\x05\x41\x00\x0b\x0b");

// if.wast:588
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x85\x80\x80\x80\x00\x01\x60\x00\x01\x7f\x03\x82\x80\x80\x80\x00\x01\x00\x0a\x91\x80\x80\x80\x00\x01\x8b\x80\x80\x80\x00\x00\x41\x01\x04\x7f\x41\x00\x05\x01\x0b\x0b");

// if.wast:594
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x85\x80\x80\x80\x00\x01\x60\x00\x01\x7f\x03\x82\x80\x80\x80\x00\x01\x00\x0a\x90\x80\x80\x80\x00\x01\x8a\x80\x80\x80\x00\x00\x41\x01\x04\x7f\x01\x05\x01\x0b\x0b");

// if.wast:601
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x85\x80\x80\x80\x00\x01\x60\x00\x01\x7f\x03\x82\x80\x80\x80\x00\x01\x00\x0a\x92\x80\x80\x80\x00\x01\x8c\x80\x80\x80\x00\x00\x41\x01\x04\x7f\x42\x01\x05\x41\x01\x0b\x0b");

// if.wast:607
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x85\x80\x80\x80\x00\x01\x60\x00\x01\x7f\x03\x82\x80\x80\x80\x00\x01\x00\x0a\x92\x80\x80\x80\x00\x01\x8c\x80\x80\x80\x00\x00\x41\x01\x04\x7f\x41\x01\x05\x42\x01\x0b\x0b");

// if.wast:613
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x85\x80\x80\x80\x00\x01\x60\x00\x01\x7f\x03\x82\x80\x80\x80\x00\x01\x00\x0a\x92\x80\x80\x80\x00\x01\x8c\x80\x80\x80\x00\x00\x41\x01\x04\x7f\x42\x01\x05\x42\x01\x0b\x0b");

// if.wast:619
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x85\x80\x80\x80\x00\x01\x60\x00\x01\x7f\x03\x82\x80\x80\x80\x00\x01\x00\x0a\x99\x80\x80\x80\x00\x01\x93\x80\x80\x80\x00\x00\x41\x01\x04\x7f\x42\x01\x05\x44\x00\x00\x00\x00\x00\x00\xf0\x3f\x0b\x0b");

// if.wast:626
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x85\x80\x80\x80\x00\x01\x60\x00\x01\x7f\x03\x82\x80\x80\x80\x00\x01\x00\x0a\x94\x80\x80\x80\x00\x01\x8e\x80\x80\x80\x00\x00\x41\x00\x04\x7e\x00\x00\x00\x1b\x05\x42\x00\x0b\x0b");

// if.wast:636
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x85\x80\x80\x80\x00\x01\x60\x00\x01\x7f\x03\x82\x80\x80\x80\x00\x01\x00\x0a\x94\x80\x80\x80\x00\x01\x8e\x80\x80\x80\x00\x00\x41\x01\x04\x7e\x42\x00\x05\x00\x00\x00\x1b\x0b\x0b");

// if.wast:646
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x85\x80\x80\x80\x00\x01\x60\x00\x01\x7f\x03\x82\x80\x80\x80\x00\x01\x00\x0a\x96\x80\x80\x80\x00\x01\x90\x80\x80\x80\x00\x00\x41\x01\x04\x7e\x00\x00\x00\x1b\x05\x00\x00\x00\x1b\x0b\x0b");

// if.wast:657
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x85\x80\x80\x80\x00\x01\x60\x00\x01\x7f\x03\x82\x80\x80\x80\x00\x01\x00\x0a\x92\x80\x80\x80\x00\x01\x8c\x80\x80\x80\x00\x00\x41\x01\x04\x7f\x0c\x00\x05\x41\x01\x0b\x0b");

// if.wast:663
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x85\x80\x80\x80\x00\x01\x60\x00\x01\x7f\x03\x82\x80\x80\x80\x00\x01\x00\x0a\x92\x80\x80\x80\x00\x01\x8c\x80\x80\x80\x00\x00\x41\x01\x04\x7f\x41\x01\x05\x0c\x00\x0b\x0b");

// if.wast:669
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x85\x80\x80\x80\x00\x01\x60\x00\x01\x7f\x03\x82\x80\x80\x80\x00\x01\x00\x0a\x94\x80\x80\x80\x00\x01\x8e\x80\x80\x80\x00\x00\x41\x01\x04\x7f\x0c\x00\x41\x01\x05\x41\x01\x0b\x0b");

// if.wast:678
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x85\x80\x80\x80\x00\x01\x60\x00\x01\x7f\x03\x82\x80\x80\x80\x00\x01\x00\x0a\x94\x80\x80\x80\x00\x01\x8e\x80\x80\x80\x00\x00\x41\x01\x04\x7f\x41\x01\x05\x0c\x00\x41\x01\x0b\x0b");

// if.wast:687
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x85\x80\x80\x80\x00\x01\x60\x00\x01\x7f\x03\x82\x80\x80\x80\x00\x01\x00\x0a\x95\x80\x80\x80\x00\x01\x8f\x80\x80\x80\x00\x00\x41\x01\x04\x7f\x01\x0c\x00\x41\x01\x05\x41\x01\x0b\x0b");

// if.wast:696
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x85\x80\x80\x80\x00\x01\x60\x00\x01\x7f\x03\x82\x80\x80\x80\x00\x01\x00\x0a\x95\x80\x80\x80\x00\x01\x8f\x80\x80\x80\x00\x00\x41\x01\x04\x7f\x41\x01\x05\x01\x0c\x00\x41\x01\x0b\x0b");

// if.wast:706
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x85\x80\x80\x80\x00\x01\x60\x00\x01\x7f\x03\x82\x80\x80\x80\x00\x01\x00\x0a\x96\x80\x80\x80\x00\x01\x90\x80\x80\x80\x00\x00\x41\x01\x04\x7f\x42\x01\x0c\x00\x41\x01\x05\x41\x01\x0b\x0b");

// if.wast:715
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x85\x80\x80\x80\x00\x01\x60\x00\x01\x7f\x03\x82\x80\x80\x80\x00\x01\x00\x0a\x96\x80\x80\x80\x00\x01\x90\x80\x80\x80\x00\x00\x41\x01\x04\x7f\x41\x01\x05\x42\x01\x0c\x00\x41\x01\x0b\x0b");

// if.wast:725
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x84\x80\x80\x80\x00\x01\x60\x00\x00\x03\x82\x80\x80\x80\x00\x01\x00\x0a\x8b\x80\x80\x80\x00\x01\x85\x80\x80\x80\x00\x00\x04\x40\x0b\x0b");

// if.wast:733
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x84\x80\x80\x80\x00\x01\x60\x00\x00\x03\x82\x80\x80\x80\x00\x01\x00\x0a\x90\x80\x80\x80\x00\x01\x8a\x80\x80\x80\x00\x00\x41\x00\x02\x40\x04\x40\x0b\x0b\x0b");

// if.wast:742
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x84\x80\x80\x80\x00\x01\x60\x00\x00\x03\x82\x80\x80\x80\x00\x01\x00\x0a\x90\x80\x80\x80\x00\x01\x8a\x80\x80\x80\x00\x00\x41\x00\x03\x40\x04\x40\x0b\x0b\x0b");

// if.wast:751
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x84\x80\x80\x80\x00\x01\x60\x00\x00\x03\x82\x80\x80\x80\x00\x01\x00\x0a\x92\x80\x80\x80\x00\x01\x8c\x80\x80\x80\x00\x00\x41\x00\x41\x00\x04\x40\x04\x40\x0b\x0b\x0b");

// if.wast:760
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x84\x80\x80\x80\x00\x01\x60\x00\x00\x03\x82\x80\x80\x80\x00\x01\x00\x0a\x98\x80\x80\x80\x00\x01\x92\x80\x80\x80\x00\x00\x41\x00\x41\x00\x04\x7f\x41\x00\x05\x04\x40\x0b\x41\x00\x0b\x1a\x0b");

// if.wast:770
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x84\x80\x80\x80\x00\x01\x60\x00\x00\x03\x82\x80\x80\x80\x00\x01\x00\x0a\x93\x80\x80\x80\x00\x01\x8d\x80\x80\x80\x00\x00\x41\x00\x02\x40\x04\x40\x0b\x0c\x00\x1a\x0b\x0b");

// if.wast:779
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x84\x80\x80\x80\x00\x01\x60\x00\x00\x03\x82\x80\x80\x80\x00\x01\x00\x0a\x95\x80\x80\x80\x00\x01\x8f\x80\x80\x80\x00\x00\x41\x00\x02\x40\x04\x40\x0b\x41\x01\x0d\x00\x1a\x0b\x0b");

// if.wast:788
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x84\x80\x80\x80\x00\x01\x60\x00\x00\x03\x82\x80\x80\x80\x00\x01\x00\x0a\x94\x80\x80\x80\x00\x01\x8e\x80\x80\x80\x00\x00\x41\x00\x02\x40\x04\x40\x0b\x0e\x00\x00\x1a\x0b\x0b");

// if.wast:797
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x84\x80\x80\x80\x00\x01\x60\x00\x00\x03\x82\x80\x80\x80\x00\x01\x00\x0a\x8d\x80\x80\x80\x00\x01\x87\x80\x80\x80\x00\x00\x04\x40\x0b\x0f\x1a\x0b");

// if.wast:805
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x84\x80\x80\x80\x00\x01\x60\x00\x00\x03\x82\x80\x80\x80\x00\x01\x00\x0a\x91\x80\x80\x80\x00\x01\x8b\x80\x80\x80\x00\x00\x04\x40\x0b\x41\x01\x41\x02\x1b\x1a\x0b");

// if.wast:813
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x89\x80\x80\x80\x00\x02\x60\x00\x00\x60\x01\x7f\x01\x7f\x03\x83\x80\x80\x80\x00\x02\x00\x01\x0a\x97\x80\x80\x80\x00\x02\x88\x80\x80\x80\x00\x00\x04\x40\x0b\x10\x01\x1a\x0b\x84\x80\x80\x80\x00\x00\x20\x00\x0b");

// if.wast:822
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x89\x80\x80\x80\x00\x02\x60\x01\x7f\x01\x7f\x60\x00\x00\x03\x83\x80\x80\x80\x00\x02\x00\x01\x04\x85\x80\x80\x80\x00\x01\x70\x01\x01\x01\x09\x87\x80\x80\x80\x00\x01\x00\x41\x00\x0b\x01\x00\x0a\x9d\x80\x80\x80\x00\x02\x84\x80\x80\x80\x00\x00\x20\x00\x0b\x8e\x80\x80\x80\x00\x00\x02\x7f\x04\x40\x0b\x41\x00\x11\x00\x00\x1a\x0b\x0b");

// if.wast:838
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x84\x80\x80\x80\x00\x01\x60\x00\x00\x03\x82\x80\x80\x80\x00\x01\x00\x0a\x92\x80\x80\x80\x00\x01\x8c\x80\x80\x80\x00\x01\x01\x7f\x04\x40\x0b\x21\x00\x20\x00\x1a\x0b");

// if.wast:847
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x84\x80\x80\x80\x00\x01\x60\x00\x00\x03\x82\x80\x80\x80\x00\x01\x00\x0a\x90\x80\x80\x80\x00\x01\x8a\x80\x80\x80\x00\x01\x01\x7f\x04\x40\x0b\x22\x00\x1a\x0b");

// if.wast:856
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x84\x80\x80\x80\x00\x01\x60\x00\x00\x03\x82\x80\x80\x80\x00\x01\x00\x06\x86\x80\x80\x80\x00\x01\x7f\x01\x41\x00\x0b\x0a\x90\x80\x80\x80\x00\x01\x8a\x80\x80\x80\x00\x00\x04\x40\x0b\x24\x00\x23\x00\x1a\x0b");

// if.wast:865
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x84\x80\x80\x80\x00\x01\x60\x00\x00\x03\x82\x80\x80\x80\x00\x01\x00\x05\x83\x80\x80\x80\x00\x01\x00\x00\x0a\x8e\x80\x80\x80\x00\x01\x88\x80\x80\x80\x00\x00\x04\x40\x0b\x40\x00\x1a\x0b");

// if.wast:874
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x84\x80\x80\x80\x00\x01\x60\x00\x00\x03\x82\x80\x80\x80\x00\x01\x00\x05\x83\x80\x80\x80\x00\x01\x00\x00\x0a\x8f\x80\x80\x80\x00\x01\x89\x80\x80\x80\x00\x00\x04\x40\x0b\x28\x02\x00\x1a\x0b");

// if.wast:883
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x84\x80\x80\x80\x00\x01\x60\x00\x00\x03\x82\x80\x80\x80\x00\x01\x00\x05\x83\x80\x80\x80\x00\x01\x00\x01\x0a\x90\x80\x80\x80\x00\x01\x8a\x80\x80\x80\x00\x00\x04\x40\x0b\x41\x01\x36\x02\x00\x0b");

// if.wast:894
assert_malformed("\x3c\x6d\x61\x6c\x66\x6f\x72\x6d\x65\x64\x20\x71\x75\x6f\x74\x65\x3e");

// if.wast:898
assert_malformed("\x3c\x6d\x61\x6c\x66\x6f\x72\x6d\x65\x64\x20\x71\x75\x6f\x74\x65\x3e");

// if.wast:902
assert_malformed("\x3c\x6d\x61\x6c\x66\x6f\x72\x6d\x65\x64\x20\x71\x75\x6f\x74\x65\x3e");

// if.wast:906
assert_malformed("\x3c\x6d\x61\x6c\x66\x6f\x72\x6d\x65\x64\x20\x71\x75\x6f\x74\x65\x3e");

// if.wast:910
assert_malformed("\x3c\x6d\x61\x6c\x66\x6f\x72\x6d\x65\x64\x20\x71\x75\x6f\x74\x65\x3e");

// if.wast:914
assert_malformed("\x3c\x6d\x61\x6c\x66\x6f\x72\x6d\x65\x64\x20\x71\x75\x6f\x74\x65\x3e");

// if.wast:918
assert_malformed("\x3c\x6d\x61\x6c\x66\x6f\x72\x6d\x65\x64\x20\x71\x75\x6f\x74\x65\x3e");

// if.wast:922
assert_malformed("\x3c\x6d\x61\x6c\x66\x6f\x72\x6d\x65\x64\x20\x71\x75\x6f\x74\x65\x3e");

// if.wast:926
assert_malformed("\x3c\x6d\x61\x6c\x66\x6f\x72\x6d\x65\x64\x20\x71\x75\x6f\x74\x65\x3e");

// if.wast:930
assert_malformed("\x3c\x6d\x61\x6c\x66\x6f\x72\x6d\x65\x64\x20\x71\x75\x6f\x74\x65\x3e");
