
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

// memory_size.wast:1
let $1 = instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x89\x80\x80\x80\x00\x02\x60\x00\x01\x7f\x60\x01\x7f\x00\x03\x83\x80\x80\x80\x00\x02\x00\x01\x05\x83\x80\x80\x80\x00\x01\x00\x00\x07\x8f\x80\x80\x80\x00\x02\x04\x73\x69\x7a\x65\x00\x00\x04\x67\x72\x6f\x77\x00\x01\x0a\x96\x80\x80\x80\x00\x02\x84\x80\x80\x80\x00\x00\x3f\x00\x0b\x87\x80\x80\x80\x00\x00\x20\x00\x40\x00\x1a\x0b");

// memory_size.wast:7
assert_return(() => call($1, "size", []), 0);

// memory_size.wast:8
assert_return(() => call($1, "grow", [1]));

// memory_size.wast:9
assert_return(() => call($1, "size", []), 1);

// memory_size.wast:10
assert_return(() => call($1, "grow", [4]));

// memory_size.wast:11
assert_return(() => call($1, "size", []), 5);

// memory_size.wast:12
assert_return(() => call($1, "grow", [0]));

// memory_size.wast:13
assert_return(() => call($1, "size", []), 5);

// memory_size.wast:15
let $2 = instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x89\x80\x80\x80\x00\x02\x60\x00\x01\x7f\x60\x01\x7f\x00\x03\x83\x80\x80\x80\x00\x02\x00\x01\x05\x83\x80\x80\x80\x00\x01\x00\x01\x07\x8f\x80\x80\x80\x00\x02\x04\x73\x69\x7a\x65\x00\x00\x04\x67\x72\x6f\x77\x00\x01\x0a\x96\x80\x80\x80\x00\x02\x84\x80\x80\x80\x00\x00\x3f\x00\x0b\x87\x80\x80\x80\x00\x00\x20\x00\x40\x00\x1a\x0b");

// memory_size.wast:21
assert_return(() => call($2, "size", []), 1);

// memory_size.wast:22
assert_return(() => call($2, "grow", [1]));

// memory_size.wast:23
assert_return(() => call($2, "size", []), 2);

// memory_size.wast:24
assert_return(() => call($2, "grow", [4]));

// memory_size.wast:25
assert_return(() => call($2, "size", []), 6);

// memory_size.wast:26
assert_return(() => call($2, "grow", [0]));

// memory_size.wast:27
assert_return(() => call($2, "size", []), 6);

// memory_size.wast:29
let $3 = instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x89\x80\x80\x80\x00\x02\x60\x00\x01\x7f\x60\x01\x7f\x00\x03\x83\x80\x80\x80\x00\x02\x00\x01\x05\x84\x80\x80\x80\x00\x01\x01\x00\x02\x07\x8f\x80\x80\x80\x00\x02\x04\x73\x69\x7a\x65\x00\x00\x04\x67\x72\x6f\x77\x00\x01\x0a\x96\x80\x80\x80\x00\x02\x84\x80\x80\x80\x00\x00\x3f\x00\x0b\x87\x80\x80\x80\x00\x00\x20\x00\x40\x00\x1a\x0b");

// memory_size.wast:35
assert_return(() => call($3, "size", []), 0);

// memory_size.wast:36
assert_return(() => call($3, "grow", [3]));

// memory_size.wast:37
assert_return(() => call($3, "size", []), 0);

// memory_size.wast:38
assert_return(() => call($3, "grow", [1]));

// memory_size.wast:39
assert_return(() => call($3, "size", []), 1);

// memory_size.wast:40
assert_return(() => call($3, "grow", [0]));

// memory_size.wast:41
assert_return(() => call($3, "size", []), 1);

// memory_size.wast:42
assert_return(() => call($3, "grow", [4]));

// memory_size.wast:43
assert_return(() => call($3, "size", []), 1);

// memory_size.wast:44
assert_return(() => call($3, "grow", [1]));

// memory_size.wast:45
assert_return(() => call($3, "size", []), 2);

// memory_size.wast:47
let $4 = instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x89\x80\x80\x80\x00\x02\x60\x00\x01\x7f\x60\x01\x7f\x00\x03\x83\x80\x80\x80\x00\x02\x00\x01\x05\x84\x80\x80\x80\x00\x01\x01\x03\x08\x07\x8f\x80\x80\x80\x00\x02\x04\x73\x69\x7a\x65\x00\x00\x04\x67\x72\x6f\x77\x00\x01\x0a\x96\x80\x80\x80\x00\x02\x84\x80\x80\x80\x00\x00\x3f\x00\x0b\x87\x80\x80\x80\x00\x00\x20\x00\x40\x00\x1a\x0b");

// memory_size.wast:53
assert_return(() => call($4, "size", []), 3);

// memory_size.wast:54
assert_return(() => call($4, "grow", [1]));

// memory_size.wast:55
assert_return(() => call($4, "size", []), 4);

// memory_size.wast:56
assert_return(() => call($4, "grow", [3]));

// memory_size.wast:57
assert_return(() => call($4, "size", []), 7);

// memory_size.wast:58
assert_return(() => call($4, "grow", [0]));

// memory_size.wast:59
assert_return(() => call($4, "size", []), 7);

// memory_size.wast:60
assert_return(() => call($4, "grow", [2]));

// memory_size.wast:61
assert_return(() => call($4, "size", []), 7);

// memory_size.wast:62
assert_return(() => call($4, "grow", [1]));

// memory_size.wast:63
assert_return(() => call($4, "size", []), 8);

// memory_size.wast:68
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x84\x80\x80\x80\x00\x01\x60\x00\x00\x03\x82\x80\x80\x80\x00\x01\x00\x05\x83\x80\x80\x80\x00\x01\x00\x01\x0a\x8a\x80\x80\x80\x00\x01\x84\x80\x80\x80\x00\x00\x3f\x00\x0b");

// memory_size.wast:77
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x85\x80\x80\x80\x00\x01\x60\x00\x01\x7d\x03\x82\x80\x80\x80\x00\x01\x00\x05\x83\x80\x80\x80\x00\x01\x00\x01\x0a\x8a\x80\x80\x80\x00\x01\x84\x80\x80\x80\x00\x00\x3f\x00\x0b");
