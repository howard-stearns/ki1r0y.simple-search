"use strict";
/*jslint node: true, nomen: true, plusplus: true, vars: true */
var assert = require('assert');
var mocha = require('mocha'), describe = mocha.describe, before = mocha.before, after = mocha.after, it = mocha.it;
var search = require('ki1r0y.simple-search');
var async = require('async');

function contains(array, x) { return array.indexOf(x) >= 0; }

describe('search', function () {
    var words = {}, locked = false;
    function storage(word, updater, cb) {
        var oldData;
        function writerFunction(error, newIdtags, idtags) {

            // Just for our testing. Not functionally required:
            if (newIdtags && !newIdtags.length && !oldData.length) {
                locked = false;
                return cb(new Error("Search should not create empty entries except through filtering"));
            }

            if (newIdtags && !error) {
                words[word] = newIdtags;
            }
            locked = false;
            cb(error, idtags);
        }
        function get() {
            if (locked) { return setImmediate(get); }
            locked = true;
            oldData = words[word] || [];
            updater(oldData, writerFunction);
        }
        setImmediate(get);
    }
    before(function (done) {
        search.configure({storage: storage}, done);
    });
    it('saves idtags', function (done) {
        search.addCitations('tag1', "foo bar baz", done);
    });
    it('repeats ok', function (done) {
        search.addCitations('tag1', "foo bar baz", done);
    });
    it('repeats ok 2', function (done) {
        search.addCitations('tag1', "foo bar baz bar", done);
    });
    it('saves more', function (done) {
        search.addCitations('tag2', "bar red white", done);
    });
    it('retrives by frequencey of occurence, not counting repeats', function (done) {
        search.findIdtags('red bar', function (error, idtags) {
            assert.equal(idtags && idtags.length, 2);
            assert.equal(idtags[0], 'tag2');
            assert.equal(idtags[1], 'tag1');
            done(error);
        });
    });
    it('is case insenstive', function (done) {
        search.findIdtags('BAR RED', function (error, idtags) {
            assert.equal(idtags && idtags.length, 2);
            assert.equal(idtags[0], 'tag2');
            assert.equal(idtags[1], 'tag1');
            done(error);
        });
    });
    it('can produce empty results', function (done) {
        search.findIdtags('not present', function (error, idtags) {
            assert.ifError(error);
            assert.ok(!idtags.length);
            done(error);
        });
    });
    it('finds idtags if at least one word was cited', function (done) {
        search.findIdtags('red blue', function (error, idtags) {
            assert.ifError(error);
            assert.deepEqual(idtags, ['tag2']);
            done(error);
        });
    });
    function exists(idtag, cb) {
        function check() { cb(idtag !== 'tag2'); } // recall that a filter (like fs.exists) does not give an error to callback.
        setImmediate(check);
    }
    it('filters', function (done) {
        search.configure({storage: storage, idtagExists: exists}, function (e) {
            assert.ifError(e);
            search.findIdtags('bar', function (error, idtags) {
                assert.deepEqual(idtags, ['tag1']);
                done(error);
            });
        });
    });
    it('handles lots', function (done) {
        var big = 10 * 1000, small = 1000;
        this.timeout(small * 50);
        async.times(big, function (n, cb) {
            search.addCitations('t' + n, "some text", cb);
        }, function (error) {
            assert.ifError(error);
            async.times(small, function (n, cb) {
                search.findIdtags('some text', function (error, results) {
                    assert.ifError(error);
                    assert.equal(results.length, big);
                    cb(error);
                });
            }, done);
        });
    });
});
