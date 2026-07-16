'use strict';

/** Pulls a single documentId out of the various shapes a relation input can take. */
function extractRelationDocumentId(value) {
  if (!value) {
    return undefined;
  }
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value)) {
    return extractRelationDocumentId(value[0]);
  }
  if (value.documentId) {
    return value.documentId;
  }
  if (value.connect) {
    return extractRelationDocumentId(value.connect);
  }
  if (value.set) {
    return extractRelationDocumentId(value.set);
  }
  return undefined;
}

module.exports = { extractRelationDocumentId };
