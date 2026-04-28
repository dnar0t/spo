/**
 * IFileStorage Interface (Application Layer)
 *
 * Порт для хранения экспортированных файлов.
 * Определяет контракт для файлового хранилища (локальная файловая система, S3 и т.д.).
 */
export interface IFileStorage {
  /** Сохранить файл, возвращает путь к файлу */
  save(filename: string, buffer: Buffer): Promise<string>;

  /** Получить файл по пути */
  get(path: string): Promise<Buffer>;

  /** Удалить файл по пути */
  delete(path: string): Promise<void>;

  /** Получить публичный URL для скачивания файла */
  getPublicUrl(path: string): string;
}
