# ki1r0y.simple-search

A simple text search with pluggable persistence.

```javascript
addCitations(idtag, text, optionalCallback)
```
Notes that _idtag_ is assocated with _text_. Both are strings. 
Invokes optionalCallback(error) when done (if supplied).

```javascript
searchCitations(text, callback)
```
Invokes ```callback(error, arrayOfIdtags)```, where the array is an best-first ordered list of idtags that had previously been associated with the words of _text_.

```javascript
configure({storage, idtagExists}, cb)
```
If ```idTagExists``` is supplied, ```searchCitations``` invokes it as ```idtagExists(idtag, cb)``` to asynchronously verify that _idtag_ is still valid. Any for which ```cb(false)``` are removed from storage.

The test suite has an example of an in-memory storage function. Here is an example storage function that uses ki1r0y.fs-store:
```javascript
function citationStorage(word, updater, cb) {
    var wordId = path.join(someRoot, someHash(word));
    fs-store.update(wordId, [], updater, cb);  // fs-store.update does all work of steps 3 and 5, below.
}
```
There are a series of callbacks back and forth between the original caller and the search functions, as follows:
1. The application calls addCitations() or searchCitations().
2. Search calls storage(word, updater, cb) to ask the caller to retrieve information about word (which is a string).
3. The storage function should call updater(arrayOfIdtagsAssociatedWithWord, writerFunction). The array must be empty if word is unknown.
4. Search calls writerFunction(error, newArrayOrUndefined, newArray) to store results.
5. If newArrayOrUndefined is not undefined, writerFunction should store the array of idtags as being associated with word.
   In any case, the writerFunction should then call cb(error, newArray).
6. addCitations() or searchCitations() then invoke their callback(error) or callback(error, arrayOfIdtags), respectively

The functions storage and idTagExists must be asynchronous (e.g., using setImmediate or nextTick if needed). writerFunction may be called synchronously or asynchronously.

##TODO: 
* Paged results in searchCitations.
* Stop words.
* Break text string into labeled facets.

