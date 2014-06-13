var zlib = require('zlib');
var parsers = require('./lib/parsers.js');
var varint = require('varint');
var signedVarint = require('signed-varint');
var Transform = require('readable-stream').Transform;
var inherits = require('inherits');

module.exports = Parser;
inherits(Parser, Transform);

var SIZE = 0, HEADER = 1, BLOB = 2;

function Parser () {
    if (!(this instanceof Parser)) return new Parser;
    Transform.call(this);
    this._readableState.objectMode = true;
    this._readableState.highWaterMark = 0;
    this._writableState.objectMode = false;
    this._mode = SIZE;
    this._waiting = 4;
    this._prev = null;
    this._header = null;
    this._osmheader = null;
    this._osmdata = null;
    this._blob = null;
    this._offset = 0;
    this._sizeOffset = null;
}

Parser.prototype._transform = function write (buf, enc, next) {
    var self = this;
    
    if (this._prev) {
        buf = Buffer.concat([ this._prev, buf ]);
        this._prev = null;
    }
    if (buf.length < this._waiting) {
        this._prev = buf;
        return next();
    }
    
    if (this._mode === SIZE) {
        this._sizeOffset = this._offset;
        var len = buf.readUInt32BE(0);
        this._mode = HEADER;
        this._offset += this._waiting;
        this._waiting = len;
        write.call(this, buf.slice(4), enc, next);
    }
    else if (this._mode === HEADER) {
        this._header = parsers.header.decode(buf.slice(0, this._waiting));
        this._mode = BLOB;
        var nbuf = buf.slice(this._waiting);
        this._offset += this._waiting;
        this._waiting = this._header.datasize;
        write.call(this, nbuf, enc, next);
    }
    else if (this._mode === BLOB) {
        this._blob = parsers.blob.decode(buf.slice(0, this._waiting));
        
        var h = this._header;
        var o = this._offset;

        this._mode = SIZE;
        var nbuf = buf.slice(this._waiting);
        this._offset += this._waiting;
        this._waiting = 4;

        zlib.inflate(this._blob.zlib_data, function (err, data) {
            if (err) self.emit('error', err);
            
            if (h.type === 'OSMHeader') {
                self._osmheader = parsers.osmheader.decode(data);
            }
            else if (h.type === 'OSMData') {
                self._osmdata = parsers.osmdata.decode(data);
                self.stringtable = decodeStringtable(self._osmdata.stringtable);

                var offset = 0;
                var buf = self._osmdata.primitivegroup;
                var items = [];
                while(offset < buf.length) {
	            var prefix = varint.decode(buf, offset);
	            var type = prefix & 0x7;
                    if (type !== 2) {
                        /* Not a length-delimited buffer */
                        console.warn("primitivegroup buffer contains type", type);
                        offset = buf.length;
                    } else {
                        var nextOffset = offset + varint.decode.bytesRead;
	                var len = varint.decode(buf, nextOffset);
                        nextOffset += varint.decode.bytesRead + len;
                        var primitiveBuf = buf.slice(offset, nextOffset);
                        offset = nextOffset;

                        var group = parsers.primitiveGroup.decode(primitiveBuf);
                        if (group.dense_nodes) {
                            var dense = parsers.dense.decode(group.dense_nodes);
                            parseDenseNodes(dense, self._osmdata, self.stringtable, items);
                        } else if (group.way) {
                            var way = parsers.way.decode(group.way);
                            parseWay(way, self.stringtable, items);
                        } else if (group.relation) {
                            var relation = parsers.relation.decode(group.relation);
                            parseRelation(relation, self.stringtable, items);
                        } else {
                            console.warn("Unknown primitive:", group);
                        }
                    }
                }
                if (items.length > 0) {
                    self.push(items);
                }
            }

            write.call(self, nbuf, enc, next);
        });
    }
}

function decodeStringtable (buf) {
    var strings = [];
    for(var i = 0; i < buf.length; ) {
        // Skip tag
        i += 1;
        // Read length
        var len = varint.decode(buf, i);
        i += varint.decode.bytesRead;
        // Extract string
        strings.push(buf.slice(i, i + len).toString());
        i += len;
    }
    return strings;
}

function parseDenseNodes(dense, osmdata, stringtable, results) {
    var denseinfo = dense.denseinfo && parsers.denseinfo.decode(dense.denseinfo);
    var id0 = 0, xv0 = 0, yv0 = 0;
    var idOffset = 0, latOffset = 0, lonOffset = 0, kvOffset = 0;
    var timestamp = 0, changeset = 0, uid = 0, user_sid = 0;
    var versionOffset = 0, timestampOffset = 0, changesetOffset = 0;
    var uidOffset = 0, userOffset = 0, visibleOffset = 0;
    while (idOffset < dense.id.length) {
        var id = id0 + signedVarint.decode(dense.id, idOffset);
        idOffset += signedVarint.decode.bytesRead;
        id0 = id;
        
        var xv = xv0 + signedVarint.decode(dense.lat, latOffset);
        latOffset += signedVarint.decode.bytesRead;
        xv0 = xv;
        
        var yv = yv0 + signedVarint.decode(dense.lon, lonOffset);
        lonOffset += signedVarint.decode.bytesRead;
        yv0 = yv;
        
        var g = osmdata.granularity || 100;
        var lat = 0.000000001 * ((osmdata.lat_offset || 0) + (g * xv));
        var lon = 0.000000001 * ((osmdata.lon_offset || 0) + (g * yv));
        
        var key = null, tags = {};
        var sIndex;
        if (dense.keys_vals) {
            while ((sIndex = varint.decode(dense.keys_vals, kvOffset)) != 0
            && kvOffset < dense.keys_vals.length) {
                kvOffset += varint.decode.bytesRead;
                
                var s = stringtable[sIndex];
                if (key === null) {
                    key = s;
                }
                else {
                    tags[key] = s;
                    key = null;
                }
            }
            kvOffset += varint.decode.bytesRead;
        }

        var info;
        if (denseinfo) {
            info = {};
            info.version = varint.decode(denseinfo.version, versionOffset);
            versionOffset += varint.decode.bytesRead;

            timestamp += signedVarint.decode(denseinfo.timestamp, timestampOffset);
            timestampOffset += signedVarint.decode.bytesRead;
            info.timestamp = timestamp;

            changeset += signedVarint.decode(denseinfo.changeset, changesetOffset);
            changesetOffset += signedVarint.decode.bytesRead;
            info.changeset = changeset;

            uid += signedVarint.decode(denseinfo.uid, uidOffset);
            uidOffset += signedVarint.decode.bytesRead;
            info.uid = uid;

            user_sid += signedVarint.decode(denseinfo.user_sid, userOffset);
            userOffset += signedVarint.decode.bytesRead;
            info.user = stringtable[user_sid];

            if (denseinfo.visible) {
                info.visible = varint.decode(denseinfo.visible, visibleOffset) !== 0;
                visibleOffset += varint.decode.bytesRead;
            }
        }
        
        results.push({
            type: 'node',
            id: id,
            lat: lat,
            lon: lon,
            info: info,
            tags: tags
        });
    }
}

function parseWay(data, stringtable, results) {
    var info = data.info && parsers.info.decode(data.info);
    if (info && info.user_sid) {
        info.user = stringtable[info.user_sid];
        delete info.user_sid;
    }
    
    var tags = {};
    if (data.keys && data.values) {
        var kOffset = 0, vOffset = 0;
        while (kOffset < data.keys.length && vOffset < data.values.length) {
            var kIndex = varint.decode(data.keys, kOffset);
            kOffset += varint.decode.bytesRead;
            var vIndex = varint.decode(data.values, vOffset);
            vOffset += varint.decode.bytesRead;

            var key = stringtable[kIndex];
            var value = stringtable[vIndex];
            tags[key] = value;
        }
    }

    var refs = [];
    if (data.refs) {
        var rOffset, r0 = 0;
        for(rOffset = 0; rOffset < data.refs.length; ) {
            var r = r0 + signedVarint.decode(data.refs, rOffset);
            rOffset += signedVarint.decode.bytesRead;
            r0 = r;
            refs.push(r);
        }
    }

    results.push({
        type: 'way',
        id: data.id,
        info: info,
        tags: tags,
        refs: refs
    });
}

function parseRelation(data, stringtable, results) {
    var info = data.info && parsers.info.decode(data.info);
    if (info && info.user_sid) {
        info.user = stringtable[info.user_sid];
        delete info.user_sid;
    }
    
    var tags = {};
    if (data.keys && data.values) {
        var kOffset = 0, vOffset = 0;
        while (kOffset < data.keys.length && vOffset < data.values.length) {
            var kIndex = varint.decode(data.keys, kOffset);
            kOffset += varint.decode.bytesRead;
            var vIndex = varint.decode(data.values, vOffset);
            vOffset += varint.decode.bytesRead;

            var key = stringtable[kIndex];
            var value = stringtable[vIndex];
            tags[key] = value;
        }
    }

    var members = [];
    var rolesOffset = 0, memidsOffset = 0, typesOffset = 0;
    var memid0 = 0;
    while(rolesOffset < data.roles_sid.length) {
        var role = varint.decode(data.roles_sid, rolesOffset);
        rolesOffset += varint.decode.bytesRead;
        var memid = memid0 + signedVarint.decode(data.memids, memidsOffset);
        memidsOffset += signedVarint.decode.bytesRead;
        memid0 = memid;
        var type = varint.decode(data.types, typesOffset);
        typesOffset += varint.decode.bytesRead;
        var typeStr;
        switch(type) {
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
            id: memid,
            role: stringtable[role]
        });
    }

    results.push({
        type: 'relation',
        id: data.id,
        info: info,
        tags: tags,
        members: members
    });
}
