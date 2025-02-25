
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

// switch.wast:1
let $1 = instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x8f\x80\x80\x80\x00\x03\x60\x01\x7f\x01\x7f\x60\x01\x7e\x01\x7e\x60\x00\x01\x7f\x03\x85\x80\x80\x80\x00\x04\x00\x01\x00\x02\x07\x9e\x80\x80\x80\x00\x04\x04\x73\x74\x6d\x74\x00\x00\x04\x65\x78\x70\x72\x00\x01\x03\x61\x72\x67\x00\x02\x06\x63\x6f\x72\x6e\x65\x72\x00\x03\x0a\xee\x81\x80\x80\x00\x04\xd7\x80\x80\x80\x00\x01\x01\x7f\x41\xe4\x00\x21\x01\x02\x40\x02\x40\x02\x40\x02\x40\x02\x40\x02\x40\x02\x40\x02\x40\x02\x40\x02\x40\x20\x00\x0e\x08\x00\x01\x02\x03\x04\x05\x06\x08\x07\x0b\x20\x00\x0f\x0b\x01\x0b\x0b\x41\x00\x20\x00\x6b\x21\x01\x0c\x05\x0b\x0c\x04\x0b\x41\xe5\x00\x21\x01\x0c\x03\x0b\x41\xe5\x00\x21\x01\x0b\x41\xe6\x00\x21\x01\x0b\x0b\x20\x01\x0f\x0b\xcc\x80\x80\x80\x00\x01\x01\x7e\x42\xe4\x00\x21\x01\x02\x7e\x02\x40\x02\x40\x02\x40\x02\x40\x02\x40\x02\x40\x02\x40\x02\x40\x02\x40\x20\x00\xa7\x0e\x08\x00\x01\x02\x03\x06\x05\x04\x08\x07\x0b\x20\x00\x0f\x0b\x01\x0b\x0b\x42\x00\x20\x00\x7d\x0c\x05\x0b\x42\xe5\x00\x21\x01\x0b\x0b\x0b\x20\x01\x0c\x01\x0b\x42\x7b\x0b\x0f\x0b\xaa\x80\x80\x80\x00\x00\x02\x7f\x41\x0a\x02\x7f\x41\xe4\x00\x02\x7f\x41\xe8\x07\x02\x7f\x41\x02\x20\x00\x6c\x41\x03\x20\x00\x71\x0e\x03\x01\x02\x03\x00\x0b\x6a\x0b\x6a\x0b\x6a\x0b\x0f\x0b\x8c\x80\x80\x80\x00\x00\x02\x40\x41\x00\x0e\x00\x00\x0b\x41\x01\x0b");

// switch.wast:120
assert_return(() => call($1, "stmt", [0]), 0);

// switch.wast:121
assert_return(() => call($1, "stmt", [1]), -1);

// switch.wast:122
assert_return(() => call($1, "stmt", [2]), -2);

// switch.wast:123
assert_return(() => call($1, "stmt", [3]), -3);

// switch.wast:124
assert_return(() => call($1, "stmt", [4]), 100);

// switch.wast:125
assert_return(() => call($1, "stmt", [5]), 101);

// switch.wast:126
assert_return(() => call($1, "stmt", [6]), 102);

// switch.wast:127
assert_return(() => call($1, "stmt", [7]), 100);

// switch.wast:128
assert_return(() => call($1, "stmt", [-10]), 102);

// switch.wast:130
run(() => call(instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x89\x80\x80\x80\x00\x02\x60\x00\x00\x60\x01\x7e\x01\x7e\x02\x8b\x80\x80\x80\x00\x01\x02\x24\x31\x04\x65\x78\x70\x72\x00\x01\x03\x82\x80\x80\x80\x00\x01\x00\x07\x87\x80\x80\x80\x00\x01\x03\x72\x75\x6e\x00\x01\x0a\x99\x80\x80\x80\x00\x01\x93\x80\x80\x80\x00\x00\x02\x40\x42\x00\x10\x00\x01\x42\x00\x01\x51\x45\x0d\x00\x0f\x0b\x00\x0b", exports("$1", $1)),  "run", []));  // assert_return(() => call($1, "expr", [int64("0")]), int64("0"))

// switch.wast:131
run(() => call(instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x89\x80\x80\x80\x00\x02\x60\x00\x00\x60\x01\x7e\x01\x7e\x02\x8b\x80\x80\x80\x00\x01\x02\x24\x31\x04\x65\x78\x70\x72\x00\x01\x03\x82\x80\x80\x80\x00\x01\x00\x07\x87\x80\x80\x80\x00\x01\x03\x72\x75\x6e\x00\x01\x0a\x99\x80\x80\x80\x00\x01\x93\x80\x80\x80\x00\x00\x02\x40\x42\x01\x10\x00\x01\x42\x7f\x01\x51\x45\x0d\x00\x0f\x0b\x00\x0b", exports("$1", $1)),  "run", []));  // assert_return(() => call($1, "expr", [int64("1")]), int64("-1"))

// switch.wast:132
run(() => call(instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x89\x80\x80\x80\x00\x02\x60\x00\x00\x60\x01\x7e\x01\x7e\x02\x8b\x80\x80\x80\x00\x01\x02\x24\x31\x04\x65\x78\x70\x72\x00\x01\x03\x82\x80\x80\x80\x00\x01\x00\x07\x87\x80\x80\x80\x00\x01\x03\x72\x75\x6e\x00\x01\x0a\x99\x80\x80\x80\x00\x01\x93\x80\x80\x80\x00\x00\x02\x40\x42\x02\x10\x00\x01\x42\x7e\x01\x51\x45\x0d\x00\x0f\x0b\x00\x0b", exports("$1", $1)),  "run", []));  // assert_return(() => call($1, "expr", [int64("2")]), int64("-2"))

// switch.wast:133
run(() => call(instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x89\x80\x80\x80\x00\x02\x60\x00\x00\x60\x01\x7e\x01\x7e\x02\x8b\x80\x80\x80\x00\x01\x02\x24\x31\x04\x65\x78\x70\x72\x00\x01\x03\x82\x80\x80\x80\x00\x01\x00\x07\x87\x80\x80\x80\x00\x01\x03\x72\x75\x6e\x00\x01\x0a\x99\x80\x80\x80\x00\x01\x93\x80\x80\x80\x00\x00\x02\x40\x42\x03\x10\x00\x01\x42\x7d\x01\x51\x45\x0d\x00\x0f\x0b\x00\x0b", exports("$1", $1)),  "run", []));  // assert_return(() => call($1, "expr", [int64("3")]), int64("-3"))

// switch.wast:134
run(() => call(instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x89\x80\x80\x80\x00\x02\x60\x00\x00\x60\x01\x7e\x01\x7e\x02\x8b\x80\x80\x80\x00\x01\x02\x24\x31\x04\x65\x78\x70\x72\x00\x01\x03\x82\x80\x80\x80\x00\x01\x00\x07\x87\x80\x80\x80\x00\x01\x03\x72\x75\x6e\x00\x01\x0a\x9a\x80\x80\x80\x00\x01\x94\x80\x80\x80\x00\x00\x02\x40\x42\x06\x10\x00\x01\x42\xe5\x00\x01\x51\x45\x0d\x00\x0f\x0b\x00\x0b", exports("$1", $1)),  "run", []));  // assert_return(() => call($1, "expr", [int64("6")]), int64("101"))

// switch.wast:135
run(() => call(instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x89\x80\x80\x80\x00\x02\x60\x00\x00\x60\x01\x7e\x01\x7e\x02\x8b\x80\x80\x80\x00\x01\x02\x24\x31\x04\x65\x78\x70\x72\x00\x01\x03\x82\x80\x80\x80\x00\x01\x00\x07\x87\x80\x80\x80\x00\x01\x03\x72\x75\x6e\x00\x01\x0a\x99\x80\x80\x80\x00\x01\x93\x80\x80\x80\x00\x00\x02\x40\x42\x07\x10\x00\x01\x42\x7b\x01\x51\x45\x0d\x00\x0f\x0b\x00\x0b", exports("$1", $1)),  "run", []));  // assert_return(() => call($1, "expr", [int64("7")]), int64("-5"))

// switch.wast:136
run(() => call(instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x89\x80\x80\x80\x00\x02\x60\x00\x00\x60\x01\x7e\x01\x7e\x02\x8b\x80\x80\x80\x00\x01\x02\x24\x31\x04\x65\x78\x70\x72\x00\x01\x03\x82\x80\x80\x80\x00\x01\x00\x07\x87\x80\x80\x80\x00\x01\x03\x72\x75\x6e\x00\x01\x0a\x9a\x80\x80\x80\x00\x01\x94\x80\x80\x80\x00\x00\x02\x40\x42\x76\x10\x00\x01\x42\xe4\x00\x01\x51\x45\x0d\x00\x0f\x0b\x00\x0b", exports("$1", $1)),  "run", []));  // assert_return(() => call($1, "expr", [int64("-10")]), int64("100"))

// switch.wast:138
assert_return(() => call($1, "arg", [0]), 110);

// switch.wast:139
assert_return(() => call($1, "arg", [1]), 12);

// switch.wast:140
assert_return(() => call($1, "arg", [2]), 4);

// switch.wast:141
assert_return(() => call($1, "arg", [3]), 1_116);

// switch.wast:142
assert_return(() => call($1, "arg", [4]), 118);

// switch.wast:143
assert_return(() => call($1, "arg", [5]), 20);

// switch.wast:144
assert_return(() => call($1, "arg", [6]), 12);

// switch.wast:145
assert_return(() => call($1, "arg", [7]), 1_124);

// switch.wast:146
assert_return(() => call($1, "arg", [8]), 126);

// switch.wast:148
assert_return(() => call($1, "corner", []), 1);

// switch.wast:150
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x84\x80\x80\x80\x00\x01\x60\x00\x00\x03\x82\x80\x80\x80\x00\x01\x00\x0a\x8d\x80\x80\x80\x00\x01\x87\x80\x80\x80\x00\x00\x41\x00\x0e\x00\x03\x0b");
