
// no external dependencies
var fs = require('fs')
,	path = require('path')
,	util = require('util')
,	crypto = require('crypto');


/* constructor

	options object:
		root		the root directory of all script files
		macro		the macro string to use, defaults to #include
		extension	the only valid extension for script files
		encoding	set the lua script file encoding, defaults to utf8
*/
function ScriptHelper(opt) {

	// default configuration
	this.config = {
		'root': 		(module.parent) ? path.dirname(module.parent.filename) : __dirname,
		'macro':		'#include',
		'extension':	'lua',
		'encoding':		null
	};

	// if options are provided, set those options
	if (typeof opt === 'string') opt = {'root': opt};
	if (typeof opt === 'object') {
		for (var key in opt) {
			if (opt.hasOwnProperty(key) && typeof this.config[key] !== 'undefined') 
				this.config[key] = opt[key];
		}
	}

	// prepend a . before extension config value
	if (this.config.extension) {
		if (this.config.extension.substr(0, 1) !== '.') 
			this.config.extension = '.' + this.config.extension;
	} else { this.config.extension = ''; }

	// set internal vars
	this.clearCache();

}; // constructor


// load all script files in a given directory, not including subdirectories
// if the directory is omitted, load all script files in root dir
ScriptHelper.prototype.loadDir = function (dirpath, callback) {
	var self = this;
	if (typeof dirpath === 'function') {
		callback = dirpath;
		dirpath = this.config.root;
	} else {
		dirpath = path.join(this.config.root, dirpath);
	}
	if (typeof callback !== 'function') throw new TypeError('Argument callback must be a function.');

	// load all files in given directory
	fs.readdir(dirpath, function (err, files) {
		if (err) return callback(err);
		rec(files);
	});

	// check if those files are really files
	var actualFiles = []
	, ext = this.config.extension;
	function rec(files) {
		if (!files.length) return self.load(actualFiles, callback);
		var nextFile = files.shift();
		
		// ignore files that dont have the correct extension
		if (ext !== '' && path.extname(nextFile) !== ext)
			return rec(files);

		// check whether file is really a file
		nextFile = path.relative(self.config.root, path.join(dirpath, nextFile));
		var filePath = path.join(self.config.root, nextFile);
		fs.stat(filePath, function (err, stats) {
			if (err) return callback(err);
			if (stats.isFile()) actualFiles.push(nextFile);
			rec(files);
		});
	}
};


// load one or more script files in root dir
ScriptHelper.prototype.load = function (scriptNames, callback) {
	var i, l = arguments.length, scripts = [], self = this;

	if (util.isArray(scriptNames)) {

		// first argument is an array of script names
		if (typeof callback !== 'function')
			throw new TypeError('Last argument is expected to be a callback function.');
		l = scriptNames.length;
		for (i = 0; i < l; i++) scripts.push(scriptNames[i]);
		//console.log('!!', scriptNames, scripts);
	} else {
		// get argument as list
		for (i = 0; i < l; i++) scripts.push(arguments[i]);
		if (typeof scripts[l-1] !== 'function') 
			throw new TypeError('Last argument is expected to be a callback function.');
		if (l < 2) throw new TypeError('Any arguments but the last argument are expected to be script file names.');
		callback = scripts.pop();
	}

	// load and parse scripts sequentially
	var loaded = [];
	function rec() {
		if (!scripts.length) return callback(null, loaded);
		var scriptName = scripts.shift();
		self._parse(scriptName, function (err, code) {
			if (err) return callback(err);
			if (code) loaded.push(scriptName);
			rec();
		});
	}
	rec();
};


// actually load file and parse macro's
ScriptHelper.prototype._parse = function (scriptName, callback) {
	var self = this;

	// get extension config value
	var ext = this.config.extension;

	// resolve script filename
	var fileName = scriptName;
	if (path.extname(fileName) !== ext) fileName = fileName + ext;
	fileName = path.join(this.config.root, fileName);

	// if file has been loaded already, return it
	if (typeof this._files[fileName] !== 'undefined')
		return callback(null, this._files[fileName]);

	// try and catch circular dependencies which cannot be resolved
	if (typeof this._resolving[fileName] !== 'undefined') 
		return callback(new Error('Circular file resolution detected for file ' + fileName));
	this._resolving[fileName] = true;
	
	// prepare regular expression
	var re = null, macro = this.config.macro;
	if (typeof macro === 'string' && macro.length > 0) {
		var restr = '^\\s*'
			+ macro.replace(/([\.\-])/g, '\\$1')
			+ '\\s*[\'"](.+?)[\'"]';
		re = new RegExp(restr, 'm');
	};

	// read file contents
	fs.readFile(fileName, {encoding: self.config.encoding}, function(err, contents) {
		if (err) return callback(err);
		replaceMacro(contents.toString());
	});

	// get included files
	function replaceMacro(code) {
		if (!re) return done(code);
		var match = code.match(re);
		if (!match) return done(code);

		var includeFile = match[1];
		includeFile = path.relative(self.config.root, path.join(path.dirname(fileName), includeFile));

		self._parse(includeFile, function (err, includeCode) {
			if (err) return callback(err);
			includeCode = '\n\r-- ' + macro + ' ' + match[1] + ':\n'
				+ includeCode
				+ '\n\r-- End of ' + match[1];
			code = code.replace(match[0], includeCode);
			replaceMacro(code);
		});
	}

	// file has been loaded
	function done(code) {
		// calculate shasum and cache info
		var shasum = crypto.createHash('sha1');
		shasum.update(code);
		self._shasums[scriptName] = shasum.digest('hex');
		self._scripts[scriptName] = code;
		self._files[fileName] = code;

		// make dublicate entries for both script and script.lua
		if (path.extname(scriptName) === ext) {
			var alt = scriptName.substr(0, scriptName.length - ext.length);
			self._shasums[alt] = self._shasums[scriptName]
			self._scripts[alt] = self._scripts[scriptName]
		}

		delete self._resolving[fileName];
		callback(null, code);
	}
};


// get the macro'd code of a lua script
ScriptHelper.prototype.code = function (scriptName) {
	if (typeof this._scripts[scriptName] !== 'undefined')
		return this._scripts[scriptName];
	throw new Error('Script "' + scriptName + '" has not been loaded yet.');
};


// get the shasum of a lua script
ScriptHelper.prototype.shasum = function (scriptName) {
	if (typeof this._shasums[scriptName] !== 'undefined')
		return this._shasums[scriptName];
	throw new Error('Script "' + scriptName + '" has not been loaded yet.');
};


// clears the cached script code and shasums
ScriptHelper.prototype.clearCache = function () {
	// reset internal vars
	this._files = {};
	this._scripts = {};
	this._shasums = {};
	this._resolving = {};
}


// export a constructor function
exports = module.exports = function (opt) {
	return new ScriptHelper(opt);
}