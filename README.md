node-dota2
========

A node-steam plugin for Dota 2. Unlike [node-tf2](https://github.com/seishun/node-tf2), it generates methods and events dynamically based on .proto files. This is very experimental and not necessarily useful.

# Installation

1) `npm install git://github.com/seishun/node-dota2`

2) Since npm [does not](https://github.com/isaacs/npm/issues/1876) currently support submodules, you'll have to clone [SteamKit](https://github.com/SteamRE/SteamKit) manually into the node-dota2 directory (or create a symlink if you have it cloned somewhere else already). It contains the up-to-date .proto files for Dota 2.

# Usage

Initialize a `Dota2` instance with a `SteamClient` instance.

```js
var Steam = require('steam');
var steamClient = new Steam.SteamClient();
var Dota2 = require('dota2');
var dota2 = new Dota2(steamClient);
```

All Dota2 methods require the SteamClient instance to be logged on.

# Methods and events

All methods and events have a single required argument – an object with a certain structure. Since everything is generated dynamically when the module is first loaded, the documentation is generated too – it's in `Dota2.methods` and `Dota2.events`. Both are objects that map method or event names to _structure objects_ that describe the properties in the argument to the method or the event.

A _structure object_ is an object that maps property names to their expected types. A type can be one of the following:

* 'uint64', 'fixed64', or anything else with a '64' in it correspods to a [Long.js](https://github.com/dcodeIO/Long.js) object.
* A nested _structure object_ means the argument is a nested object.
* An object that maps strings to numbers is an enum. The respective property is a number.
* Anything else is a primitive type.

All properties in the argument object are optional, but the type must be correct if provided.

Since this all might sound confusing, here's an example. Imagine that `Dota2.methods.doSomething` evaluates to the following:

```js
{
  some_number: 'int32',
  some_big_number: 'int64',
  nested_object: {
    some_string: 'string',
    some_enum: {
      'YES': 0,
      'NO': 1
    }
  }
}
```

This means we can call this method like this:

```js
dota2.doSomething({
  some_number: 123123,
  some_big_number: Long.fromString('123123123123123123123'),
  nested_object: {
    some_string: 'herp derp',
    some_enum: 1 // corresponds to NO
  }
});
```

## Requests and responses

If there is a response to some method, it should arrive in an event of the same name as the method. If it uses JobIDs (which cannot be determined from the .proto file, so you'll have to try and see yourself), then any additional arguments you provide to the method will be passed as additional arguments to the event handler. Take a look at [example.js](example.js) to see how this could be used with `matchDetails`.
