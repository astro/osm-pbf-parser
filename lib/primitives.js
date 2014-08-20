var parsers = require('./parsers.js');
var Transform = require('readable-stream').Transform;
var inherits = require('inherits');

module.exports = PrimitivesParser;
inherits(PrimitivesParser, Transform);

function PrimitivesParser () {
    Transform.call(this, { objectMode: true, highWaterMark: 1 });
}

var NANO = 1e-9;

PrimitivesParser.prototype._transform = function(chunk, enc, cb) {
    if (chunk.type === 'OSMHeader') {
        this._osmheader = parsers.osm.HeaderBlock.decode(chunk.data);
    } else if (chunk.type === 'OSMData') {
        var block = parsers.osm.PrimitiveBlock.decode(chunk.data);
        var opts = {
            stringtable: decodeStringtable(block.stringtable.s),
            granularity: NANO * block.granularity,
            lat_offset: NANO * block.lat_offset,
            lon_offset: NANO * block.lon_offset,
            date_granularity: block.date_granularity,
            HistoricalInformation: this._osmheader.required_features.indexOf('HistoricalInformation') >= 0
        };
        // Output:
        var items = [];
        block.primitivegroup.forEach(function(group) {
            if (group.dense) {
                parseDenseNodes(group.dense, opts, items);
            }
            group.ways.forEach(function(way) {
                parseWay(way, opts, items);
            });
            group.relations.forEach(function(relation) {
                parseRelation(relation, opts, items);
            });
            if (group.nodes && group.nodes.length > 0) {
                console.warn(group.nodes.length + " unimplemented nodes");
            }
            if (group.changesets && group.changesets.length > 0) {
                console.warn(group.changesets.length + " unimplemented changesets");
            }
        });

        if (items.length > 0) {
            // console.log("got", items.length, "items");
            this.push(items);
        }
    }

    cb();
};

function decodeStringtable (bufs) {
    return bufs.map(function(buf) {
            if (!Buffer.isBuffer(buf))
                throw "no buffer";
            return buf.toString('utf8');
        });
}

function parseDenseNodes(dense, opts, results) {
    var id = 0, lat = 0, lon = 0;
    var timestamp = 0, changeset = 0, uid = 0, user_sid = 0;
    var offset = 0, tagsOffset = 0;
    for(; offset < dense.id.length; offset++) {
        id += dense.id[offset];
        lat += dense.lat[offset];
        lon += dense.lon[offset];
        var tags = {};
        for(; tagsOffset < dense.keys_vals.length - 1 && dense.keys_vals[tagsOffset] !== 0; tagsOffset += 2) {
            var k = opts.stringtable[dense.keys_vals[tagsOffset]];
            var v = opts.stringtable[dense.keys_vals[tagsOffset + 1]];
            tags[k] = v;
        }
        // Skip the 0
        tagsOffset += 1;

        var node = {
            type: 'node',
            id: id,
            lat: opts.lat_offset + opts.granularity * lat,
            lon: opts.lon_offset + opts.granularity * lon,
            tags: tags
        };


        var dInfo;
        if ((dInfo = dense.denseinfo)) {
            timestamp += dInfo.timestamp[offset];
            changeset += dInfo.changeset[offset];
            uid += dInfo.uid[offset];
            user_sid += dInfo.user_sid[offset];
            node.info = {
                version: dInfo.version[offset],
                timestamp: opts.date_granularity * timestamp,
                changeset: changeset,
                uid: uid,
                user: opts.stringtable[user_sid]
            };
            if (opts.HistoricalInformation && dInfo.hasOwnProperty('visible')) {
                node.info.visible = dInfo.visible[offset];
            }
        }

        results.push(node);
    }
}

function parseWay(data, opts, results) {
    var tags = {};
    for(var i = 0; i < data.keys.length && i < data.vals.length; i++) {
        var k = opts.stringtable[data.keys[i]];
        var v = opts.stringtable[data.vals[i]];
        tags[k] = v;
    }

    var ref = 0;
    var refs = data.refs.map(function(ref1) {
        ref += ref1;
        return ref;
    });

    var way = {
        type: 'way',
        id: data.id,
        tags: tags,
        refs: refs
    };

    if (data.info) {
        way.info = parseInfo(data.info, opts);
    }

    results.push(way);
}

function parseRelation(data, opts, results) {
    var i;
    var tags = {};
    for(i = 0; i < data.keys.length && i < data.vals.length; i++) {
        var k = opts.stringtable[data.keys[i]];
        var v = opts.stringtable[data.vals[i]];
        tags[k] = v;
    }

    var id = 0;
    var members = [];
    for(i = 0; i < data.roles_sid.length && i < data.memids.length && i < data.types.length; i++) {
        id += data.memids[i];
        var typeStr;
        switch(data.types[i]) {
        case 0:
            typeStr = 'node';
            break;
        case 1:
            typeStr = 'way';
            break;
        case 2:
            typeStr = 'relation';
            break;
        default:
            typeStr = '?';
        }

        members.push({
            type: typeStr,
            id: id,
            role: opts.stringtable[data.roles_sid[i]]
        });
    }

    var relation = {
        type: 'relation',
        id: data.id,
        tags: tags,
        members: members
    };
    if (data.info) {
        relation.info = parseInfo(data.info, opts);
    }

    results.push(relation);
}

function parseInfo(dInfo, opts) {
    var info = {
        version: dInfo.version,
        timestamp: opts.date_granularity * dInfo.timestamp,
        changeset: dInfo.changeset,
        uid: dInfo.uid,
        user: opts.stringtable[dInfo.user_sid]
    };
    if (opts.HistoricalInformation && dInfo.hasOwnProperty('visible')) {
        info.visible = dInfo.visible;
    }
    return info;
}
