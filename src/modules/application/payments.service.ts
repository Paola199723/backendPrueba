import { Injectable } from '@nestjs/common';
import { Venta } from '../domain/entity/payments.entity';
import { PaymentsPort } from '../domain/port/payments.port';

@Injectable()
export class PaymentService {
  constructor(private readonly paymentPort: PaymentsPort) {}

  async createPaymentsUser(Payment: any): Promise<Venta> {
    return this.paymentPort.createPayment(Payment);
  }
}