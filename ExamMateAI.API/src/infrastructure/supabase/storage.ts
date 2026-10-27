import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { config } from '../../config/index.js';
import { logger } from '../logging/logger.js';

export interface StorageUploadResult {
  path: string;
  publicUrl: string;
  storageType: 'supabase' | 'local';
}

export class SupabaseStorageService {
  private client: SupabaseClient | null = null;
  private bucket: string;
  private localUploadsDir: string;
  private isConfigured: boolean = false;

  constructor() {
    this.bucket = config.supabase.bucketName;
    this.localUploadsDir = path.resolve(process.cwd(), 'uploads');

    if (
      config.supabase.url &&
      !config.supabase.url.includes('your-supabase-url') &&
      config.supabase.serviceRoleKey
    ) {
      try {
        this.client = createClient(config.supabase.url, config.supabase.serviceRoleKey, {
          auth: { persistSession: false },
        });
        this.isConfigured = true;
        logger.info(`[Supabase Storage] Initialized for bucket '${this.bucket}'`);
      } catch (err: any) {
        logger.warn({ error: err.message }, '[Supabase Storage] Failed to initialize client, using local storage.');
      }
    } else {
      logger.info('[Supabase Storage] Supabase credentials not set or using placeholder. Local filesystem fallback active.');
    }

    if (!fs.existsSync(this.localUploadsDir)) {
      fs.mkdirSync(this.localUploadsDir, { recursive: true });
    }
  }

  public async uploadFile(
    fileBuffer: Buffer,
    destinationPath: string,
    mimeType: string = 'application/pdf'
  ): Promise<StorageUploadResult> {
    if (this.isConfigured && this.client) {
      try {
        const { error } = await this.client.storage
          .from(this.bucket)
          .upload(destinationPath, fileBuffer, {
            contentType: mimeType,
            upsert: true,
          });

        if (error) {
          logger.warn({ error: error.message }, '[Supabase Storage] Upload error, falling back to local');
          throw error;
        }

        const { data: signedData } = await this.client.storage
          .from(this.bucket)
          .createSignedUrl(destinationPath, 60 * 60 * 24); // 24 hours

        return {
          path: destinationPath,
          publicUrl: signedData?.signedUrl || destinationPath,
          storageType: 'supabase',
        };
      } catch (err: any) {
        if (!config.supabase.useLocalStorageFallback) {
          throw err;
        }
      }
    }

    // Local filesystem storage fallback
    const localFilePath = path.join(this.localUploadsDir, destinationPath.replace(/[/\\?%*:|"<>]/g, '_'));
    const dir = path.dirname(localFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(localFilePath, fileBuffer);

    return {
      path: destinationPath,
      publicUrl: `/api/v1/documents/view/${encodeURIComponent(destinationPath)}`,
      storageType: 'local',
    };
  }

  public async downloadFile(filePath: string): Promise<Buffer> {
    if (this.isConfigured && this.client) {
      try {
        const { data, error } = await this.client.storage.from(this.bucket).download(filePath);
        if (error) {
          logger.warn({ error: error.message, filePath }, '[Supabase Storage] Download error');
          throw error;
        }
        if (data) {
          const arrayBuffer = await data.arrayBuffer();
          return Buffer.from(arrayBuffer);
        }
      } catch (err) {
        if (!config.supabase.useLocalStorageFallback) {
          throw err;
        }
      }
    }

    // Local fallback
    const localFilePath = path.join(this.localUploadsDir, filePath.replace(/[/\\?%*:|"<>]/g, '_'));
    if (fs.existsSync(localFilePath)) {
      return fs.readFileSync(localFilePath);
    }

    throw new Error(`Document file '${filePath}' not found in storage.`);
  }

  public async getSignedUrl(filePath: string, expiresInSeconds: number = 3600): Promise<string> {
    if (this.isConfigured && this.client) {
      try {
        const { data, error } = await this.client.storage
          .from(this.bucket)
          .createSignedUrl(filePath, expiresInSeconds);

        if (!error && data?.signedUrl) {
          return data.signedUrl;
        }
      } catch (err: any) {
        logger.warn({ error: err.message }, '[Supabase Storage] Error generating signed URL');
      }
    }

    return `/api/v1/documents/view/${encodeURIComponent(filePath)}`;
  }

  public async deleteFile(filePath: string): Promise<void> {
    if (this.isConfigured && this.client) {
      try {
        await this.client.storage.from(this.bucket).remove([filePath]);
      } catch (err: any) {
        logger.warn({ error: err.message }, '[Supabase Storage] Failed to delete file');
      }
    }

    const localFilePath = path.join(this.localUploadsDir, filePath.replace(/[/\\?%*:|"<>]/g, '_'));
    if (fs.existsSync(localFilePath)) {
      try {
        fs.unlinkSync(localFilePath);
      } catch {
        // Ignored
      }
    }
  }

  public getStatus(): { status: string; bucket: string; fallbackToLocal: boolean } {
    return {
      status: this.isConfigured ? 'Connected' : 'Fallback (Local)',
      bucket: this.bucket,
      fallbackToLocal: config.supabase.useLocalStorageFallback,
    };
  }
}

export const storageService = new SupabaseStorageService();
