/**
 * IEmailSender Interface (Port)
 *
 * Порт для отправки email-сообщений.
 * Реализация находится в infrastructure слое (Nodemailer).
 */
export interface IEmailSender {
  /**
   * Отправка email.
   *
   * @param params.to - email получателя
   * @param params.subject - тема письма
   * @param params.body - текст письма (plain text)
   * @param params.html - HTML-версия письма (опционально)
   */
  send(params: {
    to: string;
    subject: string;
    body: string;
    html?: string;
  }): Promise<void>;
}
