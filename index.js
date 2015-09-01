"use strict";
/*jslint node: true, nomen: true, vars: true, plusplus: true, forin: true*/
/*Copyright (c) 2013-2015 Howard Stearns. MIT License*/

var async = require('async');

var config = {};
// Specify properties: 
exports.configure = function configure(data, optionalCallback) { config = data; if (optionalCallback) { optionalCallback(); } };

// Ensure that idtag is listed in the citations for word.
// In ki1r0y, idtag is supposed to be a place or thing idtag (not a place's idvtag)
function addCitation(idtag, word, cb) {
    if (!word) { return cb(); }
    config.storage(word.toUpperCase(), function (data, writerFunction) {
        if (data.indexOf(idtag) >= 0) { return writerFunction(); }
        data.push(idtag);
        writerFunction(null, data);
    }, cb);
}

// Add citations for (each word in) whole text.
exports.addCitations = function addCitations(idtag, text, optionalCallback) {
    if (!text) { return optionalCallback && optionalCallback(); }
    var seen = {}; // don't addCitation of duplicate words
    var eachWord = function (word, cb) {
        if (!seen[word]) {
            seen[word] = true;
            addCitation(idtag, word, cb);
        } else {
            setImmediate(cb);
        }
    };
    async.eachLimit(text.split(/\W/), 50, eachWord, optionalCallback);
};

// Answer a validated list of the idtags that cite word (or an empty list if none),
// where "validated" means that the idtag is still live (not garbage collected).
// Updates citations file if needed.
function citationsOf(word, callback) {
    config.storage(word.toUpperCase(), function (citations, writerFunction) {
        // Filter the citations to include only idtags that still exist.
        // Don't create empty-array entries (except through filtering).
        if (!config.idtagExists || !citations.length) { return writerFunction(null, undefined, citations); }
        async.filter(citations, config.idtagExists, function (filteredCitations) {
            if (filteredCitations.length === citations.length) {
                writerFunction(null, undefined, citations);  // No change, but give the list to callback.
            } else {
                writerFunction(null, filteredCitations, filteredCitations);
            }
        });
    }, callback);
}

// Answers the sorted best matches (citing idtags) for text.
// Current implementation breaks text into words and collects all idtags that have a word as nametag,
// sorted by the number of times a word appears in object. e.g., search for 'tall block', and
// everything containing 'tall' or 'block' will be returned, but something containing both 'tall' and 'block'
// is ahead of something containing only one.
exports.findIdtags = function searchCitations(text, callback) {
    var answers = {}; // map of citing idtag => score
    var eachWord = function (word, cb) { // async.each cb just takes error arg, no result.
        // Add the citations of a word to answers, incrementing answers[citation] for each insertion
        citationsOf(word, function (err, citations) {
            if (err) {
                cb(err);
            } else {
                citations.forEach(function (citation) {
                    answers[citation] = (answers[citation] || 0) + 1;
                });
                cb(null);
            }
        });
    };
    var whenDone = function (finalErr) {
        // After processing eachWord above, sort the answers keys (the citating idtags) based on score, and answer the sorted idtags.
        if (finalErr) { return callback(finalErr); }
        var ids = Object.keys(answers);
        ids = ids.sort(function (idA, idB) { return answers[idB] - answers[idA]; }); // biggest first
        callback(null, ids);
    };
    async.eachLimit(text.split(/\W/), 50, eachWord, whenDone);
};
