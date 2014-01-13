/**
 * node express app
 */
var express = require('express'),
    partials = require('express-partials'),
    http = require('http'),
    path = require('path'),
    url = require('url'),
    util = require('util'),
    formidable = require('formidable'),
    exec = require('child_process').exec;

var app = express(),
    uploadsFilePathMap = {};

app.configure(function(){
    app.set('port', process.env.PORT || 3000);
    //app.set('views', __dirname + '/views');
    //app.set('view engine', 'ejs');
    app.use(express.favicon());
    app.use(express.logger('dev'));
    app.use(app.router);
    // app.router MUST come before express.bodyParser for file uploads to work!
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(express.cookieParser('secretsession'));
    app.use(express.session());
    app.use(express.static(path.join(__dirname, 'public')));
    app.set('toolsDir', path.join(__dirname, 'tools'));
    //app.use(partials());
});

app.configure('development', function(){
    app.use(express.errorHandler());
});

/**
 * Above this line are Express Defaults.
 */

/**
 * File upload handler
 */
app.post('/upload', function(req, res) {
    console.log('got upload data');
    // parse a file upload
    var form = new formidable.IncomingForm(),
        files = [];
    form.uploadDir = process.cwd() + '/uploads';
    form.keepExtensions = true;

    form.on('file', function(name, file) {
        files.push(file);
    })
    .on('end', function() {
        // Save name->path for analyzing by name
        uploadsFilePathMap[files[0].name] = files[0].path;

        res.writeHead(200, {'content-type': 'application/json'});
        res.end(JSON.stringify({result: true, 
            filename: files[0].name,
            size: files[0].size
        }));
    });
    form.parse(req);
});

app.get('/analyze/:filename', function (req, res) {
    var path = uploadsFilePathMap[req.params.filename];
    if (!path) {
        res.writeHead(404, {'content-type': 'text/html'});
        res.end('file not found');
        return;
    }
    var cmd = 'python ' + app.get('toolsDir') + '/audiovolume.py ' + path;
    console.log(cmd);
    exec(cmd, function (error, stdout, stderr) {
        var info = error ? -1 : stdout;
        res.writeHead(200, {'content-type': 'application/json'});
        res.end(JSON.stringify({result: error !== undefined, volumes: info}));
    });
});

/**
 * Sprite creator
 */
app.post('/generate', function (req, res) {
    // Get list of audio files with volumes from request
    // Generate arguments to python script and execute
    // Send results back to client for download
});

http.createServer(app).listen(app.get('port'), function(){
    console.log("Express server listening on port " + app.get('port'));
});
