import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import { Repository } from 'typeorm';
import { PaymentsOrmEntity } from '../../domain/entity/payment.orm-entity';
import { Venta } from '../../domain/entity/payments.entity';
import { PaymentsPort } from '../../domain/port/payments.port';
@Injectable()
export class PaymentsAdapter implements PaymentsPort {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @InjectRepository(PaymentsOrmEntity)
    private readonly paymentsRepository: Repository<PaymentsOrmEntity>,
  ) {}

  async createPayment(Payment: any): Promise<Venta> {
    const url = this.configService.get<string>('SANDBOX_PAYMENTS_URL');
    const KEY_PUBLIC = this.configService.get<string>('SANDBOX_PUBLIC_KEY');
    const referencia = this.generarReferencia();
    const KEY = this.configService.get<string>('CLAVE');

    Payment.reference = referencia;

    const dataParaFirmar = `${referencia}${Payment.amount_in_cents}${Payment.currency}${KEY}`;
    const encodedText = new TextEncoder().encode(dataParaFirmar);
    const hashBuffer = await crypto.subtle.digest('SHA-256', encodedText);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    Payment.signature = hashHex;
    Payment.token_card = Payment.token_card;

    console.error(' Enviando pago:', Payment);

    try {
      const response = await this.httpService.axiosRef.post(
        url,
        Payment,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${KEY_PUBLIC}`,
          },
        }
      );

      const transactionId = response.data?.data?.id;
      console.error(' Pago creado. ID transacción:', transactionId);

      const finalStatus = await this.waitForApproval(transactionId);
      const entity = this.paymentsRepository.create({
        id_transaction: transactionId,
        total: Payment.amount_in_cents,
        impuesto: Payment.amount_in_cents * this.configService.get<number>('IMPUESTO') / 100,
        });
      await this.paymentsRepository.save(entity);
      const venta = new Venta();
      venta.id_transaction = transactionId;
      venta.total = Payment.amount_in_cents;
      venta.impuesto = Payment.amount_in_cents* this.configService.get<number>('IMPUESTO')/100; 
      console.error(' Venta guardada:', venta);
      return venta;
    } catch (error) {
      console.error(' Error en createPayment:', error.response?.data || error.message);
      throw new Error('Error al consumir el endpoint de Wompi');
    }
  }

  private generarReferencia(longitud: number = 17): string {
    const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-';
    let referencia = '';
    for (let i = 0; i < longitud; i++) {
      const indice = Math.floor(Math.random() * caracteres.length);
      referencia += caracteres[indice];
    }
    return referencia;
  }

  private async getTransactionStatus(transactionId: string): Promise<any> {
    const BASE_URL = this.configService.get<string>('SANDBOX_PAYMENTS_URL');
    const url = `${BASE_URL}/${transactionId}`;
    const KEY_PUBLIC = this.configService.get<string>('SANDBOX_PUBLIC_KEY');

    try {
      const response = await this.httpService.axiosRef.get(url, {
        headers: {
          Authorization: `Bearer ${KEY_PUBLIC}`,
          'Content-Type': 'application/json',
        },
      });

      console.log(`Estado actual [${transactionId}]: ${response.data.data.status}`);
      return response.data.data;
    } catch (error) {
      console.error('Error al consultar transacción:', error.response?.data || error.message);
      throw new Error('Error al consultar el estado de la transacción');
    }
  }

  private async waitForApproval(transactionId: string): Promise<any> {
    let attempts = 0;
    const maxAttempts = 12; // 1 minuto si es cada 5s

    while (attempts < maxAttempts) {
      const transaction = await this.getTransactionStatus(transactionId);

      const status = transaction.status;
      if (status === 'APPROVED' || status === 'DECLINED') {
        console.log(`Transacción finalizada con estado: ${status}`);

        return transaction;
      }

      attempts++;
      console.log(`Intento ${attempts}: estado = ${status}, esperando 5 segundos...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    throw new Error('La transacción no fue aprobada ni rechazada después de varios intentos.');
  }
}
