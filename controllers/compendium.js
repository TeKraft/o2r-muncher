// General modules
var c = require('../config/config');
var debug = require('debug')('compendium');
var exec = require('child_process').exec;
var randomstring = require('randomstring');
var fs = require('fs');

var dirTree = require('directory-tree');


exports.create = (req, res) => {
  var id = req.file.filename;
  if(req.body.content_type !== 'compendium_v1') {
    res.status(500).send('not yet implemented');
    debug('uploaded content_type not yet implemented:' + req.body.content_type);
  } else {
    var cmd = '';
    switch(req.file.mimetype) {
      case 'application/zip':
      case 'adsf':
        cmd = 'unzip -uq ' + req.file.path + ' -d '+ c.fs.compendium + id;
        if(c.fs.delete_inc) { // should incoming files be deleted after extraction?
         cmd += ' && rm ' + req.file.path;
        }
        break;
      default:
        cmd = 'false';
    }
    exec(cmd, (error, stdout, stderr) => {
      if (error || stderr) {
        debug(error, stderr, stdout);
        res.status(500).send(JSON.stringify({error: 'extracting failed'}));
      } else {
        res.status(200).send(JSON.stringify(id));
      }
    });
  }
};

exports.viewSingle = (req, res) => {
  var id = req.params.id;
  var answer = {};
  // Dirty mockup - no database integration yet, so search on disk!
  try {
    if(id.length !== c.id_length) {
      throw 'id length wrong';
    }
    fs.accessSync(c.fs.compendium + id); //throws if does not exist
    var tree = dirTree(c.fs.compendium + id);
    /* TODO:
     *
     * directory-tree has no support for a alternative basename. this is needed
     * so that we can substitute the on-disk basepath (which is returned by
     * default) with a api-relative basepath, e.g. /api/v1/compendium/:id/files
     *
     * Options:
     * - add functionality to directory-tree, make pull request
     * - wrapper around directory-tree
     * - fork directory-tree
     *
     * We also need additional features, like MIME type recognition, etc.
     */
    answer.id = id;
    answer.metadata = {};
    answer.files = tree;

    res.status(200).send(JSON.stringify(answer));
  }
  catch (e) {
    res.status(404).send(JSON.stringify({ error: 'no compendium with this id' }));
  }
};

exports.viewSingleJobs = (req, res) => {
  var id = req.params.id;
  //TODO: this will be implemented when database is integrated - doesn't make
  //any sense before that.
  res.status(500).send('not yet implemented');
};

exports.view = (req, res) => {
  var answer = {};
  var limit = parseInt(req.query.limit || c.list_limit);
  var start = parseInt(req.query.start || 1);
  try {
    fs.readdir(c.fs.compendium, (err, files) => {
      var firstElem = start - 1; //subtract 1 because 0-indexed array
      var lastElem = firstElem + limit;
      // check length of file listing - if elements are left, generate next link
      if(files.length < lastElem) {
        lastElem = files.length;
      } else {
        answer.next = req.route.path + '?limit=' + limit +
          '&start=' + (start + 1);
      }

      if(start > 1) {
        answer.previous = req.route.path + '?limit=' + limit +
          '&start=' + (start - 1);
      }

      filesSlice = files.slice(firstElem, lastElem);
      answer.results = filesSlice;
      res.status(200).send(JSON.stringify(answer));
    });
  }
  catch (e) {
    res.status(404).send(JSON.stringify({ error: 'no compendium found' }));
  }
};
