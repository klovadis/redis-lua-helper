

var ScriptHelper = require('../lib/index.js');


// create an instance
var helper = ScriptHelper({
	root: __dirname + '/scripts'
});

// 1-4	different ways to load your scriptfiles
// 5	retrieve code and shasum
var i = 0;
function next() {
	i++;
	switch (i) {

		case 1:
			// load the entire root directory
			helper.loadDir(function (err, files) {
				if (err) throw err;
				console.log('Loaded script files in root directory:', files);
				next();
			});
			break;

		case 2:
			// load the entire root directory
			helper.loadDir('subdir', function (err, files) {
				if (err) throw err;
				console.log('Loaded script files in subdir directory:', files);
				next();
			});
			break

		case 3:
			// load a single file
			helper.load('test', function (err, code) {
				if (err) throw err;
				console.log('Code in test3.lua:', code);
				next();
			});
			break;

		case 4:
			// load multiple files
			helper.load('test2', 'test3', function (err, code) {
				if (err) throw err;
				console.log('Code in test3.lua:', code);
				next();
			});
			break;

		case 5:
			// get a scripts code and its shasum
			var code = helper.code('test');
			var shasum = helper.shasum('test');
			
			console.log('Assembled code of test.lua:');
			console.log(code);

			console.log('\n\nShasum of test.lua:', shasum);
			next();
			break;
	}
}
next();