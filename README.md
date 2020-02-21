
# ROXAN: JSON + Recursive Structures

## Installation

```sh
npm install rexon
```

## Usage

```js
var rexon = require('rexon');
var obj = {
  nullMember: null,
  stringMember: "string\n",
  numberMember: 12,
  voidMember: void 0,
  boolMember: true,
  arrayMember: [[], [[]], [[[]]], [[[[]]]], [[[[[]]]]]]
};

obj.itself = obj;
obj.itselfInArray = [obj, [obj]];

var result = rexon.stringify(obj)
// result:
// {
//   "nullMember": null,
//   "stringMember": "string\n",
//   "numberMember": 12,
//   "voidMember": undefined,
//   "boolMember": true,
//   "arrayMember": [
//     [],
//     [
//       []
//     ],
//     [
//       [
// 	[]
//       ]
//     ],
//     [
//       [
// 	[
// 	  []
// 	]
//       ]
//     ],
//     [
//       [
// 	[
// 	  [
// 	    []
// 	  ]
// 	]
//       ]
//     ]
//   ],
//   "itself": &0,
//   "itselfInArray": [
//     &0,
//     [
//       &0
//     ]
//   ]
// }

```

## Streaming

even though, by default, `roxan.stringify` returns a whole string after the whole object passed to it has been stringified, this behaviour can be easily customized:

```js
var roxan = require('roxan');

function writeToConsoleImmediately(chunk) {
  console.log(chunk);
}

var obj = ... // the same value as `obj`, above

roxan.stringify(obj, {rawWrite: writeToConsoleImmediately}); // streams `stringify`'s output to stdout as it is getting produced
```

Please note that `roxan.stringify` no longer returns a string when it is provided with a custom `rawWrite`.

