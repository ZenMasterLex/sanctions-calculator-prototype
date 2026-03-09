/**
 * Thrown when a required factor (weight, classification, or sub-article boundary)
 * is missing or unparseable from the source data.
 */
export class MissingFactorException extends Error {
  constructor(message) {
    super(message);
    this.name = 'MissingFactorException';
  }
}

/**
 * Thrown when no matching CrimeArticle or SubArticle can be found for
 * the user's selected inputs.
 */
export class ArticleNotFoundException extends Error {
  constructor(message) {
    super(message);
    this.name = 'ArticleNotFoundException';
  }
}
