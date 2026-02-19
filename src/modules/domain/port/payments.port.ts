
import { Venta } from "../entity/payments.entity";


export abstract class PaymentsPort {
    abstract createPayment(Payment: any): Promise<Venta>;
  }