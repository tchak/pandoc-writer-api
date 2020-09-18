import {
  Model,
  RelationMappings,
  JSONSchema,
  Modifiers,
  ModelOptions,
  QueryContext,
} from 'objection';
import { Record as OrbitRecord } from '@orbit/data';
import { DateTime } from 'luxon';
import { safeDump } from 'js-yaml';
import path from 'path';
import fs from 'fs';

import { BlockType, parse } from '../lib/unist';
import { BaseModel, Reference, DocumentVersion, User } from '.';
import { orderBy } from '../utils';

interface JSONAPIPayload {
  attributes?: Record<string, unknown>;
}

const PROD_CSL_FOLDER = path.join(__dirname, '..', '..', '..', 'csl');
const TEST_CSL_FOLDER = path.join(__dirname, '..', '..', 'csl');
const CSL_FOLDER = fs.existsSync(PROD_CSL_FOLDER)
  ? PROD_CSL_FOLDER
  : TEST_CSL_FOLDER;

export class Document extends BaseModel {
  static get tableName(): string {
    return 'documents';
  }

  static get modifiers(): Modifiers {
    const { ref } = Document;

    return {
      deleted(builder) {
        builder.whereNotNull(ref('deleted_at'));
      },
      kept(builder, throwIfNotFound = true) {
        builder = builder.whereNull(ref('deleted_at'));

        if (throwIfNotFound) {
          return builder.throwIfNotFound();
        }
        return builder;
      },
      order(builder, order) {
        const [column, direction] = orderBy(ref, order);
        return builder.orderBy(column, direction);
      },
    };
  }

  static get relationMappings(): RelationMappings {
    return {
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'documents.user_id',
          to: 'users.id',
        },
      },
      versions: {
        relation: Model.HasManyRelation,
        modelClass: DocumentVersion,
        join: {
          from: 'documents.id',
          to: 'document_versions.document_id',
        },
      },
      references: {
        relation: Model.ManyToManyRelation,
        modelClass: Reference,
        join: {
          from: 'documents.id',
          through: {
            from: 'documents_references.document_id',
            to: 'documents_references.reference_id',
            extra: ['nocite'],
          },
          to: 'references.id',
        },
      },
    };
  }

  static jsonSchema: JSONSchema = {
    type: 'object',
    required: ['title'],

    properties: {
      id: { type: 'string' },
      title: { type: 'string', minLength: 1 },
      language: { type: 'string' },
      createdAt: { type: 'date-time' },
      updatedAt: { type: 'date-time' },
    },
  };

  static virtualAttributes: string[] = ['sha', 'data'];

  get sha(): string {
    return this.versions[0].sha;
  }

  get data(): BlockType[] {
    return this.versions[0].data;
  }

  get markdown(): string {
    return this.versions[0].markdown;
  }

  get text(): string {
    return this.versions[0].text;
  }

  get report(): string {
    return this.versions[0].report;
  }

  get frontmatter(): string {
    const frontmatter = safeDump({
      title: this.title,
      author: this.author ? [{ name: this.author }] : [],
      references: (this.references || []).map(({ id, data }) => ({
        ...data,
        id,
      })),
      nocite: [],
      lang: this.lang,
      'citation-style': this.citationStylePath,
      'reference-section-title': 'Works Cited',
      'link-citations': false,
      'suppress-bibliography': false,
    });
    return `---\n${frontmatter}\n...\n`;
  }

  get markdownWithFrontmatter(): string {
    return `${this.frontmatter}${this.markdown}`;
  }

  get citationStyle(): string {
    return (this.meta && this.meta.citation_style) || 'chicago-author-date';
  }

  get author(): string {
    return this.meta && this.meta.author;
  }

  private get citationStylePath(): string {
    return path.join(CSL_FOLDER, `${this.citationStyle}.csl`);
  }

  private get lang() {
    if (this.language === 'en') {
      return 'en-US';
    }
    return this.language;
  }

  title: string;
  language: string;
  meta: Record<string, string>;
  versions: DocumentVersion[];
  references: Reference[];
  searchText: string;

  async patchDocumentVersion(
    data: BlockType[],
    etag: string
  ): Promise<DocumentVersion> {
    const {
      versions: [lastVersion],
    } = this;
    const { createdAt, sha } = lastVersion;

    if (sha !== etag) {
      throw new Error('PreconditionFailed');
    }

    const diffInHours = DateTime.utc().diff(
      DateTime.fromJSDate(createdAt),
      'hours'
    );

    if (diffInHours.hours > 24) {
      return this.$relatedQuery<DocumentVersion>('versions').insert({
        data,
      });
    } else {
      await lastVersion.$query().patch({ data });
      return lastVersion;
    }
  }

  $beforeInsert(context: QueryContext): void {
    super.$beforeInsert(context);
    this.searchText = this.title;
  }

  $beforeUpdate(opt: ModelOptions, context: QueryContext): void {
    super.$beforeUpdate(opt, context);
    this.searchText = this.title;
  }

  $toJsonApi(fields?: string[]): OrbitRecord {
    const { id, title, language, createdAt, updatedAt } = this;

    const attributes = {
      title,
      language,
      author: this.author,
      'citation-style': this.citationStyle,
      'created-at': createdAt,
      'updated-at': updatedAt,
    };

    if (fields && fields.includes('data')) {
      attributes['data'] = this.data;
    }
    if (fields && fields.includes('meta')) {
      attributes['meta'] = this.meta;
    }

    return {
      id,
      type: 'documents',
      attributes,
    };
  }

  static $fromJsonApi(data: JSONAPIPayload): Partial<Document> {
    const attributes: Partial<Document> = {};
    const attributeNames = ['title', 'language', 'data'];
    const metaAttributeNames = ['author', 'citation-style'];
    if (data && data.attributes) {
      for (const attribute of attributeNames) {
        if (data.attributes[attribute] !== undefined) {
          attributes[attribute] = data.attributes[attribute];
        }
      }
      for (const attribute of metaAttributeNames) {
        if (data.attributes[attribute] !== undefined) {
          attributes[
            attribute === 'citation-style'
              ? 'meta:citationStyle'
              : `meta:${attribute}`
          ] = data.attributes[attribute] as string;
        }
      }
    }
    return attributes;
  }
}
