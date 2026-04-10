import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
  type PutObjectCommandInput,
} from '@aws-sdk/client-s3';

/**
 * IMPORTANT:
 * Ce module est destine a un usage serveur (scripts Node, backend, Edge relay).
 * N'utilisez jamais les cles S3 secretes directement dans un bundle frontend.
 */

const S3_ENDPOINT = process.env.SUPABASE_S3_ENDPOINT || 'https://wdumsyqptgufjstcvpgi.storage.supabase.co/storage/v1/s3';
const S3_REGION = process.env.SUPABASE_S3_REGION || 'eu-west-1';
const S3_ACCESS_KEY = process.env.SUPABASE_S3_ACCESS_KEY;
const S3_SECRET_KEY = process.env.SUPABASE_S3_SECRET_KEY;

function assertS3Env() {
  if (!S3_ACCESS_KEY || !S3_SECRET_KEY) {
    throw new Error(
      'Missing SUPABASE_S3_ACCESS_KEY or SUPABASE_S3_SECRET_KEY. Configure these secrets server-side only.'
    );
  }
}

export function createSupabaseS3Client(): S3Client {
  assertS3Env();
  return new S3Client({
    region: S3_REGION,
    endpoint: S3_ENDPOINT,
    forcePathStyle: true,
    credentials: {
      accessKeyId: S3_ACCESS_KEY!,
      secretAccessKey: S3_SECRET_KEY!,
    },
  });
}

export async function putObjectToSupabaseS3(
  bucket: string,
  key: string,
  body: PutObjectCommandInput['Body'],
  contentType?: string
) {
  const client = createSupabaseS3Client();
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
  return { bucket, key };
}

export async function deleteObjectFromSupabaseS3(bucket: string, key: string) {
  const client = createSupabaseS3Client();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  return { bucket, key };
}

export async function listObjectsFromSupabaseS3(bucket: string, prefix?: string) {
  const client = createSupabaseS3Client();
  const res = await client.send(
    new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      MaxKeys: 100,
    })
  );
  return res.Contents || [];
}

export async function getObjectFromSupabaseS3(bucket: string, key: string) {
  const client = createSupabaseS3Client();
  const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  return res;
}
