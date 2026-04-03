/**
 * Sanity Schema Index
 *
 * Exports all document schemas for the Sanity Studio.
 */
import siteSettings from './siteSettings'
import release from './release'
import gig from './gig'
import member from './member'
import friend from './friend'
import newsItem from './newsItem'
import galleryImage from './galleryImage'
import mediaFile from './mediaFile'
import creditHighlight from './creditHighlight'
import adminSettings from './adminSettings'
import terminalCommand from './terminalCommand'
import legalContentDoc from './legalContentDoc'
import hudTexts from './hudTexts'
import syncLog from './syncLog'

export const schemaTypes = [
  // Singletons
  siteSettings,
  adminSettings,
  legalContentDoc,
  hudTexts,
  syncLog,

  // Collections
  release,
  gig,
  member,
  friend,
  newsItem,
  galleryImage,
  mediaFile,
  creditHighlight,
  terminalCommand,
]
