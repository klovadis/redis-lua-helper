


# Purpose

This small package is intended to help out with managing Lua scripts for redis as those scripts need
to be sent via the client and can profit from a wrapper. More importantly, this wrapper allows for
scripts to include code that is in other script files via `#include 'file.lua'` which promotes code
reusability.

Note that this package is client agnostic and still requires you to create a wrapper for your client.
You may also want to write the created code to new files for debugging purposes.

# Usage

Install this module via npm..

    npm install redis-lua-helper

.. and include is as such:

```javascript
var RedisLuaHelper = require('redis-lua-helper');
var rlh = RedisLuaHelper(options);
```

# #include macro

In your lua script files, you may use a `#include 'filename'` macro. This macro will include a
different script at the place where this macro was placed. File paths are relative to the current 
file. Included files may contain macros as well, but circular dependencies will raise errors.

Example of one Lua script including the other via `#include`:

File foo.lua:
```lua
print('This is foo!')
#include 'bar'
```

File bar.lua:
```lua
print('This is bar!')
```

Processed contents when loading foo script:
```lua
print('This is foo!')

-- #include bar:
print('This is bar!')
-- End of bar
```

# API

## RLH ( options | scriptPath )

Create a new instance of the RedisLuaHelper class, expects either the path of your script folder
or a full configuration object. Below are all possible options and there default values:

```javascript
var RedisLuaHelper = require('redis-lua-helper');

// using an options object
var rlh = RedisLuaHelper({
	'root': 		__dirname + '/scripts',
	'macro':		'#include',
	'extension':	'lua',
	'encoding':		'utf8'
});

// just provide the script path
var rlh2 = RedisLuaHelper(__dirname + '/scripts');
```

The `root` field defines the path relative from which scripts will be loaded. The `extension` forces
that script files may only be loaded if they share that extension. File `encoding` defaults to utf8
but can be overridden. The `macro` option allows you to override the default `#include 'file'` to
something else.


## RLH#load ( fileName1, fileName2, .. callback )

Load one or more Lua script files into the instance cache. The callback function should expect an
error argument and an array of loaded script files. Examples:

	// load a single script
    rlh.load('myscript', function (err, scripts) {} );

	// you can load any amount of scripts in this fashion
	rlh.load('myscript1', 'myscript2', function (err, scripts) {} );

    // filenames can be provided as an array as well
	rlh.load(['myscript3', 'myscript4'], function (err, scripts) {} );

Notice: Right now, checking for circular dependencies may cause problems if you try to call `load`
multiple times in a row before awaiting the first call to finish. To avoid this, you should place
all filenames that you wish to load in an array and call `load` once.


## RLH#loadDir ( dirpath, callback )

Loads all script files in a given directory, relative to the root directory. Does not include files 
in subdirectories. If the dirpath argument is omitted, the root directory will be used instead.

    // load all files in the root directory (not including subdirectories)
	rlh.loadDir( function (err, scripts) {} );

	// load all files in /root/subdir
	rlh.loadDir( 'subdir', function (err, scripts) {} );


## RLH#code ( scriptName )

Returns the code of a previously loaded script. You must load a script first before you can access
its code.

    var code = rlh.code('myscript');


## RLH#shasum ( scriptName )

Returns the shasum of a previously loaded script. You must load a script first before you can access
its shasum.

	// returns the scripts shasum
	// i.e. 6b1bf486c81ceb7edf3c093f4c48582e38c0e791
    var shasum = rlh.shasum('myscript');


## RLH#clearCache()

Clears the entire cache, is the same as creating a fresh instance.

    // clear the script cache
	rlh.clearCache();


# TODO

- Create a loading queue so you can issue multiple load commands in parallel.
- Scan code for KEYS[*] and store information to be accessed via helper.keys('script').
- Allow to create compiled files and store them in filesystem for debugging and caching.
- Add bindings for popular redis clients, .sync() and .eval(), with config options
to provide a 'client' and 'adapter' (=client type).


# Changelog

## 0.1.0

Initial release.

# License

MIT License, see LICENSE file.