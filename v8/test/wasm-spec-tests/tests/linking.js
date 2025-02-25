
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

// linking.wast:3
let $1 = instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x85\x80\x80\x80\x00\x01\x60\x00\x01\x7f\x03\x83\x80\x80\x80\x00\x02\x00\x00\x07\x88\x80\x80\x80\x00\x01\x04\x63\x61\x6c\x6c\x00\x00\x0a\x93\x80\x80\x80\x00\x02\x84\x80\x80\x80\x00\x00\x10\x01\x0b\x84\x80\x80\x80\x00\x00\x41\x02\x0b");
let $Mf = $1;

// linking.wast:7
register("Mf", $Mf)

// linking.wast:9
let $2 = instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x85\x80\x80\x80\x00\x01\x60\x00\x01\x7f\x02\x8b\x80\x80\x80\x00\x01\x02\x4d\x66\x04\x63\x61\x6c\x6c\x00\x00\x03\x84\x80\x80\x80\x00\x03\x00\x00\x00\x07\xa1\x80\x80\x80\x00\x03\x07\x4d\x66\x2e\x63\x61\x6c\x6c\x00\x00\x0c\x63\x61\x6c\x6c\x20\x4d\x66\x2e\x63\x61\x6c\x6c\x00\x01\x04\x63\x61\x6c\x6c\x00\x02\x0a\x9c\x80\x80\x80\x00\x03\x84\x80\x80\x80\x00\x00\x10\x00\x0b\x84\x80\x80\x80\x00\x00\x10\x03\x0b\x84\x80\x80\x80\x00\x00\x41\x03\x0b");
let $Nf = $2;

// linking.wast:17
assert_return(() => call($Mf, "call", []), 2);

// linking.wast:18
assert_return(() => call($Nf, "Mf.call", []), 2);

// linking.wast:19
assert_return(() => call($Nf, "call", []), 3);

// linking.wast:20
assert_return(() => call($Nf, "call Mf.call", []), 2);

// linking.wast:22
let $3 = instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x85\x80\x80\x80\x00\x01\x60\x01\x7f\x00\x02\x96\x80\x80\x80\x00\x01\x08\x73\x70\x65\x63\x74\x65\x73\x74\x09\x70\x72\x69\x6e\x74\x5f\x69\x33\x32\x00\x00\x07\x89\x80\x80\x80\x00\x01\x05\x70\x72\x69\x6e\x74\x00\x00");

// linking.wast:26
register("reexport_f", $3)

// linking.wast:27
assert_unlinkable("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x85\x80\x80\x80\x00\x01\x60\x01\x7e\x00\x02\x94\x80\x80\x80\x00\x01\x0a\x72\x65\x65\x78\x70\x6f\x72\x74\x5f\x66\x05\x70\x72\x69\x6e\x74\x00\x00");

// linking.wast:31
assert_unlinkable("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x86\x80\x80\x80\x00\x01\x60\x01\x7f\x01\x7f\x02\x94\x80\x80\x80\x00\x01\x0a\x72\x65\x65\x78\x70\x6f\x72\x74\x5f\x66\x05\x70\x72\x69\x6e\x74\x00\x00");

// linking.wast:39
let $4 = instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x89\x80\x80\x80\x00\x02\x60\x00\x01\x7f\x60\x01\x7f\x00\x03\x84\x80\x80\x80\x00\x03\x00\x00\x01\x06\x8c\x80\x80\x80\x00\x02\x7f\x00\x41\x2a\x0b\x7f\x01\x41\x8e\x01\x0b\x07\xad\x80\x80\x80\x00\x05\x04\x67\x6c\x6f\x62\x03\x00\x03\x67\x65\x74\x00\x00\x08\x6d\x75\x74\x5f\x67\x6c\x6f\x62\x03\x01\x07\x67\x65\x74\x5f\x6d\x75\x74\x00\x01\x07\x73\x65\x74\x5f\x6d\x75\x74\x00\x02\x0a\x9e\x80\x80\x80\x00\x03\x84\x80\x80\x80\x00\x00\x23\x00\x0b\x84\x80\x80\x80\x00\x00\x23\x01\x0b\x86\x80\x80\x80\x00\x00\x20\x00\x24\x01\x0b");
let $Mg = $4;

// linking.wast:48
register("Mg", $Mg)

// linking.wast:50
let $5 = instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x89\x80\x80\x80\x00\x02\x60\x00\x01\x7f\x60\x01\x7f\x00\x02\xbe\x80\x80\x80\x00\x05\x02\x4d\x67\x04\x67\x6c\x6f\x62\x03\x7f\x00\x02\x4d\x67\x08\x6d\x75\x74\x5f\x67\x6c\x6f\x62\x03\x7f\x01\x02\x4d\x67\x03\x67\x65\x74\x00\x00\x02\x4d\x67\x07\x67\x65\x74\x5f\x6d\x75\x74\x00\x00\x02\x4d\x67\x07\x73\x65\x74\x5f\x6d\x75\x74\x00\x01\x03\x82\x80\x80\x80\x00\x01\x00\x06\x86\x80\x80\x80\x00\x01\x7f\x00\x41\x2b\x0b\x07\xc9\x80\x80\x80\x00\x07\x07\x4d\x67\x2e\x67\x6c\x6f\x62\x03\x00\x06\x4d\x67\x2e\x67\x65\x74\x00\x00\x04\x67\x6c\x6f\x62\x03\x02\x03\x67\x65\x74\x00\x03\x0b\x4d\x67\x2e\x6d\x75\x74\x5f\x67\x6c\x6f\x62\x03\x01\x0a\x4d\x67\x2e\x67\x65\x74\x5f\x6d\x75\x74\x00\x01\x0a\x4d\x67\x2e\x73\x65\x74\x5f\x6d\x75\x74\x00\x02\x0a\x8a\x80\x80\x80\x00\x01\x84\x80\x80\x80\x00\x00\x23\x02\x0b");
let $Ng = $5;

// linking.wast:67
assert_return(() => get($Mg, "glob"), 42);

// linking.wast:68
assert_return(() => get($Ng, "Mg.glob"), 42);

// linking.wast:69
assert_return(() => get($Ng, "glob"), 43);

// linking.wast:70
assert_return(() => call($Mg, "get", []), 42);

// linking.wast:71
assert_return(() => call($Ng, "Mg.get", []), 42);

// linking.wast:72
assert_return(() => call($Ng, "get", []), 43);

// linking.wast:74
run(() => call(instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x84\x80\x80\x80\x00\x01\x60\x00\x00\x02\x91\x80\x80\x80\x00\x01\x03\x24\x4d\x67\x08\x6d\x75\x74\x5f\x67\x6c\x6f\x62\x03\x7f\x01\x03\x82\x80\x80\x80\x00\x01\x00\x07\x87\x80\x80\x80\x00\x01\x03\x72\x75\x6e\x00\x00\x0a\x98\x80\x80\x80\x00\x01\x92\x80\x80\x80\x00\x00\x02\x40\x23\x00\x01\x41\x8e\x01\x01\x46\x45\x0d\x00\x0f\x0b\x00\x0b", exports("$Mg", $Mg)),  "run", []));  // assert_return(() => get($Mg, "mut_glob"), 142)

// linking.wast:75
run(() => call(instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x84\x80\x80\x80\x00\x01\x60\x00\x00\x02\x94\x80\x80\x80\x00\x01\x03\x24\x4e\x67\x0b\x4d\x67\x2e\x6d\x75\x74\x5f\x67\x6c\x6f\x62\x03\x7f\x01\x03\x82\x80\x80\x80\x00\x01\x00\x07\x87\x80\x80\x80\x00\x01\x03\x72\x75\x6e\x00\x00\x0a\x98\x80\x80\x80\x00\x01\x92\x80\x80\x80\x00\x00\x02\x40\x23\x00\x01\x41\x8e\x01\x01\x46\x45\x0d\x00\x0f\x0b\x00\x0b", exports("$Ng", $Ng)),  "run", []));  // assert_return(() => get($Ng, "Mg.mut_glob"), 142)

// linking.wast:76
assert_return(() => call($Mg, "get_mut", []), 142);

// linking.wast:77
assert_return(() => call($Ng, "Mg.get_mut", []), 142);

// linking.wast:79
assert_return(() => call($Mg, "set_mut", [241]));

// linking.wast:80
run(() => call(instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x84\x80\x80\x80\x00\x01\x60\x00\x00\x02\x91\x80\x80\x80\x00\x01\x03\x24\x4d\x67\x08\x6d\x75\x74\x5f\x67\x6c\x6f\x62\x03\x7f\x01\x03\x82\x80\x80\x80\x00\x01\x00\x07\x87\x80\x80\x80\x00\x01\x03\x72\x75\x6e\x00\x00\x0a\x98\x80\x80\x80\x00\x01\x92\x80\x80\x80\x00\x00\x02\x40\x23\x00\x01\x41\xf1\x01\x01\x46\x45\x0d\x00\x0f\x0b\x00\x0b", exports("$Mg", $Mg)),  "run", []));  // assert_return(() => get($Mg, "mut_glob"), 241)

// linking.wast:81
run(() => call(instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x84\x80\x80\x80\x00\x01\x60\x00\x00\x02\x94\x80\x80\x80\x00\x01\x03\x24\x4e\x67\x0b\x4d\x67\x2e\x6d\x75\x74\x5f\x67\x6c\x6f\x62\x03\x7f\x01\x03\x82\x80\x80\x80\x00\x01\x00\x07\x87\x80\x80\x80\x00\x01\x03\x72\x75\x6e\x00\x00\x0a\x98\x80\x80\x80\x00\x01\x92\x80\x80\x80\x00\x00\x02\x40\x23\x00\x01\x41\xf1\x01\x01\x46\x45\x0d\x00\x0f\x0b\x00\x0b", exports("$Ng", $Ng)),  "run", []));  // assert_return(() => get($Ng, "Mg.mut_glob"), 241)

// linking.wast:82
assert_return(() => call($Mg, "get_mut", []), 241);

// linking.wast:83
assert_return(() => call($Ng, "Mg.get_mut", []), 241);

// linking.wast:86
assert_unlinkable("\x00\x61\x73\x6d\x01\x00\x00\x00\x02\x90\x80\x80\x80\x00\x01\x02\x4d\x67\x08\x6d\x75\x74\x5f\x67\x6c\x6f\x62\x03\x7f\x00");

// linking.wast:90
assert_unlinkable("\x00\x61\x73\x6d\x01\x00\x00\x00\x02\x8c\x80\x80\x80\x00\x01\x02\x4d\x67\x04\x67\x6c\x6f\x62\x03\x7f\x01");

// linking.wast:97
let $6 = instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x8d\x80\x80\x80\x00\x03\x60\x00\x01\x7f\x60\x00\x00\x60\x01\x7f\x01\x7f\x03\x84\x80\x80\x80\x00\x03\x00\x00\x02\x04\x84\x80\x80\x80\x00\x01\x70\x00\x0a\x07\x92\x80\x80\x80\x00\x03\x03\x74\x61\x62\x01\x00\x01\x68\x00\x01\x04\x63\x61\x6c\x6c\x00\x02\x09\x8a\x80\x80\x80\x00\x01\x00\x41\x02\x0b\x04\x00\x00\x00\x00\x0a\x9f\x80\x80\x80\x00\x03\x84\x80\x80\x80\x00\x00\x41\x04\x0b\x84\x80\x80\x80\x00\x00\x41\x7c\x0b\x87\x80\x80\x80\x00\x00\x20\x00\x11\x00\x00\x0b");
let $Mt = $6;

// linking.wast:110
register("Mt", $Mt)

// linking.wast:112
let $7 = instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x8d\x80\x80\x80\x00\x03\x60\x00\x00\x60\x00\x01\x7f\x60\x01\x7f\x01\x7f\x02\x92\x80\x80\x80\x00\x02\x02\x4d\x74\x04\x63\x61\x6c\x6c\x00\x02\x02\x4d\x74\x01\x68\x00\x01\x03\x84\x80\x80\x80\x00\x03\x01\x02\x02\x04\x85\x80\x80\x80\x00\x01\x70\x01\x05\x05\x07\xa1\x80\x80\x80\x00\x03\x07\x4d\x74\x2e\x63\x61\x6c\x6c\x00\x00\x0c\x63\x61\x6c\x6c\x20\x4d\x74\x2e\x63\x61\x6c\x6c\x00\x03\x04\x63\x61\x6c\x6c\x00\x04\x09\x8b\x80\x80\x80\x00\x01\x00\x41\x00\x0b\x05\x02\x02\x02\x01\x00\x0a\xa1\x80\x80\x80\x00\x03\x84\x80\x80\x80\x00\x00\x41\x05\x0b\x86\x80\x80\x80\x00\x00\x20\x00\x10\x00\x0b\x87\x80\x80\x80\x00\x00\x20\x00\x11\x01\x00\x0b");
let $Nt = $7;

// linking.wast:131
assert_return(() => call($Mt, "call", [2]), 4);

// linking.wast:132
assert_return(() => call($Nt, "Mt.call", [2]), 4);

// linking.wast:133
assert_return(() => call($Nt, "call", [2]), 5);

// linking.wast:134
assert_return(() => call($Nt, "call Mt.call", [2]), 4);

// linking.wast:136
assert_trap(() => call($Mt, "call", [1]));

// linking.wast:137
assert_trap(() => call($Nt, "Mt.call", [1]));

// linking.wast:138
assert_return(() => call($Nt, "call", [1]), 5);

// linking.wast:139
assert_trap(() => call($Nt, "call Mt.call", [1]));

// linking.wast:141
assert_trap(() => call($Mt, "call", [0]));

// linking.wast:142
assert_trap(() => call($Nt, "Mt.call", [0]));

// linking.wast:143
assert_return(() => call($Nt, "call", [0]), 5);

// linking.wast:144
assert_trap(() => call($Nt, "call Mt.call", [0]));

// linking.wast:146
assert_trap(() => call($Mt, "call", [20]));

// linking.wast:147
assert_trap(() => call($Nt, "Mt.call", [20]));

// linking.wast:148
assert_trap(() => call($Nt, "call", [7]));

// linking.wast:149
assert_trap(() => call($Nt, "call Mt.call", [20]));

// linking.wast:151
assert_return(() => call($Nt, "call", [3]), -4);

// linking.wast:152
assert_trap(() => call($Nt, "call", [4]));

// linking.wast:154
let $8 = instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x8a\x80\x80\x80\x00\x02\x60\x00\x01\x7f\x60\x01\x7f\x01\x7f\x02\x93\x80\x80\x80\x00\x02\x02\x4d\x74\x01\x68\x00\x00\x02\x4d\x74\x03\x74\x61\x62\x01\x70\x00\x05\x03\x83\x80\x80\x80\x00\x02\x00\x01\x07\x88\x80\x80\x80\x00\x01\x04\x63\x61\x6c\x6c\x00\x02\x09\x88\x80\x80\x80\x00\x01\x00\x41\x01\x0b\x02\x01\x00\x0a\x96\x80\x80\x80\x00\x02\x84\x80\x80\x80\x00\x00\x41\x06\x0b\x87\x80\x80\x80\x00\x00\x20\x00\x11\x00\x00\x0b");
let $Ot = $8;

// linking.wast:167
assert_return(() => call($Mt, "call", [3]), 4);

// linking.wast:168
assert_return(() => call($Nt, "Mt.call", [3]), 4);

// linking.wast:169
assert_return(() => call($Nt, "call Mt.call", [3]), 4);

// linking.wast:170
assert_return(() => call($Ot, "call", [3]), 4);

// linking.wast:172
assert_return(() => call($Mt, "call", [2]), -4);

// linking.wast:173
assert_return(() => call($Nt, "Mt.call", [2]), -4);

// linking.wast:174
assert_return(() => call($Nt, "call", [2]), 5);

// linking.wast:175
assert_return(() => call($Nt, "call Mt.call", [2]), -4);

// linking.wast:176
assert_return(() => call($Ot, "call", [2]), -4);

// linking.wast:178
assert_return(() => call($Mt, "call", [1]), 6);

// linking.wast:179
assert_return(() => call($Nt, "Mt.call", [1]), 6);

// linking.wast:180
assert_return(() => call($Nt, "call", [1]), 5);

// linking.wast:181
assert_return(() => call($Nt, "call Mt.call", [1]), 6);

// linking.wast:182
assert_return(() => call($Ot, "call", [1]), 6);

// linking.wast:184
assert_trap(() => call($Mt, "call", [0]));

// linking.wast:185
assert_trap(() => call($Nt, "Mt.call", [0]));

// linking.wast:186
assert_return(() => call($Nt, "call", [0]), 5);

// linking.wast:187
assert_trap(() => call($Nt, "call Mt.call", [0]));

// linking.wast:188
assert_trap(() => call($Ot, "call", [0]));

// linking.wast:190
assert_trap(() => call($Ot, "call", [20]));

// linking.wast:192
let $9 = instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x84\x80\x80\x80\x00\x01\x60\x00\x00\x02\x8c\x80\x80\x80\x00\x01\x02\x4d\x74\x03\x74\x61\x62\x01\x70\x00\x00\x03\x82\x80\x80\x80\x00\x01\x00\x09\x87\x80\x80\x80\x00\x01\x00\x41\x09\x0b\x01\x00\x0a\x88\x80\x80\x80\x00\x01\x82\x80\x80\x80\x00\x00\x0b");

// linking.wast:198
let $10 = instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x06\x86\x80\x80\x80\x00\x01\x7f\x00\x41\x05\x0b\x07\x85\x80\x80\x80\x00\x01\x01\x67\x03\x00");
let $G1 = $10;

// linking.wast:199
register("G1", $G1)

// linking.wast:200
let $11 = instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x02\x89\x80\x80\x80\x00\x01\x02\x47\x31\x01\x67\x03\x7f\x00\x06\x86\x80\x80\x80\x00\x01\x7f\x00\x23\x00\x0b\x07\x85\x80\x80\x80\x00\x01\x01\x67\x03\x01");
let $G2 = $11;

// linking.wast:204
assert_return(() => get($G2, "g"), 5);

// linking.wast:206
assert_unlinkable("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x84\x80\x80\x80\x00\x01\x60\x00\x00\x02\x8c\x80\x80\x80\x00\x01\x02\x4d\x74\x03\x74\x61\x62\x01\x70\x00\x00\x03\x82\x80\x80\x80\x00\x01\x00\x09\x87\x80\x80\x80\x00\x01\x00\x41\x0a\x0b\x01\x00\x0a\x88\x80\x80\x80\x00\x01\x82\x80\x80\x80\x00\x00\x0b");

// linking.wast:215
assert_unlinkable("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x85\x80\x80\x80\x00\x01\x60\x00\x01\x7f\x02\x96\x80\x80\x80\x00\x02\x02\x4d\x74\x03\x74\x61\x62\x01\x70\x00\x0a\x02\x4d\x74\x03\x6d\x65\x6d\x02\x00\x01\x03\x82\x80\x80\x80\x00\x01\x00\x09\x8d\x80\x80\x80\x00\x02\x00\x41\x07\x0b\x01\x00\x00\x41\x09\x0b\x01\x00\x0a\x8a\x80\x80\x80\x00\x01\x84\x80\x80\x80\x00\x00\x41\x00\x0b");

// linking.wast:225
assert_trap(() => call($Mt, "call", [7]));

// linking.wast:227
assert_unlinkable("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x85\x80\x80\x80\x00\x01\x60\x00\x01\x7f\x02\x8c\x80\x80\x80\x00\x01\x02\x4d\x74\x03\x74\x61\x62\x01\x70\x00\x0a\x03\x82\x80\x80\x80\x00\x01\x00\x09\x8d\x80\x80\x80\x00\x02\x00\x41\x07\x0b\x01\x00\x00\x41\x0c\x0b\x01\x00\x0a\x8a\x80\x80\x80\x00\x01\x84\x80\x80\x80\x00\x00\x41\x00\x0b");

// linking.wast:236
assert_trap(() => call($Mt, "call", [7]));

// linking.wast:238
assert_unlinkable("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x85\x80\x80\x80\x00\x01\x60\x00\x01\x7f\x02\x8c\x80\x80\x80\x00\x01\x02\x4d\x74\x03\x74\x61\x62\x01\x70\x00\x0a\x03\x82\x80\x80\x80\x00\x01\x00\x05\x83\x80\x80\x80\x00\x01\x00\x01\x09\x87\x80\x80\x80\x00\x01\x00\x41\x07\x0b\x01\x00\x0a\x8a\x80\x80\x80\x00\x01\x84\x80\x80\x80\x00\x00\x41\x00\x0b\x0b\x89\x80\x80\x80\x00\x01\x00\x41\x80\x80\x04\x0b\x01\x64");

// linking.wast:248
assert_trap(() => call($Mt, "call", [7]));

// linking.wast:253
let $12 = instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x86\x80\x80\x80\x00\x01\x60\x01\x7f\x01\x7f\x03\x82\x80\x80\x80\x00\x01\x00\x05\x84\x80\x80\x80\x00\x01\x01\x01\x05\x07\x8e\x80\x80\x80\x00\x02\x03\x6d\x65\x6d\x02\x00\x04\x6c\x6f\x61\x64\x00\x00\x0a\x8d\x80\x80\x80\x00\x01\x87\x80\x80\x80\x00\x00\x20\x00\x2d\x00\x00\x0b\x0b\x90\x80\x80\x80\x00\x01\x00\x41\x0a\x0b\x0a\x00\x01\x02\x03\x04\x05\x06\x07\x08\x09");
let $Mm = $12;

// linking.wast:261
register("Mm", $Mm)

// linking.wast:263
let $13 = instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x86\x80\x80\x80\x00\x01\x60\x01\x7f\x01\x7f\x02\x8b\x80\x80\x80\x00\x01\x02\x4d\x6d\x04\x6c\x6f\x61\x64\x00\x00\x03\x82\x80\x80\x80\x00\x01\x00\x05\x83\x80\x80\x80\x00\x01\x00\x01\x07\x92\x80\x80\x80\x00\x02\x07\x4d\x6d\x2e\x6c\x6f\x61\x64\x00\x00\x04\x6c\x6f\x61\x64\x00\x01\x0a\x8d\x80\x80\x80\x00\x01\x87\x80\x80\x80\x00\x00\x20\x00\x2d\x00\x00\x0b\x0b\x8c\x80\x80\x80\x00\x01\x00\x41\x0a\x0b\x06\xf0\xf1\xf2\xf3\xf4\xf5");
let $Nm = $13;

// linking.wast:275
assert_return(() => call($Mm, "load", [12]), 2);

// linking.wast:276
assert_return(() => call($Nm, "Mm.load", [12]), 2);

// linking.wast:277
assert_return(() => call($Nm, "load", [12]), 242);

// linking.wast:279
let $14 = instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x86\x80\x80\x80\x00\x01\x60\x01\x7f\x01\x7f\x02\x8b\x80\x80\x80\x00\x01\x02\x4d\x6d\x03\x6d\x65\x6d\x02\x00\x01\x03\x82\x80\x80\x80\x00\x01\x00\x07\x88\x80\x80\x80\x00\x01\x04\x6c\x6f\x61\x64\x00\x00\x0a\x8d\x80\x80\x80\x00\x01\x87\x80\x80\x80\x00\x00\x20\x00\x2d\x00\x00\x0b\x0b\x8e\x80\x80\x80\x00\x01\x00\x41\x05\x0b\x08\xa0\xa1\xa2\xa3\xa4\xa5\xa6\xa7");
let $Om = $14;

// linking.wast:288
assert_return(() => call($Mm, "load", [12]), 167);

// linking.wast:289
assert_return(() => call($Nm, "Mm.load", [12]), 167);

// linking.wast:290
assert_return(() => call($Nm, "load", [12]), 242);

// linking.wast:291
assert_return(() => call($Om, "load", [12]), 167);

// linking.wast:293
let $15 = instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x02\x8b\x80\x80\x80\x00\x01\x02\x4d\x6d\x03\x6d\x65\x6d\x02\x00\x00\x0b\x89\x80\x80\x80\x00\x01\x00\x41\xff\xff\x03\x0b\x01\x61");

// linking.wast:298
assert_unlinkable("\x00\x61\x73\x6d\x01\x00\x00\x00\x02\x8b\x80\x80\x80\x00\x01\x02\x4d\x6d\x03\x6d\x65\x6d\x02\x00\x00\x0b\x89\x80\x80\x80\x00\x01\x00\x41\x80\x80\x04\x0b\x01\x61");

// linking.wast:306
let $16 = instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x86\x80\x80\x80\x00\x01\x60\x01\x7f\x01\x7f\x02\x8c\x80\x80\x80\x00\x01\x02\x4d\x6d\x03\x6d\x65\x6d\x02\x01\x01\x08\x03\x82\x80\x80\x80\x00\x01\x00\x07\x88\x80\x80\x80\x00\x01\x04\x67\x72\x6f\x77\x00\x00\x0a\x8c\x80\x80\x80\x00\x01\x86\x80\x80\x80\x00\x00\x20\x00\x40\x00\x0b");
let $Pm = $16;

// linking.wast:314
assert_return(() => call($Pm, "grow", [0]), 1);

// linking.wast:315
assert_return(() => call($Pm, "grow", [2]), 1);

// linking.wast:316
assert_return(() => call($Pm, "grow", [0]), 3);

// linking.wast:317
assert_return(() => call($Pm, "grow", [1]), 3);

// linking.wast:318
assert_return(() => call($Pm, "grow", [1]), 4);

// linking.wast:319
assert_return(() => call($Pm, "grow", [0]), 5);

// linking.wast:320
assert_return(() => call($Pm, "grow", [1]), -1);

// linking.wast:321
assert_return(() => call($Pm, "grow", [0]), 5);

// linking.wast:323
assert_unlinkable("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x84\x80\x80\x80\x00\x01\x60\x00\x00\x02\xa7\x80\x80\x80\x00\x03\x08\x73\x70\x65\x63\x74\x65\x73\x74\x05\x70\x72\x69\x6e\x74\x00\x00\x02\x4d\x6d\x03\x6d\x65\x6d\x02\x00\x01\x02\x4d\x6d\x03\x74\x61\x62\x01\x70\x00\x00\x0b\x89\x80\x80\x80\x00\x01\x00\x41\x00\x0b\x03\x61\x62\x63");

// linking.wast:332
assert_return(() => call($Mm, "load", [0]), 0);

// linking.wast:334
assert_unlinkable("\x00\x61\x73\x6d\x01\x00\x00\x00\x02\x8b\x80\x80\x80\x00\x01\x02\x4d\x6d\x03\x6d\x65\x6d\x02\x00\x01\x0b\x91\x80\x80\x80\x00\x02\x00\x41\x00\x0b\x03\x61\x62\x63\x00\x41\x80\x80\x14\x0b\x01\x64");

// linking.wast:342
assert_return(() => call($Mm, "load", [0]), 0);

// linking.wast:344
assert_unlinkable("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x84\x80\x80\x80\x00\x01\x60\x00\x00\x02\x8b\x80\x80\x80\x00\x01\x02\x4d\x6d\x03\x6d\x65\x6d\x02\x00\x01\x03\x82\x80\x80\x80\x00\x01\x00\x04\x84\x80\x80\x80\x00\x01\x70\x00\x00\x09\x87\x80\x80\x80\x00\x01\x00\x41\x00\x0b\x01\x00\x0a\x88\x80\x80\x80\x00\x01\x82\x80\x80\x80\x00\x00\x0b\x0b\x89\x80\x80\x80\x00\x01\x00\x41\x00\x0b\x03\x61\x62\x63");

// linking.wast:354
assert_return(() => call($Mm, "load", [0]), 0);

// linking.wast:357
let $17 = instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x85\x80\x80\x80\x00\x01\x60\x00\x01\x7f\x03\x83\x80\x80\x80\x00\x02\x00\x00\x04\x84\x80\x80\x80\x00\x01\x70\x00\x01\x05\x83\x80\x80\x80\x00\x01\x00\x01\x07\xb1\x80\x80\x80\x00\x04\x06\x6d\x65\x6d\x6f\x72\x79\x02\x00\x05\x74\x61\x62\x6c\x65\x01\x00\x0d\x67\x65\x74\x20\x6d\x65\x6d\x6f\x72\x79\x5b\x30\x5d\x00\x00\x0c\x67\x65\x74\x20\x74\x61\x62\x6c\x65\x5b\x30\x5d\x00\x01\x0a\x99\x80\x80\x80\x00\x02\x87\x80\x80\x80\x00\x00\x41\x00\x2d\x00\x00\x0b\x87\x80\x80\x80\x00\x00\x41\x00\x11\x00\x00\x0b");
let $Ms = $17;

// linking.wast:368
register("Ms", $Ms)

// linking.wast:370
assert_uninstantiable("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x88\x80\x80\x80\x00\x02\x60\x00\x01\x7f\x60\x00\x00\x02\x9b\x80\x80\x80\x00\x02\x02\x4d\x73\x06\x6d\x65\x6d\x6f\x72\x79\x02\x00\x01\x02\x4d\x73\x05\x74\x61\x62\x6c\x65\x01\x70\x00\x01\x03\x83\x80\x80\x80\x00\x02\x00\x01\x08\x81\x80\x80\x80\x00\x01\x09\x87\x80\x80\x80\x00\x01\x00\x41\x00\x0b\x01\x00\x0a\x94\x80\x80\x80\x00\x02\x86\x80\x80\x80\x00\x00\x41\xad\xbd\x03\x0b\x83\x80\x80\x80\x00\x00\x00\x0b\x0b\x8b\x80\x80\x80\x00\x01\x00\x41\x00\x0b\x05\x68\x65\x6c\x6c\x6f");

// linking.wast:387
assert_return(() => call($Ms, "get memory[0]", []), 104);

// linking.wast:388
assert_return(() => call($Ms, "get table[0]", []), 57_005);
