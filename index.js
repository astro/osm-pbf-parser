var bun = require('bun');
var BlobParser = require('./lib/blob_parser');
var BlobEncoder = require('./lib/blob_encoder');
var BlobDecompressor = require('./lib/decompress');
var PrimitivesParser = require('./lib/primitives');

/* Default function returns the full pipeline */
module.exports = function() {
    return bun([
        new BlobParser(),
        new BlobDecompressor(),
        new PrimitivesParser()
    ], {
        objectMode: true,
        highWaterMark: 0
    });
};

/* Individual exports */
module.exports.BlobParser = BlobParser;
module.exports.BlobEncoder = BlobEncoder;
module.exports.BlobDecompressor = BlobDecompressor;
module.exports.PrimitivesParser = PrimitivesParser;
