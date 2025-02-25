
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

// imports.wast:3
let $1 = instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x9e\x80\x80\x80\x00\x07\x60\x00\x00\x60\x01\x7f\x00\x60\x01\x7d\x00\x60\x00\x01\x7f\x60\x00\x01\x7d\x60\x01\x7f\x01\x7f\x60\x01\x7e\x01\x7e\x03\x88\x80\x80\x80\x00\x07\x00\x01\x02\x03\x04\x05\x06\x04\x84\x80\x80\x80\x00\x01\x70\x00\x0a\x05\x83\x80\x80\x80\x00\x01\x00\x02\x06\x8e\x80\x80\x80\x00\x02\x7f\x00\x41\x37\x0b\x7d\x00\x43\x00\x00\x30\x42\x0b\x07\x8e\x81\x80\x80\x00\x0b\x04\x66\x75\x6e\x63\x00\x00\x08\x66\x75\x6e\x63\x2d\x69\x33\x32\x00\x01\x08\x66\x75\x6e\x63\x2d\x66\x33\x32\x00\x02\x09\x66\x75\x6e\x63\x2d\x3e\x69\x33\x32\x00\x03\x09\x66\x75\x6e\x63\x2d\x3e\x66\x33\x32\x00\x04\x0d\x66\x75\x6e\x63\x2d\x69\x33\x32\x2d\x3e\x69\x33\x32\x00\x05\x0d\x66\x75\x6e\x63\x2d\x69\x36\x34\x2d\x3e\x69\x36\x34\x00\x06\x0a\x67\x6c\x6f\x62\x61\x6c\x2d\x69\x33\x32\x03\x00\x0a\x67\x6c\x6f\x62\x61\x6c\x2d\x66\x33\x32\x03\x01\x0c\x74\x61\x62\x6c\x65\x2d\x31\x30\x2d\x69\x6e\x66\x01\x00\x0c\x6d\x65\x6d\x6f\x72\x79\x2d\x32\x2d\x69\x6e\x66\x02\x00\x0a\xbd\x80\x80\x80\x00\x07\x82\x80\x80\x80\x00\x00\x0b\x82\x80\x80\x80\x00\x00\x0b\x82\x80\x80\x80\x00\x00\x0b\x84\x80\x80\x80\x00\x00\x41\x16\x0b\x87\x80\x80\x80\x00\x00\x43\x00\x00\x30\x41\x0b\x84\x80\x80\x80\x00\x00\x20\x00\x0b\x84\x80\x80\x80\x00\x00\x20\x00\x0b");

// imports.wast:19
register("test", $1)

// imports.wast:24
let $2 = instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\xa4\x80\x80\x80\x00\x08\x60\x01\x7f\x00\x60\x01\x7e\x00\x60\x01\x7d\x00\x60\x01\x7c\x00\x60\x01\x7f\x00\x60\x02\x7f\x7d\x00\x60\x02\x7c\x7c\x00\x60\x01\x7e\x01\x7e\x02\xd9\x82\x80\x80\x00\x10\x08\x73\x70\x65\x63\x74\x65\x73\x74\x09\x70\x72\x69\x6e\x74\x5f\x69\x33\x32\x00\x00\x08\x73\x70\x65\x63\x74\x65\x73\x74\x09\x70\x72\x69\x6e\x74\x5f\x69\x33\x32\x00\x00\x08\x73\x70\x65\x63\x74\x65\x73\x74\x09\x70\x72\x69\x6e\x74\x5f\x66\x33\x32\x00\x02\x08\x73\x70\x65\x63\x74\x65\x73\x74\x09\x70\x72\x69\x6e\x74\x5f\x66\x36\x34\x00\x03\x08\x73\x70\x65\x63\x74\x65\x73\x74\x0d\x70\x72\x69\x6e\x74\x5f\x69\x33\x32\x5f\x66\x33\x32\x00\x05\x08\x73\x70\x65\x63\x74\x65\x73\x74\x0d\x70\x72\x69\x6e\x74\x5f\x66\x36\x34\x5f\x66\x36\x34\x00\x06\x08\x73\x70\x65\x63\x74\x65\x73\x74\x09\x70\x72\x69\x6e\x74\x5f\x69\x33\x32\x00\x00\x08\x73\x70\x65\x63\x74\x65\x73\x74\x09\x70\x72\x69\x6e\x74\x5f\x66\x36\x34\x00\x03\x04\x74\x65\x73\x74\x0d\x66\x75\x6e\x63\x2d\x69\x36\x34\x2d\x3e\x69\x36\x34\x00\x07\x08\x73\x70\x65\x63\x74\x65\x73\x74\x09\x70\x72\x69\x6e\x74\x5f\x69\x33\x32\x00\x00\x08\x73\x70\x65\x63\x74\x65\x73\x74\x09\x70\x72\x69\x6e\x74\x5f\x69\x33\x32\x00\x00\x08\x73\x70\x65\x63\x74\x65\x73\x74\x09\x70\x72\x69\x6e\x74\x5f\x69\x33\x32\x00\x00\x08\x73\x70\x65\x63\x74\x65\x73\x74\x09\x70\x72\x69\x6e\x74\x5f\x69\x33\x32\x00\x00\x08\x73\x70\x65\x63\x74\x65\x73\x74\x09\x70\x72\x69\x6e\x74\x5f\x69\x33\x32\x00\x00\x08\x73\x70\x65\x63\x74\x65\x73\x74\x09\x70\x72\x69\x6e\x74\x5f\x69\x33\x32\x00\x04\x08\x73\x70\x65\x63\x74\x65\x73\x74\x09\x70\x72\x69\x6e\x74\x5f\x69\x33\x32\x00\x04\x03\x83\x80\x80\x80\x00\x02\x00\x01\x04\x85\x80\x80\x80\x00\x01\x70\x01\x02\x02\x07\xb3\x80\x80\x80\x00\x08\x02\x70\x31\x00\x09\x02\x70\x32\x00\x0a\x02\x70\x33\x00\x0b\x02\x70\x34\x00\x0b\x02\x70\x35\x00\x0c\x02\x70\x36\x00\x0d\x07\x70\x72\x69\x6e\x74\x33\x32\x00\x10\x07\x70\x72\x69\x6e\x74\x36\x34\x00\x11\x09\x88\x80\x80\x80\x00\x01\x00\x41\x00\x0b\x02\x01\x03\x0a\xe8\x80\x80\x80\x00\x02\xac\x80\x80\x80\x00\x01\x01\x7d\x20\x00\xb2\x21\x01\x20\x00\x10\x00\x20\x00\x41\x01\x6a\x43\x00\x00\x28\x42\x10\x04\x20\x00\x10\x01\x20\x00\x10\x06\x20\x01\x10\x02\x20\x00\x41\x00\x11\x00\x00\x0b\xb1\x80\x80\x80\x00\x01\x01\x7c\x20\x00\x10\x08\xb9\x21\x01\x20\x01\x44\x00\x00\x00\x00\x00\x00\xf0\x3f\xa0\x44\x00\x00\x00\x00\x00\x80\x4a\x40\x10\x05\x20\x01\x10\x03\x20\x01\x10\x07\x20\x01\x41\x01\x11\x03\x00\x0b");

// imports.wast:87
assert_return(() => call($2, "print32", [13]));

// imports.wast:88
run(() => call(instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x88\x80\x80\x80\x00\x02\x60\x00\x00\x60\x01\x7e\x00\x02\x8e\x80\x80\x80\x00\x01\x02\x24\x32\x07\x70\x72\x69\x6e\x74\x36\x34\x00\x01\x03\x82\x80\x80\x80\x00\x01\x00\x07\x87\x80\x80\x80\x00\x01\x03\x72\x75\x6e\x00\x01\x0a\x91\x80\x80\x80\x00\x01\x8b\x80\x80\x80\x00\x00\x02\x40\x42\x18\x10\x00\x0f\x0b\x00\x0b", exports("$2", $2)),  "run", []));  // assert_return(() => call($2, "print64", [int64("24")]))

// imports.wast:90
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x85\x80\x80\x80\x00\x01\x60\x00\x01\x7f\x02\x8d\x80\x80\x80\x00\x01\x04\x74\x65\x73\x74\x04\x66\x75\x6e\x63\x00\x01");

// imports.wast:98
let $3 = instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x84\x80\x80\x80\x00\x01\x60\x00\x00\x02\x8d\x80\x80\x80\x00\x01\x04\x74\x65\x73\x74\x04\x66\x75\x6e\x63\x00\x00");

// imports.wast:99
let $4 = instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x85\x80\x80\x80\x00\x01\x60\x01\x7f\x00\x02\x91\x80\x80\x80\x00\x01\x04\x74\x65\x73\x74\x08\x66\x75\x6e\x63\x2d\x69\x33\x32\x00\x00");

// imports.wast:100
let $5 = instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x85\x80\x80\x80\x00\x01\x60\x01\x7d\x00\x02\x91\x80\x80\x80\x00\x01\x04\x74\x65\x73\x74\x08\x66\x75\x6e\x63\x2d\x66\x33\x32\x00\x00");

// imports.wast:101
let $6 = instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x85\x80\x80\x80\x00\x01\x60\x00\x01\x7f\x02\x92\x80\x80\x80\x00\x01\x04\x74\x65\x73\x74\x09\x66\x75\x6e\x63\x2d\x3e\x69\x33\x32\x00\x00");

// imports.wast:102
let $7 = instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x85\x80\x80\x80\x00\x01\x60\x00\x01\x7d\x02\x92\x80\x80\x80\x00\x01\x04\x74\x65\x73\x74\x09\x66\x75\x6e\x63\x2d\x3e\x66\x33\x32\x00\x00");

// imports.wast:103
let $8 = instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x86\x80\x80\x80\x00\x01\x60\x01\x7f\x01\x7f\x02\x96\x80\x80\x80\x00\x01\x04\x74\x65\x73\x74\x0d\x66\x75\x6e\x63\x2d\x69\x33\x32\x2d\x3e\x69\x33\x32\x00\x00");

// imports.wast:104
let $9 = instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x86\x80\x80\x80\x00\x01\x60\x01\x7e\x01\x7e\x02\x96\x80\x80\x80\x00\x01\x04\x74\x65\x73\x74\x0d\x66\x75\x6e\x63\x2d\x69\x36\x34\x2d\x3e\x69\x36\x34\x00\x00");

// imports.wast:106
assert_unlinkable("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x84\x80\x80\x80\x00\x01\x60\x00\x00\x02\x90\x80\x80\x80\x00\x01\x04\x74\x65\x73\x74\x07\x75\x6e\x6b\x6e\x6f\x77\x6e\x00\x00");

// imports.wast:110
assert_unlinkable("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x84\x80\x80\x80\x00\x01\x60\x00\x00\x02\x94\x80\x80\x80\x00\x01\x08\x73\x70\x65\x63\x74\x65\x73\x74\x07\x75\x6e\x6b\x6e\x6f\x77\x6e\x00\x00");

// imports.wast:115
assert_unlinkable("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x85\x80\x80\x80\x00\x01\x60\x01\x7f\x00\x02\x8d\x80\x80\x80\x00\x01\x04\x74\x65\x73\x74\x04\x66\x75\x6e\x63\x00\x00");

// imports.wast:119
assert_unlinkable("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x85\x80\x80\x80\x00\x01\x60\x00\x01\x7f\x02\x8d\x80\x80\x80\x00\x01\x04\x74\x65\x73\x74\x04\x66\x75\x6e\x63\x00\x00");

// imports.wast:123
assert_unlinkable("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x86\x80\x80\x80\x00\x01\x60\x01\x7f\x01\x7f\x02\x8d\x80\x80\x80\x00\x01\x04\x74\x65\x73\x74\x04\x66\x75\x6e\x63\x00\x00");

// imports.wast:127
assert_unlinkable("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x84\x80\x80\x80\x00\x01\x60\x00\x00\x02\x91\x80\x80\x80\x00\x01\x04\x74\x65\x73\x74\x08\x66\x75\x6e\x63\x2d\x69\x33\x32\x00\x00");

// imports.wast:131
assert_unlinkable("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x85\x80\x80\x80\x00\x01\x60\x00\x01\x7f\x02\x91\x80\x80\x80\x00\x01\x04\x74\x65\x73\x74\x08\x66\x75\x6e\x63\x2d\x69\x33\x32\x00\x00");

// imports.wast:135
assert_unlinkable("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x85\x80\x80\x80\x00\x01\x60\x01\x7d\x00\x02\x91\x80\x80\x80\x00\x01\x04\x74\x65\x73\x74\x08\x66\x75\x6e\x63\x2d\x69\x33\x32\x00\x00");

// imports.wast:139
assert_unlinkable("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x85\x80\x80\x80\x00\x01\x60\x01\x7e\x00\x02\x91\x80\x80\x80\x00\x01\x04\x74\x65\x73\x74\x08\x66\x75\x6e\x63\x2d\x69\x33\x32\x00\x00");

// imports.wast:143
assert_unlinkable("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x86\x80\x80\x80\x00\x01\x60\x01\x7f\x01\x7f\x02\x91\x80\x80\x80\x00\x01\x04\x74\x65\x73\x74\x08\x66\x75\x6e\x63\x2d\x69\x33\x32\x00\x00");

// imports.wast:147
assert_unlinkable("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x84\x80\x80\x80\x00\x01\x60\x00\x00\x02\x92\x80\x80\x80\x00\x01\x04\x74\x65\x73\x74\x09\x66\x75\x6e\x63\x2d\x3e\x69\x33\x32\x00\x00");

// imports.wast:151
assert_unlinkable("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x85\x80\x80\x80\x00\x01\x60\x01\x7f\x00\x02\x92\x80\x80\x80\x00\x01\x04\x74\x65\x73\x74\x09\x66\x75\x6e\x63\x2d\x3e\x69\x33\x32\x00\x00");

// imports.wast:155
assert_unlinkable("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x85\x80\x80\x80\x00\x01\x60\x00\x01\x7d\x02\x92\x80\x80\x80\x00\x01\x04\x74\x65\x73\x74\x09\x66\x75\x6e\x63\x2d\x3e\x69\x33\x32\x00\x00");

// imports.wast:159
assert_unlinkable("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x85\x80\x80\x80\x00\x01\x60\x00\x01\x7e\x02\x92\x80\x80\x80\x00\x01\x04\x74\x65\x73\x74\x09\x66\x75\x6e\x63\x2d\x3e\x69\x33\x32\x00\x00");

// imports.wast:163
assert_unlinkable("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x86\x80\x80\x80\x00\x01\x60\x01\x7f\x01\x7f\x02\x92\x80\x80\x80\x00\x01\x04\x74\x65\x73\x74\x09\x66\x75\x6e\x63\x2d\x3e\x69\x33\x32\x00\x00");

// imports.wast:167
assert_unlinkable("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x84\x80\x80\x80\x00\x01\x60\x00\x00\x02\x96\x80\x80\x80\x00\x01\x04\x74\x65\x73\x74\x0d\x66\x75\x6e\x63\x2d\x69\x33\x32\x2d\x3e\x69\x33\x32\x00\x00");

// imports.wast:171
assert_unlinkable("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x85\x80\x80\x80\x00\x01\x60\x01\x7f\x00\x02\x96\x80\x80\x80\x00\x01\x04\x74\x65\x73\x74\x0d\x66\x75\x6e\x63\x2d\x69\x33\x32\x2d\x3e\x69\x33\x32\x00\x00");

// imports.wast:175
assert_unlinkable("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x85\x80\x80\x80\x00\x01\x60\x00\x01\x7f\x02\x96\x80\x80\x80\x00\x01\x04\x74\x65\x73\x74\x0d\x66\x75\x6e\x63\x2d\x69\x33\x32\x2d\x3e\x69\x33\x32\x00\x00");

// imports.wast:180
assert_unlinkable("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x85\x80\x80\x80\x00\x01\x60\x00\x01\x7f\x02\x93\x80\x80\x80\x00\x01\x04\x74\x65\x73\x74\x0a\x67\x6c\x6f\x62\x61\x6c\x2d\x69\x33\x32\x00\x00");

// imports.wast:184
assert_unlinkable("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x84\x80\x80\x80\x00\x01\x60\x00\x00\x02\x95\x80\x80\x80\x00\x01\x04\x74\x65\x73\x74\x0c\x74\x61\x62\x6c\x65\x2d\x31\x30\x2d\x69\x6e\x66\x00\x00");

// imports.wast:188
assert_unlinkable("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x84\x80\x80\x80\x00\x01\x60\x00\x00\x02\x95\x80\x80\x80\x00\x01\x04\x74\x65\x73\x74\x0c\x6d\x65\x6d\x6f\x72\x79\x2d\x32\x2d\x69\x6e\x66\x00\x00");

// imports.wast:192
assert_unlinkable("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x84\x80\x80\x80\x00\x01\x60\x00\x00\x02\x97\x80\x80\x80\x00\x01\x08\x73\x70\x65\x63\x74\x65\x73\x74\x0a\x67\x6c\x6f\x62\x61\x6c\x5f\x69\x33\x32\x00\x00");

// imports.wast:196
assert_unlinkable("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x84\x80\x80\x80\x00\x01\x60\x00\x00\x02\x92\x80\x80\x80\x00\x01\x08\x73\x70\x65\x63\x74\x65\x73\x74\x05\x74\x61\x62\x6c\x65\x00\x00");

// imports.wast:200
assert_unlinkable("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x84\x80\x80\x80\x00\x01\x60\x00\x00\x02\x93\x80\x80\x80\x00\x01\x08\x73\x70\x65\x63\x74\x65\x73\x74\x06\x6d\x65\x6d\x6f\x72\x79\x00\x00");

// imports.wast:208
let $10 = instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x85\x80\x80\x80\x00\x01\x60\x00\x01\x7f\x02\x8b\x81\x80\x80\x00\x06\x08\x73\x70\x65\x63\x74\x65\x73\x74\x0a\x67\x6c\x6f\x62\x61\x6c\x5f\x69\x33\x32\x03\x7f\x00\x08\x73\x70\x65\x63\x74\x65\x73\x74\x0a\x67\x6c\x6f\x62\x61\x6c\x5f\x69\x33\x32\x03\x7f\x00\x08\x73\x70\x65\x63\x74\x65\x73\x74\x0a\x67\x6c\x6f\x62\x61\x6c\x5f\x69\x33\x32\x03\x7f\x00\x08\x73\x70\x65\x63\x74\x65\x73\x74\x0a\x67\x6c\x6f\x62\x61\x6c\x5f\x69\x33\x32\x03\x7f\x00\x08\x73\x70\x65\x63\x74\x65\x73\x74\x0a\x67\x6c\x6f\x62\x61\x6c\x5f\x66\x33\x32\x03\x7d\x00\x08\x73\x70\x65\x63\x74\x65\x73\x74\x0a\x67\x6c\x6f\x62\x61\x6c\x5f\x66\x36\x34\x03\x7c\x00\x03\x85\x80\x80\x80\x00\x04\x00\x00\x00\x00\x07\xa1\x80\x80\x80\x00\x04\x05\x67\x65\x74\x2d\x30\x00\x00\x05\x67\x65\x74\x2d\x31\x00\x01\x05\x67\x65\x74\x2d\x78\x00\x02\x05\x67\x65\x74\x2d\x79\x00\x03\x0a\xa5\x80\x80\x80\x00\x04\x84\x80\x80\x80\x00\x00\x23\x00\x0b\x84\x80\x80\x80\x00\x00\x23\x01\x0b\x84\x80\x80\x80\x00\x00\x23\x02\x0b\x84\x80\x80\x80\x00\x00\x23\x03\x0b");

// imports.wast:226
assert_return(() => call($10, "get-0", []), 666);

// imports.wast:227
assert_return(() => call($10, "get-1", []), 666);

// imports.wast:228
assert_return(() => call($10, "get-x", []), 666);

// imports.wast:229
assert_return(() => call($10, "get-y", []), 666);

// imports.wast:231
let $11 = instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x02\x94\x80\x80\x80\x00\x01\x04\x74\x65\x73\x74\x0a\x67\x6c\x6f\x62\x61\x6c\x2d\x69\x33\x32\x03\x7f\x00");

// imports.wast:232
let $12 = instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x02\x94\x80\x80\x80\x00\x01\x04\x74\x65\x73\x74\x0a\x67\x6c\x6f\x62\x61\x6c\x2d\x66\x33\x32\x03\x7d\x00");

// imports.wast:234
assert_unlinkable("\x00\x61\x73\x6d\x01\x00\x00\x00\x02\x91\x80\x80\x80\x00\x01\x04\x74\x65\x73\x74\x07\x75\x6e\x6b\x6e\x6f\x77\x6e\x03\x7f\x00");

// imports.wast:238
assert_unlinkable("\x00\x61\x73\x6d\x01\x00\x00\x00\x02\x95\x80\x80\x80\x00\x01\x08\x73\x70\x65\x63\x74\x65\x73\x74\x07\x75\x6e\x6b\x6e\x6f\x77\x6e\x03\x7f\x00");

// imports.wast:243
assert_unlinkable("\x00\x61\x73\x6d\x01\x00\x00\x00\x02\x8e\x80\x80\x80\x00\x01\x04\x74\x65\x73\x74\x04\x66\x75\x6e\x63\x03\x7f\x00");

// imports.wast:247
assert_unlinkable("\x00\x61\x73\x6d\x01\x00\x00\x00\x02\x96\x80\x80\x80\x00\x01\x04\x74\x65\x73\x74\x0c\x74\x61\x62\x6c\x65\x2d\x31\x30\x2d\x69\x6e\x66\x03\x7f\x00");

// imports.wast:251
assert_unlinkable("\x00\x61\x73\x6d\x01\x00\x00\x00\x02\x96\x80\x80\x80\x00\x01\x04\x74\x65\x73\x74\x0c\x6d\x65\x6d\x6f\x72\x79\x2d\x32\x2d\x69\x6e\x66\x03\x7f\x00");

// imports.wast:255
assert_unlinkable("\x00\x61\x73\x6d\x01\x00\x00\x00\x02\x97\x80\x80\x80\x00\x01\x08\x73\x70\x65\x63\x74\x65\x73\x74\x09\x70\x72\x69\x6e\x74\x5f\x69\x33\x32\x03\x7f\x00");

// imports.wast:259
assert_unlinkable("\x00\x61\x73\x6d\x01\x00\x00\x00\x02\x93\x80\x80\x80\x00\x01\x08\x73\x70\x65\x63\x74\x65\x73\x74\x05\x74\x61\x62\x6c\x65\x03\x7f\x00");

// imports.wast:263
assert_unlinkable("\x00\x61\x73\x6d\x01\x00\x00\x00\x02\x94\x80\x80\x80\x00\x01\x08\x73\x70\x65\x63\x74\x65\x73\x74\x06\x6d\x65\x6d\x6f\x72\x79\x03\x7f\x00");

// imports.wast:271
let $13 = instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x8a\x80\x80\x80\x00\x02\x60\x00\x01\x7f\x60\x01\x7f\x01\x7f\x02\x95\x80\x80\x80\x00\x01\x08\x73\x70\x65\x63\x74\x65\x73\x74\x05\x74\x61\x62\x6c\x65\x01\x70\x01\x0a\x14\x03\x84\x80\x80\x80\x00\x03\x01\x00\x00\x07\x88\x80\x80\x80\x00\x01\x04\x63\x61\x6c\x6c\x00\x00\x09\x88\x80\x80\x80\x00\x01\x00\x41\x01\x0b\x02\x01\x02\x0a\x9f\x80\x80\x80\x00\x03\x87\x80\x80\x80\x00\x00\x20\x00\x11\x00\x00\x0b\x84\x80\x80\x80\x00\x00\x41\x0b\x0b\x84\x80\x80\x80\x00\x00\x41\x16\x0b");

// imports.wast:283
assert_trap(() => call($13, "call", [0]));

// imports.wast:284
assert_return(() => call($13, "call", [1]), 11);

// imports.wast:285
assert_return(() => call($13, "call", [2]), 22);

// imports.wast:286
assert_trap(() => call($13, "call", [3]));

// imports.wast:287
assert_trap(() => call($13, "call", [100]));

// imports.wast:290
let $14 = instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x8a\x80\x80\x80\x00\x02\x60\x00\x01\x7f\x60\x01\x7f\x01\x7f\x02\x95\x80\x80\x80\x00\x01\x08\x73\x70\x65\x63\x74\x65\x73\x74\x05\x74\x61\x62\x6c\x65\x01\x70\x01\x0a\x14\x03\x84\x80\x80\x80\x00\x03\x01\x00\x00\x07\x88\x80\x80\x80\x00\x01\x04\x63\x61\x6c\x6c\x00\x00\x09\x88\x80\x80\x80\x00\x01\x00\x41\x01\x0b\x02\x01\x02\x0a\x9f\x80\x80\x80\x00\x03\x87\x80\x80\x80\x00\x00\x20\x00\x11\x00\x00\x0b\x84\x80\x80\x80\x00\x00\x41\x0b\x0b\x84\x80\x80\x80\x00\x00\x41\x16\x0b");

// imports.wast:302
assert_trap(() => call($14, "call", [0]));

// imports.wast:303
assert_return(() => call($14, "call", [1]), 11);

// imports.wast:304
assert_return(() => call($14, "call", [2]), 22);

// imports.wast:305
assert_trap(() => call($14, "call", [3]));

// imports.wast:306
assert_trap(() => call($14, "call", [100]));

// imports.wast:309
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x02\x8d\x80\x80\x80\x00\x02\x00\x00\x01\x70\x00\x0a\x00\x00\x01\x70\x00\x0a");

// imports.wast:313
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x02\x87\x80\x80\x80\x00\x01\x00\x00\x01\x70\x00\x0a\x04\x84\x80\x80\x80\x00\x01\x70\x00\x0a");

// imports.wast:317
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x04\x87\x80\x80\x80\x00\x02\x70\x00\x0a\x70\x00\x0a");

// imports.wast:322
let $15 = instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x02\x97\x80\x80\x80\x00\x01\x04\x74\x65\x73\x74\x0c\x74\x61\x62\x6c\x65\x2d\x31\x30\x2d\x69\x6e\x66\x01\x70\x00\x0a");

// imports.wast:323
let $16 = instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x02\x97\x80\x80\x80\x00\x01\x04\x74\x65\x73\x74\x0c\x74\x61\x62\x6c\x65\x2d\x31\x30\x2d\x69\x6e\x66\x01\x70\x00\x05");

// imports.wast:324
let $17 = instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x02\x97\x80\x80\x80\x00\x01\x04\x74\x65\x73\x74\x0c\x74\x61\x62\x6c\x65\x2d\x31\x30\x2d\x69\x6e\x66\x01\x70\x00\x00");

// imports.wast:325
let $18 = instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x02\x94\x80\x80\x80\x00\x01\x08\x73\x70\x65\x63\x74\x65\x73\x74\x05\x74\x61\x62\x6c\x65\x01\x70\x00\x0a");

// imports.wast:326
let $19 = instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x02\x94\x80\x80\x80\x00\x01\x08\x73\x70\x65\x63\x74\x65\x73\x74\x05\x74\x61\x62\x6c\x65\x01\x70\x00\x05");

// imports.wast:327
let $20 = instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x02\x94\x80\x80\x80\x00\x01\x08\x73\x70\x65\x63\x74\x65\x73\x74\x05\x74\x61\x62\x6c\x65\x01\x70\x00\x00");

// imports.wast:328
let $21 = instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x02\x95\x80\x80\x80\x00\x01\x08\x73\x70\x65\x63\x74\x65\x73\x74\x05\x74\x61\x62\x6c\x65\x01\x70\x01\x0a\x14");

// imports.wast:329
let $22 = instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x02\x95\x80\x80\x80\x00\x01\x08\x73\x70\x65\x63\x74\x65\x73\x74\x05\x74\x61\x62\x6c\x65\x01\x70\x01\x05\x14");

// imports.wast:330
let $23 = instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x02\x95\x80\x80\x80\x00\x01\x08\x73\x70\x65\x63\x74\x65\x73\x74\x05\x74\x61\x62\x6c\x65\x01\x70\x01\x00\x14");

// imports.wast:331
let $24 = instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x02\x95\x80\x80\x80\x00\x01\x08\x73\x70\x65\x63\x74\x65\x73\x74\x05\x74\x61\x62\x6c\x65\x01\x70\x01\x0a\x19");

// imports.wast:332
let $25 = instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x02\x95\x80\x80\x80\x00\x01\x08\x73\x70\x65\x63\x74\x65\x73\x74\x05\x74\x61\x62\x6c\x65\x01\x70\x01\x05\x19");

// imports.wast:334
assert_unlinkable("\x00\x61\x73\x6d\x01\x00\x00\x00\x02\x92\x80\x80\x80\x00\x01\x04\x74\x65\x73\x74\x07\x75\x6e\x6b\x6e\x6f\x77\x6e\x01\x70\x00\x0a");

// imports.wast:338
assert_unlinkable("\x00\x61\x73\x6d\x01\x00\x00\x00\x02\x96\x80\x80\x80\x00\x01\x08\x73\x70\x65\x63\x74\x65\x73\x74\x07\x75\x6e\x6b\x6e\x6f\x77\x6e\x01\x70\x00\x0a");

// imports.wast:343
assert_unlinkable("\x00\x61\x73\x6d\x01\x00\x00\x00\x02\x97\x80\x80\x80\x00\x01\x04\x74\x65\x73\x74\x0c\x74\x61\x62\x6c\x65\x2d\x31\x30\x2d\x69\x6e\x66\x01\x70\x00\x0c");

// imports.wast:347
assert_unlinkable("\x00\x61\x73\x6d\x01\x00\x00\x00\x02\x98\x80\x80\x80\x00\x01\x04\x74\x65\x73\x74\x0c\x74\x61\x62\x6c\x65\x2d\x31\x30\x2d\x69\x6e\x66\x01\x70\x01\x0a\x14");

// imports.wast:351
assert_unlinkable("\x00\x61\x73\x6d\x01\x00\x00\x00\x02\x94\x80\x80\x80\x00\x01\x08\x73\x70\x65\x63\x74\x65\x73\x74\x05\x74\x61\x62\x6c\x65\x01\x70\x00\x0c");

// imports.wast:355
assert_unlinkable("\x00\x61\x73\x6d\x01\x00\x00\x00\x02\x95\x80\x80\x80\x00\x01\x08\x73\x70\x65\x63\x74\x65\x73\x74\x05\x74\x61\x62\x6c\x65\x01\x70\x01\x0a\x0f");

// imports.wast:360
assert_unlinkable("\x00\x61\x73\x6d\x01\x00\x00\x00\x02\x8f\x80\x80\x80\x00\x01\x04\x74\x65\x73\x74\x04\x66\x75\x6e\x63\x01\x70\x00\x0a");

// imports.wast:364
assert_unlinkable("\x00\x61\x73\x6d\x01\x00\x00\x00\x02\x95\x80\x80\x80\x00\x01\x04\x74\x65\x73\x74\x0a\x67\x6c\x6f\x62\x61\x6c\x2d\x69\x33\x32\x01\x70\x00\x0a");

// imports.wast:368
assert_unlinkable("\x00\x61\x73\x6d\x01\x00\x00\x00\x02\x97\x80\x80\x80\x00\x01\x04\x74\x65\x73\x74\x0c\x6d\x65\x6d\x6f\x72\x79\x2d\x32\x2d\x69\x6e\x66\x01\x70\x00\x0a");

// imports.wast:372
assert_unlinkable("\x00\x61\x73\x6d\x01\x00\x00\x00\x02\x98\x80\x80\x80\x00\x01\x08\x73\x70\x65\x63\x74\x65\x73\x74\x09\x70\x72\x69\x6e\x74\x5f\x69\x33\x32\x01\x70\x00\x0a");

// imports.wast:381
let $26 = instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x86\x80\x80\x80\x00\x01\x60\x01\x7f\x01\x7f\x02\x95\x80\x80\x80\x00\x01\x08\x73\x70\x65\x63\x74\x65\x73\x74\x06\x6d\x65\x6d\x6f\x72\x79\x02\x01\x01\x02\x03\x82\x80\x80\x80\x00\x01\x00\x07\x88\x80\x80\x80\x00\x01\x04\x6c\x6f\x61\x64\x00\x00\x0a\x8d\x80\x80\x80\x00\x01\x87\x80\x80\x80\x00\x00\x20\x00\x28\x02\x00\x0b\x0b\x87\x80\x80\x80\x00\x01\x00\x41\x0a\x0b\x01\x10");

// imports.wast:388
assert_return(() => call($26, "load", [0]), 0);

// imports.wast:389
assert_return(() => call($26, "load", [10]), 16);

// imports.wast:390
assert_return(() => call($26, "load", [8]), 1048576);

// imports.wast:391
assert_trap(() => call($26, "load", [1000000]));

// imports.wast:393
let $27 = instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x86\x80\x80\x80\x00\x01\x60\x01\x7f\x01\x7f\x02\x95\x80\x80\x80\x00\x01\x08\x73\x70\x65\x63\x74\x65\x73\x74\x06\x6d\x65\x6d\x6f\x72\x79\x02\x01\x01\x02\x03\x82\x80\x80\x80\x00\x01\x00\x07\x88\x80\x80\x80\x00\x01\x04\x6c\x6f\x61\x64\x00\x00\x0a\x8d\x80\x80\x80\x00\x01\x87\x80\x80\x80\x00\x00\x20\x00\x28\x02\x00\x0b\x0b\x87\x80\x80\x80\x00\x01\x00\x41\x0a\x0b\x01\x10");

// imports.wast:399
assert_return(() => call($27, "load", [0]), 0);

// imports.wast:400
assert_return(() => call($27, "load", [10]), 16);

// imports.wast:401
assert_return(() => call($27, "load", [8]), 1048576);

// imports.wast:402
assert_trap(() => call($27, "load", [1000000]));

// imports.wast:404
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x02\x8b\x80\x80\x80\x00\x02\x00\x00\x02\x00\x01\x00\x00\x02\x00\x01");

// imports.wast:408
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x02\x86\x80\x80\x80\x00\x01\x00\x00\x02\x00\x01\x05\x83\x80\x80\x80\x00\x01\x00\x00");

// imports.wast:412
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x05\x85\x80\x80\x80\x00\x02\x00\x00\x00\x00");

// imports.wast:417
let $28 = instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x02\x96\x80\x80\x80\x00\x01\x04\x74\x65\x73\x74\x0c\x6d\x65\x6d\x6f\x72\x79\x2d\x32\x2d\x69\x6e\x66\x02\x00\x02");

// imports.wast:418
let $29 = instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x02\x96\x80\x80\x80\x00\x01\x04\x74\x65\x73\x74\x0c\x6d\x65\x6d\x6f\x72\x79\x2d\x32\x2d\x69\x6e\x66\x02\x00\x01");

// imports.wast:419
let $30 = instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x02\x96\x80\x80\x80\x00\x01\x04\x74\x65\x73\x74\x0c\x6d\x65\x6d\x6f\x72\x79\x2d\x32\x2d\x69\x6e\x66\x02\x00\x00");

// imports.wast:420
let $31 = instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x02\x94\x80\x80\x80\x00\x01\x08\x73\x70\x65\x63\x74\x65\x73\x74\x06\x6d\x65\x6d\x6f\x72\x79\x02\x00\x01");

// imports.wast:421
let $32 = instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x02\x94\x80\x80\x80\x00\x01\x08\x73\x70\x65\x63\x74\x65\x73\x74\x06\x6d\x65\x6d\x6f\x72\x79\x02\x00\x00");

// imports.wast:422
let $33 = instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x02\x95\x80\x80\x80\x00\x01\x08\x73\x70\x65\x63\x74\x65\x73\x74\x06\x6d\x65\x6d\x6f\x72\x79\x02\x01\x01\x02");

// imports.wast:423
let $34 = instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x02\x95\x80\x80\x80\x00\x01\x08\x73\x70\x65\x63\x74\x65\x73\x74\x06\x6d\x65\x6d\x6f\x72\x79\x02\x01\x00\x02");

// imports.wast:424
let $35 = instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x02\x95\x80\x80\x80\x00\x01\x08\x73\x70\x65\x63\x74\x65\x73\x74\x06\x6d\x65\x6d\x6f\x72\x79\x02\x01\x01\x03");

// imports.wast:425
let $36 = instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x02\x95\x80\x80\x80\x00\x01\x08\x73\x70\x65\x63\x74\x65\x73\x74\x06\x6d\x65\x6d\x6f\x72\x79\x02\x01\x00\x03");

// imports.wast:427
assert_unlinkable("\x00\x61\x73\x6d\x01\x00\x00\x00\x02\x91\x80\x80\x80\x00\x01\x04\x74\x65\x73\x74\x07\x75\x6e\x6b\x6e\x6f\x77\x6e\x02\x00\x01");

// imports.wast:431
assert_unlinkable("\x00\x61\x73\x6d\x01\x00\x00\x00\x02\x95\x80\x80\x80\x00\x01\x08\x73\x70\x65\x63\x74\x65\x73\x74\x07\x75\x6e\x6b\x6e\x6f\x77\x6e\x02\x00\x01");

// imports.wast:436
assert_unlinkable("\x00\x61\x73\x6d\x01\x00\x00\x00\x02\x96\x80\x80\x80\x00\x01\x04\x74\x65\x73\x74\x0c\x6d\x65\x6d\x6f\x72\x79\x2d\x32\x2d\x69\x6e\x66\x02\x00\x03");

// imports.wast:440
assert_unlinkable("\x00\x61\x73\x6d\x01\x00\x00\x00\x02\x97\x80\x80\x80\x00\x01\x04\x74\x65\x73\x74\x0c\x6d\x65\x6d\x6f\x72\x79\x2d\x32\x2d\x69\x6e\x66\x02\x01\x02\x03");

// imports.wast:444
assert_unlinkable("\x00\x61\x73\x6d\x01\x00\x00\x00\x02\x94\x80\x80\x80\x00\x01\x08\x73\x70\x65\x63\x74\x65\x73\x74\x06\x6d\x65\x6d\x6f\x72\x79\x02\x00\x02");

// imports.wast:448
assert_unlinkable("\x00\x61\x73\x6d\x01\x00\x00\x00\x02\x95\x80\x80\x80\x00\x01\x08\x73\x70\x65\x63\x74\x65\x73\x74\x06\x6d\x65\x6d\x6f\x72\x79\x02\x01\x01\x01");

// imports.wast:453
assert_unlinkable("\x00\x61\x73\x6d\x01\x00\x00\x00\x02\x92\x80\x80\x80\x00\x01\x04\x74\x65\x73\x74\x08\x66\x75\x6e\x63\x2d\x69\x33\x32\x02\x00\x01");

// imports.wast:457
assert_unlinkable("\x00\x61\x73\x6d\x01\x00\x00\x00\x02\x94\x80\x80\x80\x00\x01\x04\x74\x65\x73\x74\x0a\x67\x6c\x6f\x62\x61\x6c\x2d\x69\x33\x32\x02\x00\x01");

// imports.wast:461
assert_unlinkable("\x00\x61\x73\x6d\x01\x00\x00\x00\x02\x96\x80\x80\x80\x00\x01\x04\x74\x65\x73\x74\x0c\x74\x61\x62\x6c\x65\x2d\x31\x30\x2d\x69\x6e\x66\x02\x00\x01");

// imports.wast:465
assert_unlinkable("\x00\x61\x73\x6d\x01\x00\x00\x00\x02\x97\x80\x80\x80\x00\x01\x08\x73\x70\x65\x63\x74\x65\x73\x74\x09\x70\x72\x69\x6e\x74\x5f\x69\x33\x32\x02\x00\x01");

// imports.wast:469
assert_unlinkable("\x00\x61\x73\x6d\x01\x00\x00\x00\x02\x98\x80\x80\x80\x00\x01\x08\x73\x70\x65\x63\x74\x65\x73\x74\x0a\x67\x6c\x6f\x62\x61\x6c\x5f\x69\x33\x32\x02\x00\x01");

// imports.wast:473
assert_unlinkable("\x00\x61\x73\x6d\x01\x00\x00\x00\x02\x93\x80\x80\x80\x00\x01\x08\x73\x70\x65\x63\x74\x65\x73\x74\x05\x74\x61\x62\x6c\x65\x02\x00\x01");

// imports.wast:478
assert_unlinkable("\x00\x61\x73\x6d\x01\x00\x00\x00\x02\x94\x80\x80\x80\x00\x01\x08\x73\x70\x65\x63\x74\x65\x73\x74\x06\x6d\x65\x6d\x6f\x72\x79\x02\x00\x02");

// imports.wast:482
assert_unlinkable("\x00\x61\x73\x6d\x01\x00\x00\x00\x02\x95\x80\x80\x80\x00\x01\x08\x73\x70\x65\x63\x74\x65\x73\x74\x06\x6d\x65\x6d\x6f\x72\x79\x02\x01\x01\x01");

// imports.wast:487
let $37 = instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x86\x80\x80\x80\x00\x01\x60\x01\x7f\x01\x7f\x02\x95\x80\x80\x80\x00\x01\x08\x73\x70\x65\x63\x74\x65\x73\x74\x06\x6d\x65\x6d\x6f\x72\x79\x02\x01\x00\x03\x03\x82\x80\x80\x80\x00\x01\x00\x07\x88\x80\x80\x80\x00\x01\x04\x67\x72\x6f\x77\x00\x00\x0a\x8c\x80\x80\x80\x00\x01\x86\x80\x80\x80\x00\x00\x20\x00\x40\x00\x0b");

// imports.wast:491
assert_return(() => call($37, "grow", [0]), 1);

// imports.wast:492
assert_return(() => call($37, "grow", [1]), 1);

// imports.wast:493
assert_return(() => call($37, "grow", [0]), 2);

// imports.wast:494
assert_return(() => call($37, "grow", [1]), -1);

// imports.wast:495
assert_return(() => call($37, "grow", [0]), 2);

// imports.wast:500
assert_malformed("\x3c\x6d\x61\x6c\x66\x6f\x72\x6d\x65\x64\x20\x71\x75\x6f\x74\x65\x3e");

// imports.wast:504
assert_malformed("\x3c\x6d\x61\x6c\x66\x6f\x72\x6d\x65\x64\x20\x71\x75\x6f\x74\x65\x3e");

// imports.wast:508
assert_malformed("\x3c\x6d\x61\x6c\x66\x6f\x72\x6d\x65\x64\x20\x71\x75\x6f\x74\x65\x3e");

// imports.wast:512
assert_malformed("\x3c\x6d\x61\x6c\x66\x6f\x72\x6d\x65\x64\x20\x71\x75\x6f\x74\x65\x3e");

// imports.wast:517
assert_malformed("\x3c\x6d\x61\x6c\x66\x6f\x72\x6d\x65\x64\x20\x71\x75\x6f\x74\x65\x3e");

// imports.wast:521
assert_malformed("\x3c\x6d\x61\x6c\x66\x6f\x72\x6d\x65\x64\x20\x71\x75\x6f\x74\x65\x3e");

// imports.wast:525
assert_malformed("\x3c\x6d\x61\x6c\x66\x6f\x72\x6d\x65\x64\x20\x71\x75\x6f\x74\x65\x3e");

// imports.wast:529
assert_malformed("\x3c\x6d\x61\x6c\x66\x6f\x72\x6d\x65\x64\x20\x71\x75\x6f\x74\x65\x3e");

// imports.wast:534
assert_malformed("\x3c\x6d\x61\x6c\x66\x6f\x72\x6d\x65\x64\x20\x71\x75\x6f\x74\x65\x3e");

// imports.wast:538
assert_malformed("\x3c\x6d\x61\x6c\x66\x6f\x72\x6d\x65\x64\x20\x71\x75\x6f\x74\x65\x3e");

// imports.wast:542
assert_malformed("\x3c\x6d\x61\x6c\x66\x6f\x72\x6d\x65\x64\x20\x71\x75\x6f\x74\x65\x3e");

// imports.wast:546
assert_malformed("\x3c\x6d\x61\x6c\x66\x6f\x72\x6d\x65\x64\x20\x71\x75\x6f\x74\x65\x3e");

// imports.wast:551
assert_malformed("\x3c\x6d\x61\x6c\x66\x6f\x72\x6d\x65\x64\x20\x71\x75\x6f\x74\x65\x3e");

// imports.wast:555
assert_malformed("\x3c\x6d\x61\x6c\x66\x6f\x72\x6d\x65\x64\x20\x71\x75\x6f\x74\x65\x3e");

// imports.wast:559
assert_malformed("\x3c\x6d\x61\x6c\x66\x6f\x72\x6d\x65\x64\x20\x71\x75\x6f\x74\x65\x3e");

// imports.wast:563
assert_malformed("\x3c\x6d\x61\x6c\x66\x6f\x72\x6d\x65\x64\x20\x71\x75\x6f\x74\x65\x3e");

// imports.wast:571
let $38 = instance("\x00\x61\x73\x6d\x01\x00\x00\x00");

// imports.wast:572
register("not wasm", $38)

// imports.wast:573
assert_unlinkable("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\xa9\x80\x80\x80\x00\x0a\x60\x00\x00\x60\x01\x7f\x00\x60\x02\x7f\x7f\x00\x60\x01\x7e\x00\x60\x01\x7d\x00\x60\x01\x7c\x00\x60\x00\x01\x7f\x60\x00\x01\x7e\x60\x00\x01\x7d\x60\x00\x01\x7c\x02\xe8\x82\x80\x80\x00\x10\x08\x6e\x6f\x74\x20\x77\x61\x73\x6d\x0a\x6f\x76\x65\x72\x6c\x6f\x61\x64\x65\x64\x00\x00\x08\x6e\x6f\x74\x20\x77\x61\x73\x6d\x0a\x6f\x76\x65\x72\x6c\x6f\x61\x64\x65\x64\x00\x01\x08\x6e\x6f\x74\x20\x77\x61\x73\x6d\x0a\x6f\x76\x65\x72\x6c\x6f\x61\x64\x65\x64\x00\x02\x08\x6e\x6f\x74\x20\x77\x61\x73\x6d\x0a\x6f\x76\x65\x72\x6c\x6f\x61\x64\x65\x64\x00\x03\x08\x6e\x6f\x74\x20\x77\x61\x73\x6d\x0a\x6f\x76\x65\x72\x6c\x6f\x61\x64\x65\x64\x00\x04\x08\x6e\x6f\x74\x20\x77\x61\x73\x6d\x0a\x6f\x76\x65\x72\x6c\x6f\x61\x64\x65\x64\x00\x05\x08\x6e\x6f\x74\x20\x77\x61\x73\x6d\x0a\x6f\x76\x65\x72\x6c\x6f\x61\x64\x65\x64\x00\x06\x08\x6e\x6f\x74\x20\x77\x61\x73\x6d\x0a\x6f\x76\x65\x72\x6c\x6f\x61\x64\x65\x64\x00\x07\x08\x6e\x6f\x74\x20\x77\x61\x73\x6d\x0a\x6f\x76\x65\x72\x6c\x6f\x61\x64\x65\x64\x00\x08\x08\x6e\x6f\x74\x20\x77\x61\x73\x6d\x0a\x6f\x76\x65\x72\x6c\x6f\x61\x64\x65\x64\x00\x09\x08\x6e\x6f\x74\x20\x77\x61\x73\x6d\x0a\x6f\x76\x65\x72\x6c\x6f\x61\x64\x65\x64\x03\x7f\x00\x08\x6e\x6f\x74\x20\x77\x61\x73\x6d\x0a\x6f\x76\x65\x72\x6c\x6f\x61\x64\x65\x64\x03\x7e\x00\x08\x6e\x6f\x74\x20\x77\x61\x73\x6d\x0a\x6f\x76\x65\x72\x6c\x6f\x61\x64\x65\x64\x03\x7d\x00\x08\x6e\x6f\x74\x20\x77\x61\x73\x6d\x0a\x6f\x76\x65\x72\x6c\x6f\x61\x64\x65\x64\x03\x7c\x00\x08\x6e\x6f\x74\x20\x77\x61\x73\x6d\x0a\x6f\x76\x65\x72\x6c\x6f\x61\x64\x65\x64\x01\x70\x00\x00\x08\x6e\x6f\x74\x20\x77\x61\x73\x6d\x0a\x6f\x76\x65\x72\x6c\x6f\x61\x64\x65\x64\x02\x00\x00");
