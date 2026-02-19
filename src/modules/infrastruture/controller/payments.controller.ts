import { Body, Controller, Post } from '@nestjs/common';
import { PaymentService } from '../../application/payments.service';
import { Venta } from '../../domain/entity/payments.entity';


@Controller('payment')
export class PaymentsController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  async createPayment(@Body() Payment: any): Promise<Venta> {
    const createdPayment = await this.paymentService.createPaymentsUser(Payment);
    console.error(' Venta guardada:', createdPayment);
    return createdPayment;
  }
}
