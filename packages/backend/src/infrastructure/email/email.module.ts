/**
 * EmailModule (Infrastructure)
 *
 * Предоставляет реализацию IEmailSender (EmailSenderService).
 * Импортирует PrismaModule для доступа к SmtpConfigRepository.
 * Импортирует AuthModule для доступа к IEncryptionService.
 */
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { EmailSenderService } from './email-sender.service';
import { IEmailSender } from '../../application/notifications/ports/email-sender';
import { PrismaSmtpConfigRepository } from '../prisma/repositories/prisma-smtp-config.repository';
import { IEncryptionService } from '../../application/auth/ports/encryption.service';

@Module({
  imports: [PrismaModule, AuthModule],
  providers: [
    {
      provide: IEmailSender,
      useClass: EmailSenderService,
    },
    EmailSenderService,
  ],
  exports: [
    IEmailSender,
    EmailSenderService,
  ],
})
export class EmailModule {}
