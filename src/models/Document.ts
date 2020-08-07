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
import remark from 'remark';
import footnotes from 'remark-footnotes';
import { safeDump } from 'js-yaml';

import reslate, { BlockType } from '../lib/mdast-slate';
import { BaseModel, Reference, DocumentVersion, User } from '.';
import { orderBy } from '../utils';

export class Document extends BaseModel {
  static get tableName(): string {
    return 'documents';
  }

  static get modifiers(): Modifiers {
    return {
      deleted(builder) {
        const { ref } = Document;
        builder.whereNotNull(ref('deleted_at'));
      },
      kept(builder, throwIfNotFound = true) {
        const { ref } = Document;
        builder = builder.whereNull(ref('deleted_at'));

        if (throwIfNotFound) {
          return builder.throwIfNotFound();
        }
        return builder;
      },
      order(builder, order) {
        const { ref } = Document;
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
      references: [],
      nocite: [],
      'suppress-bibliography': true,
    });
    return `---\n${frontmatter}\n...\n`;
  }

  get markdownWithFrontmatter(): string {
    return `${this.frontmatter}${this.markdown}`;
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
    const { id, title, createdAt, updatedAt } = this;

    const attributes = {
      title,
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

  static async import(markdown: string, title?: string): Promise<Document> {
    const file = await remark()
      .use(footnotes, { inlineNotes: true })
      .use(reslate)
      .process(markdown);
    const data = file.data as BlockType[];

    return this.query().insertGraphAndFetch({
      title: title || 'New document',
      versions: [
        {
          data,
        },
      ],
    });
  }
}
