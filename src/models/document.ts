import { Model, RelationMappings, JSONSchema, Modifiers } from 'objection';
import { Record as OrbitRecord } from '@orbit/data';
import { DateTime } from 'luxon';

import { BaseModel, Reference, DocumentVersion, BlockType } from '.';

export class Document extends BaseModel {
  static get tableName(): string {
    return 'documents';
  }

  static get relationMappings(): RelationMappings {
    return {
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
      createdAt: { type: 'string' },
      updatedAt: { type: 'string' },
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

  title: string;
  versions: DocumentVersion[];
  references: Reference[];

  async $patchDocumentVersion(
    data: BlockType[],
    etag: string
  ): Promise<DocumentVersion> {
    const query = this.$relatedQuery<DocumentVersion>('versions');
    const {
      versions: [lastVersion],
    } = this;
    const { updatedAt, sha } = lastVersion;

    if (sha !== etag) {
      throw new Error('Conflict');
    }

    const diffInHours = DateTime.utc().diff(
      DateTime.fromJSDate(updatedAt),
      'hours'
    );

    if (diffInHours.hours > 48) {
      return query.insert({
        data,
      });
    } else {
      await lastVersion.$query().patch({ data });
      return lastVersion;
    }
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

    return {
      id,
      type: 'documents',
      attributes,
    };
  }
}
